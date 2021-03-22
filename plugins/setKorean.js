const {mapIterator} = require('../utils/utils');
const {koreanRegex} = require('../utils/tokenizer');

const afterParse = (output) => {
    for (const {data} of mapIterator(output)) {
        delete data.korean;
        const val = data.newTranslated || data.oldTranslated;
        if (val && val.match(koreanRegex)) {
            data.korean = true;
        }
    }
}

module.exports = {afterParse};