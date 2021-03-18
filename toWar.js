const {filesToProcess, quotesRegex, isOutput} = require('./config');
const fs = require('fs');
const path = require('path');
const {deserialize} = require('./utils/utils');
const Map = require('./utils/map');

async function main() {
    const file = process.argv.slice(2).find(isOutput);
    const outputLocation = process.argv.slice(2).find(arg => arg != file && fs.existsSync(arg) && fs.lstatSync(arg).isDirectory());
    
    const input = deserialize(path.extname(file), fs.readFileSync(file));

    const map = new Map(input.metadata.maps[0].folder);

    await map.parseFiles();

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
            
                        if (val == null) {
                            console.warn("translation not found for ", id, modification, " using untranslated");
                        } else {
                            modification.value = val;
                        }
                    }
                }
            }
        } else if (name == "war3map.j") {
            map.script = map.script.replace(quotesRegex, (match) => {
                const val = map.getString(match.substring(1, match.length - 1));
                return '"' + (input.script[val]?.newTranslated || input.script[val]?.oldTranslated || val).replace(/"/g, '\\"') + '"';
            });
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
        }

        map.writeWar(name, file, outputLocation);
    }
}

main();