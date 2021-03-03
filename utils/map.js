const {filesToProcess} = require('../config');
const path = require('path');
const fs = require('fs');

class Map {
    constructor() {        
        for (const info of Object.values(filesToProcess)) {
            this[info.name] = info.empty;
        }

        this.usedStrings = new Set();
    }

    parseFiles(folder) {
        for (const file of Object.keys(filesToProcess)) {
            this.parseFile(path.join(folder, file), filesToProcess[file]);
        }
    }

    parseFile(path, info) {
        if (!fs.existsSync(path)) return;

        const buffer = fs.readFileSync(path);

        const parsed = info.toJson(buffer);

        if (parsed.errors && parsed.errors.length) console.warn('errors parsing ' + info.name, parsed.errors);

        this[info.name] = parsed.json || parsed;
    }

    afterParseFiles() {
        for (const info of Object.values(filesToProcess)) {
            if (info.afterParse) info.afterParse(this[info.name]);
        }
    }

    //if string comes from wts file, replace and mark as seen in order to ignore later when outputing string
    getString(str) {
        if (str && str.match(/TRIGSTR_\d+/)) {
            const index = parseInt(str.split('TRIGSTR_')[1]);
            this.usedStrings.add(index);
            return this.strings[index];
        }

        return str;
    }
}

module.exports = Map;