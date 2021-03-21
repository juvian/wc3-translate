const path = require('path');

const isMPQ = (arg) => arg.endsWith('.w3x') || arg.endsWith('.w3m') || arg.endsWith('.mpq');
const isPlugin = (arg) => arg.endsWith('.js');
const isOutput = (arg) => (arg.endsWith('.json') || arg.endsWith('.yaml'))

const parseArgs = async (args) => {
    const result = [];
    let current = result;

    for (const arg of args) {
        if (isOutput(arg)) current.push({arg, type: 'output'});
        else if (isPlugin(arg)) {
            current = [];
            const module = require(path.resolve(arg))
            if (module.init) await module.init(plugin);
            result.push({arg, type: 'plugin', args: current, module});
        } else if (isMPQ(arg)) current.push({arg, type: 'mpq'});
        else current.push({arg, type: 'folder'});
    }

    return result;
}

module.exports = {parseArgs, isMPQ, isPlugin, isOutput};