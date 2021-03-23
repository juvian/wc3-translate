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
            const numbers = tokens.filter(t => t.hasOwnProperty('token') && isNumber(t.token)).map(c => c.token);
            const colors = tokens.filter(t => t.hasOwnProperty('token') && (isColorCode(t.token) || t.token.toLowerCase() == '|r')).map(c => c.token);
            let colorsIdx = 0, numbersIdx = 0;
            let inconsistent = false;
            let translated = [];

            for (const s of strs) {
                let t = s;
                if (translations.hasOwnProperty(s)) {
                    t = translations[s];
                    inconsistent = (s.match(/[1-9]\d?/g) || []).sort().join('-') != (t.match(/[1-9]\d?/g) || []).sort().join('-') ||
                            (s.match(/\\n/g) || []).length != (t.match(/\\n/g) || []).length;
                    if (inconsistent) break;
                }

                let counter = 0;

                t = t.replace(/[1-9]\d?/g, (num) => {
                    counter++;
                    return numbers[parseInt(num) - 10 + numbersIdx];
                }).replace(/\\n/g, _ => colors[colorsIdx++]);

                numbersIdx += counter;

                translated.push(t.replace(/[\r\n]+/, ''));
            }

            if (inconsistent) {
                data.importFails = (data.importFails || 0) + 1;
            } else {
                data.newTranslated = translated.join('\n');
                data.importedTokens = true;
            }
        }
    }
}

module.exports = {init, afterParse}