const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {id, data} of mapIterator(output)) {
        //new string (or old unmatched from string)
        if ((data.hasOwnProperty("newUntranslated") && data.hasOwnProperty("oldUntranslated") && data.newUntranslated != data.oldUntranslated) || !data.oldTranslated) { 
            data.changed = true;
            data.newTranslated = data.newTranslated || "";
        }
    }
}

module.exports = {afterParse};