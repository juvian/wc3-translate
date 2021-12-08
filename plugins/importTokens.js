const { tokenize, isColorCode, isNumber, fixString } = require("../utils/tokenizer");
const { mapIterator } = require("../utils/utils");
const fs = require('fs');
const path = require('path');
const {processTokens} = require('./exportTokens');
const {resolvePluginPath} = require('../utils/argParser');

let tokensLocation;
let translatedTokensLocation;
let extraPlugins = [];

const init = (plugin) => {
    if (plugin.args.length < 2) throw Error('importTokens plugin requires path to tokens and path to translated tokens');
    tokensLocation = plugin.args[0].arg;
    translatedTokensLocation = plugin.args[1].arg;
    extraPlugins = plugin.args.slice(2);
    extraPlugins.forEach(a => a.module = require(resolvePluginPath(a.arg + '.js')));
}

const afterParse = (output, t1, t2) => {
    const untranslatedTokens = t1 || fs.readFileSync(tokensLocation).toString().trimEnd().split('\n');
    const translatedTokens = t2 || fs.readFileSync(translatedTokensLocation).toString().trimEnd().split('\n');

    if (untranslatedTokens.length != translatedTokens.length) throw Error("translatedTokens and untranslatedTokens files have different length")

    const translations = {};

    for (let i = 0; i < translatedTokens.length; i++) {//ignore if only spaces changed
        if (untranslatedTokens[i].replace(/\s/g, '') != translatedTokens[i].replace(/\s/g, '')) {
            translations[untranslatedTokens[i]] = translatedTokens[i];
        }
    }

    for (const {data} of mapIterator(output)) {
        const shouldTranslate = !data.importedTokens && extraPlugins.every(p => !p.module.shouldTranslateData || p.module.shouldTranslateData(data));
        if (shouldTranslate) {
            if (data.importFails == 1) {
                data.newTranslated = fixString(data.newUntranslated.split('\n').map(l => translations[l]).join('\n'));
                data.importedTokens = true;
                continue;
            }
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
                data.newTranslated = fixString(translated.join('\n'));
                data.importedTokens = true;
            }
        }
    }
}

module.exports = {init, afterParse}