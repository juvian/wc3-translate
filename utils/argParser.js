const path = require('path');
const fs = require('fs');

const isMPQ = (arg) => arg.endsWith('.w3x') || arg.endsWith('.w3m') || arg.endsWith('.w3n') || arg.endsWith('.mpq');
const isPlugin = (arg) => arg.endsWith('.js');
const isOutput = (arg) => (arg.endsWith('.json') || arg.endsWith('.yaml'))

const resolvePluginPath = (arg) => {
    for (const p of [arg, path.join(__dirname + '/../plugins/' + arg)].map(p => path.resolve(p))) {
        if (fs.existsSync(p)) return p;
    }
    throw arg + " not found";
}

const parseArgs = async (args) => {
    const result = [];
    let current = result;

    for (const arg of args) {
        if (isOutput(arg)) current.push({arg, type: 'output'});
        else if (isPlugin(arg)) {
            current = [];
            result.push({arg, type: 'plugin', args: current, module: require(resolvePluginPath(arg))});
        } else if (isMPQ(arg)) current.push({arg, type: 'mpq'});
        else current.push({arg, type: 'folder'});
    }

    for (const plugin of result.filter(a => a.type == 'plugin')) {
        if (plugin.module.init) await plugin.module.init(plugin);
    }

    return result;
}

module.exports = {parseArgs, isMPQ, isPlugin, isOutput, resolvePluginPath};