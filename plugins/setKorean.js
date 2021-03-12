const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {id, data} of mapIterator(output)) {
        if (data.oldTranslated && data.oldTranslated.match(/[\u3131-\uea60]/)) {
            data.korean = true;
        }
    }
}

module.exports = {afterParse};