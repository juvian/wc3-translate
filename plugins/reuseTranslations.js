const Maps = require('../utils/maps');
const {mapIterator} = require('../utils/utils');

const afterParse = (output, maps) => {
    if (maps.maps.length == 3) {
        const oldMaps = new Maps([maps.oldUntranslated, maps.oldTranslated]);
        const oldOutput = oldMaps.process();
        const translations = {};

        for (const {data} of mapIterator(oldOutput)) {
            if (data.oldTranslated && data.newUntranslated) {
                translations[data.newUntranslated] = data.oldTranslated;
            } 
        }

        for (const {data} of mapIterator(output)) {
            if (!data.oldTranslated && translations.hasOwnProperty(data.newUntranslated)) {
                data.oldTranslated = translations[data.newUntranslated];
                data.oldUntranslated = data.newUntranslated;
            }
        }
    }
}

module.exports = {afterParse}