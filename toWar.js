const {filesToProcess} = require('./config');
const fs = require('fs');
const path = require('path');
const {deserialize, interfaceIterator} = require('./utils/utils');
const Map = require('./utils/map');
const {parseArgs} = require('./utils/argParser');
const {iterateBufferStrings, fixString} = require('./utils/tokenizer');
const fixEventDamaged = require('./scripts/replacePgProtected');

function saveInWts(map, val, id) {
    console.warn(id + ' too long, saving in wts ');
    let key = Object.keys(map.strings).length + 1;
    while (map.strings.hasOwnProperty(key)) key++;
    map.strings[key] = val.replace(/\}/g, '|');
    return 'TRIGSTR_' + key;
}

function getVal(translation, map, id) {
    const val = translation.newTranslated || translation.oldTranslated;
    if (val && val.length > 500 && Buffer.byteLength(val, 'utf8') >= 1023) return saveInWts(map, val, id);
    return val;
}

function exportToWar(map, input, outputLocation) {
    for (const [name, file] of Object.entries(filesToProcess)) {
        if (Object.keys(map[file.name]) == 0) continue;

        if (file.props) {
            const reversedProps = Object.fromEntries(Object.entries(file.props).map(arr => [arr[1], arr[0]]));
            for (const [id, props] of Object.entries(input[file.name])) {
                const obj = [map[file.name].custom, map[file.name].original].find(o => o != null && o.hasOwnProperty(id));
                if (obj == null) continue;

                const translations = {};
                const currentIdx = {};

                for (const [prop, levels] of Object.entries(props)) {
                    const reversedProp = reversedProps[prop];

                    translations[reversedProp] = [];
                    currentIdx[reversedProp] = 0;

                    for (const info of levels) {
                        translations[reversedProp].push(getVal(info, map, id + ':' + reversedProp));
                    }
                }

                for (const modification of obj[id]) {
                    if (currentIdx.hasOwnProperty(modification.id)) {
                        modification.value = translations[modification.id][currentIdx[modification.id]++] || modification.value;
                    }
                }
            }
        } else if (name == "war3map.j") {            
            let newScript = [];
            let lastIdx = 0;

            map.script = fixEventDamaged(map.script);

            for (const {str, beganAt, idx} of iterateBufferStrings(map.script)) {
                const val = map.getString(str).toString().replace(/\r\n/g, '\n');
                let replacement = input.script[val]?.newTranslated || input.script[val]?.oldTranslated;

                if (replacement != null) {
                    newScript.push(map.script.slice(lastIdx, beganAt));
                    replacement = fixReplacement(replacement);
                    newScript.push(Buffer.from(replacement));
                    lastIdx = idx + 1;
                }
            }

            newScript.push(map.script.slice(lastIdx));

            map.script = {buffer: Buffer.concat(newScript)};
            
            map.validateScript(map.script.buffer);
        } else if (name == "war3map.wts") {
            for (const key of Object.keys(map.strings)) {
                map.strings[key] = input.strings[key]?.newTranslated || input.strings[key]?.oldTranslated || map.strings[key];
            }
        } else if (name == "war3map.w3i") {   
            for (const prop of ["name", "author", "description", "recommendedPlayers"]) {
                map.info.map[prop] = getVal(input.info[prop], map, prop) || map.info.map[prop];
            }

            for (const [idx, player] of Object.entries(map.info.players)) {
                player.name = getVal(input.info.players[idx].name, map, "player" + idx) || player.name;
            }

            for (const [idx, force] of Object.entries(map.info.forces)) {
                force.name = getVal(input.info.forces[idx].name, map, "force" + idx) || force.name;
            }

            for (const parent of ["loadingScreen", "prologue"]) {
                for (const id of Object.keys(input.info[parent])) {
                    map.info[parent][id] = getVal(input.info[parent][id], map, parent + ":" + id) || map.info[parent][id]; 
                }
            }
        } else if (name == "war3mapSkin.txt" || name == "units\\CommandStrings.txt") {
            for (const {id, parentId, data} of interfaceIterator(input[file.name])) {
                const val = data?.newTranslated || data?.oldTranslated;
                map[file.name][parentId][id] = val || map[file.name][parentId][id] ;
            }
        }
        map.writeWar(name, file, outputLocation);
    }
}

const fixReplacement = function(replacement) {
    replacement = fixString(replacement).split('\n').join('\\n');
    //strings with 1023 byte length crash wc3 in 1.28, concatenation works up to 4029...
    if (replacement.length > 500 && Buffer.byteLength(replacement, 'utf8') >= 1023) {
        console.warn('replacement too long, will attempt to fix');

        let splitted = "";
        let i = 0;
        
        while(i < replacement.length) {
            let until = i + 500;
            while (replacement[until - 1] == '\\') until--;
            splitted += '"' + replacement.substring(i, until) + '" + ';
            i = until;
        }

        replacement = splitted.substring(0, splitted.length - 2);
    } else {
        replacement = '"' + replacement + '"';
    }

    return replacement;
}

async function main() {
    const args = await parseArgs(process.argv.slice(2));
    const inputLocation = args.find(a => a.type == 'output').arg;
    const outputLocation = args.find(a => a.type == 'folder')?.arg;

    const input = deserialize(path.extname(inputLocation), fs.readFileSync(inputLocation));
    const map = new Map(input.metadata.maps[0].location);

    await map.mount();
    map.parseFiles();
    
    exportToWar(map, input, outputLocation);
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}

module.exports = {exportToWar};
