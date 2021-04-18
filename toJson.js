const Map = require('./utils/map');
const path = require('path');
const Maps = require('./utils/maps');
const {serialize, mapIterator} = require('./utils/utils');
const fs = require('fs');
const {parseArgs} = require('./utils/argParser');

async function main() {
    const maps = new Maps();
    const args = await parseArgs(process.argv.slice(2));
    const outputLocation = args.find(a => a.type == 'output').arg;
    const mapLocations = args.filter(a => a.type == 'folder' || a.type == 'mpq').map(a => a.arg);
    const plugins = args.filter(a => a.type == 'plugin');

    for (const loc of mapLocations) {
        const map = new Map(loc);

        await map.mount();

        if (map.hasFile('Units/AbilityData.slk') || map.hasFile('Units/ItemData.slk')) {
            console.warn("Map looks to be in slk format, strings could be missing. Try converting to obj format with https://www.hiveworkshop.com/threads/w3x2lni-v2-7-2.305201/")
        }

        map.parseFiles();
        map.afterParseFiles();
        map.unmount();

        maps.add(map);
    }

    const output = maps.process();

    for (const plugin of plugins) {
        if (plugin.module.afterParse) await plugin.module.afterParse(output);
    }

    for (const {data} of mapIterator(output)) {
        data.newTranslated = data.newTranslated || "";
    }

    fs.writeFileSync(outputLocation, serialize(path.extname(outputLocation), output));
}


main();