const {isMap, isPlugin} = require('./config');
const Map = require('./utils/map');
const path = require('path');
const Maps = require('./utils/maps');
const {serialize} = require('./utils/utils');
const fs = require('fs');

async function main() {
    const maps = new Maps();
    const outputLocation = process.argv.slice(2).find(arg => arg.endsWith('.json')) || process.argv.slice(2).find(arg => arg.endsWith('.yaml'));
    const mapLocations = process.argv.slice(2).filter(isMap);
    const pluginsPaths = process.argv.slice(2).filter(isPlugin);

    const plugins = pluginsPaths.map(p => require(path.resolve(p)));
    const unused = process.argv.slice(2).filter(arg => !outputLocation.includes(arg) && !mapLocations.includes(arg) && !pluginsPaths.includes(arg));

    if (unused.length) console.warn('unrecognized params', unused);

    for (const loc of mapLocations) {
        const map = new Map(loc);

        await map.parseFiles();
        map.afterParseFiles();

        maps.add(map);
    }

    const output = maps.process();
    for (const plugin of plugins) {
        if (plugin.afterParse) await plugin.afterParse(output);
    }

    fs.writeFileSync(outputLocation, serialize(path.extname(outputLocation), output));
}


main();