const {filesToProcess, quotesRegex, isMap} = require('./config');
const fs = require('fs');
const Map = require('./utils/Map');
const path = require('path');

async function main() {
    const file = process.argv.slice(2).find(arg => arg.endsWith('.json') && fs.existsSync(arg));
    const mapLocation = process.argv.slice(2).find(isMap);

    const input = JSON.parse(fs.readFileSync(file));

    const map = new Map(mapLocation);

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
                        modification.value = translations[modification.id][currentIdx[modification.id]++];
                    }
                }
            }
        } else if (name == "war3map.j") {
            map.script = map.script.replace(quotesRegex, (match) => {
                const val = map.getString(match.substring(1, match.length - 1));
                return '"' + (input.script.matched[val] || input.script.unmatched[val] || val) + '"';
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

        map.writeWar(name, file);
    }
}

main();