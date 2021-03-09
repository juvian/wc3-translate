const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {id, data} of mapIterator(output)) {
        if (data.changed && data.newUntranslated.replace(/ /g) == data.oldUntranslated.replace(/ /g)) {
            data.onlySpacingDiff = true;
        }
    }
}

module.exports = {afterParse};