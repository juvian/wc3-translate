const Translator = require('wc3maptranslator');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = '/data/output';

const filesToProcess = {
    "war3map.w3u": {
        name: "units",
        parse: Translator.Objects.warToJson.bind(null, "units"),
        afterParse: fixUnits,
        empty: {custom: {}, standard: {}}
    },
    "war3map.wts": {
        name: "strings",
        parse: Translator.Strings.warToJson
    }
}

class Map {
    constructor() {
        for (const info of Object.values(filesToProcess)) {
            this[info.name] = info.empty;
        }
    }

    parseFiles(folder) {
        for (const file of Object.keys(filesToProcess)) {
            this.parseFile(path.join(folder, file), filesToProcess[file]);
        }
    }

    parseFile(path, info) {
        if (!fs.existsSync(path)) return;

        const buffer = fs.readFileSync(path);

        const parsed = info.parse(buffer);

        if (parsed.errors.length) console.warn('errors parding ' + info.name, parsed.errors);

        this[info.name] = parsed.json;
    }

    afterParseFiles() {
        for (const info of Object.values(filesToProcess)) {
            if (info.afterParse) info.afterParse(this[info.name]);
        }
    }
}

class Maps {
    add(map) {
        if (this.newUntranslated == undefined) this.newUntranslated = map;
        else if (this.oldTranslated == undefined) this.oldTranslated = map;
        else if (this.oldUntranslated == undefined) this.oldUntranslated = map;
        else throw Error('more than 3 maps provided');
    }

    process() {
        this.oldTranslated = this.oldTranslated || new Map();
        this.oldUntranslated = this.oldUntranslated || new Map();

        this.processUnits();
    }

    processUnits() {
        for (const [unitId, unit] of Object.entries(this.newUntranslated.units.custom)) {
            console.log(unitId, unit);
            break;
        }
    }
}

const maps = new Maps();

for (const arg of process.argv.slice(2)) {
    const map = new Map();

    if (fs.existsSync(arg)) {
        map.parseFiles(arg);
        map.afterParseFiles();
    }

    maps.add(map);
}

maps.process();

function fixUnits(data) {
    Object.keys(data.custom).forEach(k => data.custom[k] = Object.fromEntries(data.custom[k].map(info => [info.id, info])));
}