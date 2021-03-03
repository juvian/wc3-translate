const {objectIterator} = require('./utils');

const afterParse = (output) => {
    for (const [obj, prop] of objectIterator(output)) {
        if (prop == "newUntranslated" && obj.hasOwnProperty("oldUntranslated") && obj[prop] !== obj.oldUntranslated) {
            obj.changed = true;
        }
    }
}

module.exports = {afterParse};