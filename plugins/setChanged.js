const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {data} of mapIterator(output)) {
        //new string (or old unmatched from string)
        if ((data.hasOwnProperty("newUntranslated") && data.hasOwnProperty("oldUntranslated") && data.newUntranslated != data.oldUntranslated) || !data.hasOwnProperty("oldUntranslated")) { 
            data.changed = true;
        }
    }
}

module.exports = {afterParse};