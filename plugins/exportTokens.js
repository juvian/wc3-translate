const { tokenize, isColorCode, isNumber } = require("../utils/tokenizer");
const { mapIterator } = require("../utils/utils");
const {resolvePluginPath} = require('../utils/argParser');
const fs = require('fs');
const path = require('path');

let outputLocation;
let extraPlugins;

const init = (plugin) => {
    if (plugin.args.length < 1) throw Error('exportTokens plugin requires a path to output');
    outputLocation = plugin.args[0].arg;
    extraPlugins = plugin.args.slice(1);
    extraPlugins.forEach(a => a.module = require(resolvePluginPath(a.arg + '.js')));
}

const processTokens = (tokens) => {
    let numbers = 0;
    return tokens.map(t => {
        if (t.hasOwnProperty('string')) {
            if (t.string.includes('\n') || t.string.includes('\r')) numbers = 0;
            return t.string;
        }
        if (isColorCode(t.token) || t.token.toLowerCase() == '|r') return '|||';
        if (isNumber(t.token)) return (10 + numbers++).toString();
        return t.token; 
    }).join('').split(/[\r\n]/).map(a => a.replace(/\|\|\|/g, '\\n'));
} 

const afterParse = (output) => {
    const strings = new Set();

    for (const {data} of mapIterator(output)) {
        const shouldTranslate = extraPlugins.every(p => !p.module.shouldTranslateData || p.module.shouldTranslateData(data));
        if (shouldTranslate) {
            if (data.hasOwnProperty('importFails') == false) {
                const tokens = tokenize(data.newUntranslated);
                const strs = processTokens(tokens).filter(s => extraPlugins.every(p => p.module.shouldTranslateString(s)));
                strs.forEach(s => strings.add(s));
            } else if (data.importFails == 1) { // we already tried tokenizing and it failed, just give full text
                if (extraPlugins.every(p => p.module.shouldTranslateString(data.newUntranslated))) strings.add(data.newUntranslated);
            }
        } 
    }

    fs.writeFileSync(outputLocation, Array.from(strings).join('\n'));
}

module.exports = {init, afterParse, processTokens};