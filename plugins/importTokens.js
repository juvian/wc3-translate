const { tokenize, isColorCode, isNumber } = require("../utils/tokenizer");
const { mapIterator } = require("../utils/utils");
const fs = require('fs');
const path = require('path');
const {processTokens} = require('./exportTokens');

let tokensLocation;
let translatedTokensLocation;
let extraPlugins;

const init = (plugin) => {
    if (plugin.args.length < 2) throw Error('importTokens plugin requires path to tokens and path to translated tokens');
    tokensLocation = plugin.args[0].arg;
    translatedTokensLocation = plugin.args[1].arg;
    extraPlugins = plugin.args.slice(2);
    extraPlugins.forEach(a => a.module = require(path.resolve(a.arg + '.js')));
}

const afterParse = (output) => {
    const untranslatedTokens = fs.readFileSync(tokensLocation).toString().split('\n');
    const translatedTokens = fs.readFileSync(translatedTokensLocation).toString().split('\n');

    if (untranslatedTokens.length != translatedTokens.length) throw Error("translatedTokens and untranslatedTokens files have different length")

    const translations = {};

    for (let i = 0; i < translatedTokens.length; i++) {
        translations[untranslatedTokens[i]] = translatedTokens[i];
    }
    
    for (const {data} of mapIterator(output)) {
        const shouldTranslate = extraPlugins.every(p => !p.module.shouldTranslateData || p.module.shouldTranslateData(data));
        if (shouldTranslate) {
            const tokens = tokenize(data.newUntranslated);
            const strs = processTokens(tokens);
            const numbers = tokens.filter(t => t.hasOwnProperty('token') && isNumber(t.token));
            const colors = tokens.filter(t => t.hasOwnProperty('token') && (isColorCode(t.token) || t.token.toLowerCase() == '|r')).map(c => c.token);
            let colorsIdx = 0;

            data.newTranslated = strs.map(s => {
                const text = translations[s] || s;
                return extraPlugins.every(p => p.module.shouldTranslateString(s)) ? text.replace(/\d+\.?\d*/g, (num) => numbers[parseInt(num) - 10]) : s;
            }).join('\n').replace(/\|\|\|/g, _ => colors[colorsIdx++]);
        }
    }
}

module.exports = {init, afterParse}