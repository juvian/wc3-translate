const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {data} of mapIterator(output)) {
        delete data.untranslated;
        if (!data.newTranslated && (!data.hasOwnProperty('oldTranslated') || data.oldTranslated == data.newUntranslated) && data.newUntranslated) { 
            data.untranslated = true;
        }
    }
}

module.exports = {afterParse};