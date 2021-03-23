const {koreanRegex} = require('../utils/tokenizer');

const shouldTranslateString = (str) => str.match(koreanRegex);
const shouldTranslateData = (data) => !data.newTranslated && (data.untranslated || data.changed);

module.exports = {shouldTranslateString, shouldTranslateData}