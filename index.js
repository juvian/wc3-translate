const Translator = require('wc3maptranslator');
const fs = require('fs');
const path = require('path');

const toEntries = (data) => {
    Object.keys(data.custom).forEach(k => data.custom[k] = Object.fromEntries(data.custom[k].map(info => [info.id, info])))
}

const setChanged = (obj) => {
    if (obj.newUntranslated !== obj.oldUntranslated) {
        obj.changed = true;
    }
}

const filesToProcess = {
    "war3map.w3u": {
        name: "units"
    },
    "war3map.wts": {
        name: "strings",
        parse: Translator.Strings.warToJson,
        afterParse: false,
        empty: {}
    },
    "war3map.w3a": {
        name: "abilities"
    },
    "war3map.w3t": {
        name: "items"
    },
    "war3map.w3h": {
        name: "buffs"
    },
    "war3map.w3q": {
        name: "upgrades"
    },
    "war3map.w3b": {
        name: "destructables"
    },
    "war3map.j": {
        name: "script",
        parse: (b) => b.toString().split('\n').filter(line => line.trim().startsWith('//') == false),
        afterParse: false,
        empty: {}
    }
}

for (const file of Object.values(filesToProcess)) {
    if (file.hasOwnProperty('afterParse') == false) file.afterParse = toEntries;
    if (file.hasOwnProperty('empty') == false) file.empty = {custom: {}, standard: {}};
    if (file.hasOwnProperty('parse') == false) file.parse = Translator.Objects.warToJson.bind(null, file.name);
}

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

        const parsed = info.parse(buffer);

        if (parsed.errors && parsed.errors.length) console.warn('errors parding ' + info.name, parsed.errors);

        this[info.name] = parsed.json || parsed;
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
        const output = {};
        this.maps = [this.newUntranslated, this.oldTranslated, this.oldUntranslated];

        this.oldTranslated = this.oldTranslated || new Map();
        this.oldUntranslated = this.oldUntranslated || new Map();
        /*
        output.units = this.processUnits();
        output.abilities = this.processAbilities();
        output.items = this.processItems();
        output.buffs = this.processBuffs();
        output.upgrades = this.processUpgrades();
        output.destructables = this.processDestructables();
        */
        output.scripts = this.processScripts();

        output.strings = this.processStrings();

        return output;
    }

    processUnits() {
        return new Processor(this.maps.map(m => m.units.custom), this.maps, {"unam": "name"}).process();
    }

    processStrings() {
        const result = {};

        const set = (idx, prop) => {if (this[prop].strings.hasOwnProperty(idx)) result[idx][prop] = this[prop].strings[idx]};

        for (const [idx, str] of Object.entries(this.newUntranslated.strings)) {
            result[idx] = {};

            if (this.newUntranslated.usedStrings.has(+idx)) continue;

            set(idx, "newUntranslated")
            set(idx, "oldUntranslated")
            set(idx, "oldTranslated")

            setChanged(result[idx]);
        }

        return result;
    }

    processItems() {
        return new Processor(this.maps.map(m => m.items.custom), this.maps, {"unam": "name", "utub": "uberTip", "ides": "description"}).process();
    }

    processAbilities() {
        return new Processor(this.maps.map(m => m.abilities.custom), this.maps, {"aub1": "uberTip", "anam": "name", "atp1": "tip", "aret": "researchTip", "arut": "researchUberTip"}).process();
    }

    processBuffs() {
        return new Processor(this.maps.map(m => m.buffs.custom), this.maps, {"fnam": "name", "fube": "uberTip", "ftip": "tip"}).process();
    }

    processUpgrades() {
        return new Processor(this.maps.map(m => m.buffs.custom), this.maps, {"gnam": "name", "gube": "uberTip", "gtip": "tip"}).process();
    }

    processDestructables() {
        return new Processor(this.maps.map(m => m.destructables.custom), this.maps, {"bnam": "name", "bube": "uberTip", "btip": "tip"}).process();
    }

    isSameLine(l1, l2) {
        return l1 == l2 || (l1.split('"').length == l2.split('"').length && l1.replace(/"((?:\\.|[^"\\])*)"/g, "") == l2.replace(/"((?:\\.|[^"\\])*)"/g, ""));
    }

    getMatches(line, strings) {
        return (line.match(/"((?:\\.|[^"\\])*)"/g) || []).map(l => l.substring(1, l.length - 1)).map(l => l.match(/TRIGSTR_\d+/) ? strings[parseInt(l.split('TRIGSTR_')[1])] : l).filter(l => !l.endsWith('.mp3') && !l.endsWith('.wav') && !l.endsWith('.mdl') && !l.endsWith('.mdx'));
    }

    processScripts() {
        const strings = {};
        const newStrings = {};
        let idx = 0;

        for (let j = 0; j < this.oldUntranslated.script.length; j++) {
            for (let i = idx; i < idx + 5000; i++) {
                if (this.isSameLine(this.oldUntranslated.script[j], this.oldTranslated.script[i])) {
                    idx = i + 1;

                    const s1 = this.getMatches(this.oldUntranslated.script[j], this.oldUntranslated.strings);
                    const s2 = this.getMatches(this.oldTranslated.script[i], this.oldTranslated.strings);
        
                    for (let k = 0; k < Math.min(s1.length, s2.length); k++) {
                        strings[s1[k]] = s2[k];
                    }

                    break;
                }
            }
        } 

        for (const line of this.newUntranslated.script) {
            for (const match of this.getMatches(line, this.newUntranslated.strings)) {
                newStrings[match] = strings[match] || match;
            }
        }

        return newStrings;
    }
}

class Processor {
    constructor(data, maps, props) {
        this.data = data;
        this.maps = maps;
        this.props = props;
        this.names = ["newUntranslated", "oldTranslated", "oldUntranslated"];
    }

    process() {
        this.results = {};

        for (const [id, data] of Object.entries(this.data[0])) {
            for (const [prop, name] of Object.entries(this.props)) {
                this.set(id, prop, name);
            }
        }

        return this.results;
    }

    set(id, prop, name) {
        for (const [idx, data] of Object.entries(this.data)) {
            if (data.hasOwnProperty(id) && data[id].hasOwnProperty(prop) && data[id][prop].value) {
                let val = data[id][prop].value;

                if (val.match(/TRIGSTR_\d+/) && this.maps[idx].strings[parseInt(val.split('TRIGSTR_')[1])]) {
                    const i = parseInt(val.split('TRIGSTR_')[1]);
                    val = this.maps[idx].strings[i];
                    this.maps[idx].usedStrings.add(i);
                }

                this.results[id] = this.results[id] || {};
                this.results[id][name] = this.results[id][name] || {};
                this.results[id][name][this.names[idx]] = val;
            }
        }

        if (this.results[id] && this.results[id][name]) setChanged(this.results[id][name]);
    }
}

function main() {
    const maps = new Maps();
    
    for (const arg of process.argv.slice(2, -1)) {
        const map = new Map();

        if (fs.existsSync(arg) && fs.lstatSync(arg).isDirectory()) {
            map.parseFiles(arg);
            map.afterParseFiles();
        }

        maps.add(map);
    }

    const output = maps.process();
    fs.writeFileSync(process.argv.pop(), JSON.stringify(output, null, 2));
}


main();