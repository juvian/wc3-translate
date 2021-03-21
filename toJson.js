const Map = require('./utils/map');
const path = require('path');
const Maps = require('./utils/maps');
const {serialize} = require('./utils/utils');
const fs = require('fs');
const {parseArgs} = require('./utils/argParser');

async function main() {
    const maps = new Maps();
    const args = await parseArgs(process.argv.slice(2));
    const outputLocation = args.find(a => a.type == 'output').arg;
    const mapLocations = args.filter(a => a.type == 'folder' || a.type == 'mpq');
    const plugins = args.filter(a => a.type == 'plugin');

    for (const arg of mapLocations) {
        const map = new Map(arg);

        await map.parseFiles();
        map.afterParseFiles();

        maps.add(map);
    }

    const output = maps.process();

    for (const plugin of plugins) {
        if (plugin.module.afterParse) await plugin.module.afterParse(output);
    }

    fs.writeFileSync(outputLocation, serialize(path.extname(outputLocation), output));
}


main();