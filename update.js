const fs = require('fs');
const path = require('path');
const {isOutput} = require('./config');
const {deserialize} = require('./utils/utils');

const pluginsPaths = process.argv.slice(2).filter(arg => arg.endsWith('.js') && fs.existsSync(arg));
const plugins = pluginsPaths.map(p => require(path.resolve(p)));
const file = process.argv.slice(2).find(isOutput);

const input = deserialize(path.extname(file), fs.readFileSync(file));

async function main() {
    for (const plugin of plugins) {
        if (plugin.afterParse) await plugin.afterParse(input);
    }
    
    fs.writeFileSync(file, JSON.stringify(input, null, 2));
}

main();