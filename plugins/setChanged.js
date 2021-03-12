const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {id, data} of mapIterator(output)) {
        if (data.hasOwnProperty("newUntranslated") && data.hasOwnProperty("oldUntranslated") && data.newUntranslated != data.oldUntranslated) {
            data.changed = true;
            data.newTranslated = data.newTranslated || "";
        } else if(!data.oldTranslated) { //new string (or old unmatched from string)
            data.changed = true;
        }
    }
}

module.exports = {afterParse};