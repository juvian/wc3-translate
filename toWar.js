const {filesToProcess} = require('./config');
const fs = require('fs');
const path = require('path');
const {deserialize, interfaceIterator} = require('./utils/utils');
const Map = require('./utils/map');
const {parseArgs} = require('./utils/argParser');
const {iterateBufferStrings} = require('./utils/tokenizer');

async function main() {
    const args = await parseArgs(process.argv.slice(2));
    const inputLocation = args.find(a => a.type == 'output').arg;
    const outputLocation = args.find(a => a.type == 'folder')?.arg;

    const input = deserialize(path.extname(inputLocation), fs.readFileSync(inputLocation));
    const map = new Map(input.metadata.maps[0].location);

    await map.mount();
    map.parseFiles();
    
    for (const [name, file] of Object.entries(filesToProcess)) {
        if (file.props) {
            const reversedProps = Object.fromEntries(Object.entries(file.props).map(arr => [arr[1], arr[0]]));

            for (const [id, props] of Object.entries(input[file.name])) {
                if (map[file.name].custom.hasOwnProperty(id) == false) continue;

                const translations = {};
                const currentIdx = {};

                for (const [prop, levels] of Object.entries(props)) {
                    const reversedProp = reversedProps[prop];

                    translations[reversedProp] = [];
                    currentIdx[reversedProp] = 0;

                    for (const info of levels) {
                        translations[reversedProp].push(info.newTranslated || info.oldTranslated);
                    }
                }

                for (const modification of map[file.name].custom[id]) {
                    if (currentIdx.hasOwnProperty(modification.id)) {
                        const val = translations[modification.id][currentIdx[modification.id]++];
                        
                        if (val != null) {
                            modification.value = val;
                        }
                    }
                }
            }
        } else if (name == "war3map.j") {            
            let newScript = [];
            let lastIdx = 0;
            
            for (const {str, beganAt, idx} of iterateBufferStrings(map.script)) {
                const val = map.getString(str).toString();
                const replacement = input.script[val]?.newTranslated || input.script[val]?.oldTranslated;
                
                if (replacement != null) {
                    newScript.push(map.script.slice(lastIdx, beganAt));
                    newScript.push(Buffer.from('"' + replacement.replace(/"/g, '\\"').split('\n').join('\\n') + '"'));
                    lastIdx = idx + 1;
                }
            }

            newScript.push(map.script.slice(lastIdx));

            map.script = {buffer: Buffer.concat(newScript)};
        } else if (name == "war3map.wts") {
            for (const key of Object.keys(map.strings)) {
                map.strings[key] = input.strings[key]?.newTranslated || input.strings[key]?.oldTranslated || map.strings[key];
            }
        } else if (name == "war3map.w3i") {
            for (const prop of ["name", "author", "description", "recommendedPlayers"]) {
                map.info.map[prop] = input.info[prop].newTranslated || input.info[prop].oldTranslated || map.info.map[prop];
            }

            for (const [idx, player] of Object.entries(map.info.players)) {
                player.name = input.info.players[idx].name.newTranslated || input.info.players[idx].name.oldTranslated || player.name;
            }

            for (const [idx, force] of Object.entries(map.info.forces)) {
                force.name = input.info.forces[idx].name.newTranslated || input.info.forces[idx].name.oldTranslated || force.name;
            }
        } else if (name == "war3mapSkin.txt") {
            for (const {id, parentId, data} of interfaceIterator(input[file.name])) {
                const val = data?.newTranslated || data?.oldTranslated;
                map[file.name][parentId][id] = val || map[file.name][parentId][id] ;
            }
        }

        map.writeWar(name, file, outputLocation);
    }
}

main();