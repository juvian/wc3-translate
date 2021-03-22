const fs = require('fs');
const path = require('path');
const {deserialize, serialize} = require('./utils/utils');
const {parseArgs} = require('./utils/argParser');

async function main() {
    const args = await parseArgs(process.argv.slice(2));
    const plugins = args.filter(a => a.type == 'plugin');
    const inputLocation = args.find(a => a.type == 'output').arg;

    const input = deserialize(path.extname(inputLocation), fs.readFileSync(inputLocation));

    for (const plugin of plugins) {
        if (plugin.module.afterParse) await plugin.module.afterParse(input);
    }
    fs.writeFileSync(inputLocation, serialize(path.extname(inputLocation), input));
}

main();