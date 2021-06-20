const Map = require('../utils/map');

const afterParse = async (output) => {
    const map = new Map(output.metadata.maps[0].location);
    await map.mount();

    const code = map.readFile(map.getScript()).toString();

    map.unmount();

    const toIgnore = new Set();

    for (const match of code.matchAll(/udg_PlayerName\[.*\] ==.*|set udg_Plyer_C\[.*|set udg_Player_S_Name\[.*|set udg_Player_Title\[.*\] ==.*/g)) {
        if (match[0].split('"').length > 1) {
            toIgnore.add(match[0].split('"')[1]);
        }
    }

    for (const s of toIgnore) {
        delete output.script[s];
    }
}

module.exports = {afterParse};