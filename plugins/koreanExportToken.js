const {koreanRegex} = require('../utils/tokenizer');

const shouldTranslateString = (str) => str.match(koreanRegex);
const shouldTranslateData = (data) => data.untranslated;

module.exports = {shouldTranslateString, shouldTranslateData}