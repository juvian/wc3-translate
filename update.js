const fs = require('fs');
const path = require('path');

const pluginsPaths = process.argv.slice(2).filter(arg => arg.endsWith('.js') && fs.existsSync(arg));
const plugins = pluginsPaths.map(p => require(path.resolve(p)));
const file = process.argv.slice(2).find(arg => arg.endsWith('.json') && fs.existsSync(arg));

const input = JSON.parse(fs.readFileSync(file));

for (const plugin of plugins) {
    if (plugin.afterParse) plugin.afterParse(input);
}

fs.writeFileSync(file, JSON.stringify(input, null, 2));