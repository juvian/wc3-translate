const fs = require('fs');
const path = require('path');
const {filesToProcess} = require('./config');

const setChanged = (obj) => {
    if (obj.newUntranslated !== obj.oldUntranslated) {
        obj.changed = true;
    }
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
        this.maps.forEach((m, idx) => m.name = ["newUntranslated", "oldTranslated", "oldUntranslated"][idx]);

        this.oldTranslated = this.oldTranslated || new Map();
        this.oldUntranslated = this.oldUntranslated || new Map();
        
        for (const file of Object.values(filesToProcess)) {
            if (this.newUntranslated.hasOwnProperty(file.name) && file.props) {
                output[file.name] =  new Processor(this.maps.map(m => m[file.name].custom), this.maps, file.props, file.ignore).process();
            }
        } 

        output.info = this.processInfo();
        output.scripts = this.processScripts();
        output.strings = this.processStrings();

        return output;
    }

    processStrings() {
        const result = {};

        for (const [idx, str] of Object.entries(this.newUntranslated.strings).filter(arr => !this.newUntranslated.usedStrings.has(+arr[0]))) {
            result[idx] = {};

            for (const map of this.maps) {
                if (map.strings.hasOwnProperty(idx)) result[idx][map.name] = map.strings[idx];
            }
        }

        return result;
    }

    processInfo() {
        const result = {players: [], forces: []};

        for (const map of this.maps) {
            const isLast = map == this.maps[this.maps.length - 1];

            for (const prop of ["name", "author", "description", "recommendedPlayers"]) {
                result[prop] = result[prop] || {};
                result[prop][map.name] = map.getString(map.info.map[prop]);
            }

            for (const [idx, player] of Object.entries(map.info.players)) {
                result.players[idx] = result.players[idx] || {name: {}};
                result.players[idx].name[map.name] = map.getString(player.name);
            }

            for (const [idx, force] of Object.entries(map.info.forces)) {
                result.forces[idx] = result.forces[idx] || {name: {}};
                result.forces[idx].name[map.name] = map.getString(force.name);                
            }
        }

        return result;
    }

    isSameLine(l1, l2) {
        return l1 == l2 || (l1.split('"').length == l2.split('"').length && l1.replace(/"((?:\\.|[^"\\])*)"/g, "") == l2.replace(/"((?:\\.|[^"\\])*)"/g, ""));
    }

    getMatches(line, map, addString) {
        return(line.match(/"((?:\\.|[^"\\])*)"/g) || []).map(l => l.substring(1, l.length - 1)).map(s => map.getString(s))
            .filter(l => !l.endsWith('.mp3') && !l.endsWith('.wav') && !l.endsWith('.mdl') && !l.endsWith('.mdx') && l.trim());
    }

    //this is hard, as we don't have a 1 to 1 match like in object files. New file can have new strings so can't even guess its the same amount of string
    //for each string of oldUntranslated, we try to find its equivalent in oldTranslated in order to know the translation
    //to check if its equivalent, we consider either is same line or is same line without the strings in it
    //then when we iterate all strings in newUntranslated, we check if we already know the translation from the other 2 maps
    //we can't know if it changed so we split into matched (things we already saw the translation) and unmatched (things we didn't)

    processScripts() {
        const strings = {};
        const newStrings = {matched: {}, unmatched: {}};
        let idx = 0;

        for (let j = 0; j < this.oldUntranslated.script.length; j++) {
            for (let i = idx; i < Math.min(this.oldTranslated.script.length, idx + 5000); i++) {
                if (this.isSameLine(this.oldUntranslated.script[j], this.oldTranslated.script[i])) {
                    idx = i + 1;

                    const s1 = this.getMatches(this.oldUntranslated.script[j], this.oldUntranslated);
                    const s2 = this.getMatches(this.oldTranslated.script[i], this.oldTranslated);
        
                    for (let k = 0; k < Math.min(s1.length, s2.length); k++) {
                        strings[s1[k]] = s2[k];
                    }

                    break;
                }
            }
        } 

        for (const line of this.newUntranslated.script) {
            for (const match of this.getMatches(line, this.newUntranslated, true)) {
                if (strings[match]) newStrings.matched[match] = strings[match]
                else newStrings.unmatched[match] = match;
            }
        }

        return newStrings;
    }
}

class Processor {
    constructor(data, maps, props, toIgnore) {
        this.data = data;
        this.maps = maps;
        this.props = props;
        this.toIgnore = toIgnore || [];
    }

    process() {
        this.results = {};

        for (const [id, data] of Object.entries(this.data[0])) {
            for (const [prop, name] of Object.entries(this.props)) {
                this.set(id, prop, name);
            }

            //process in order to remove from strings but dont save in output
            for (const prop of this.toIgnore) {
                this.set(id, prop, null);
            }
        }

        return this.results;
    }

    //for a certain id such as itemId and prop such as utib, check if it exists in maps and set result to output if name is set
    set(id, prop, name) {
        for (const [idx, data] of Object.entries(this.data)) {
            if (data.hasOwnProperty(id) && data[id].hasOwnProperty(prop)) {
                for (const [level, modification] of Object.entries(data[id][prop])) {
                    if (modification.value) {
                        let val = this.maps[idx].getString(modification.value);

                        if (name) {
                            this.results[id] = this.results[id] || {};
                            this.results[id][name] = this.results[id][name] || [];
                            this.results[id][name][level] = this.results[id][name][level] || {};
                            this.results[id][name][level][this.maps[idx].name] = val;
                        }
                    }
                }
            }
        }
    }
}

function main() {
    const maps = new Maps();
    const outputLocation = process.argv.slice(2).find(arg => arg.endsWith('.json'));
    const mapLocations = process.argv.slice(2).filter(arg => !arg.endsWith('.json') && !arg.endsWith('.js') && fs.existsSync(arg) && fs.lstatSync(arg).isDirectory())
    const plugins = process.argv.slice(2).filter(arg => arg.endsWith('.js') && fs.existsSync(arg)).map(p => require(p));

    for (const loc of mapLocations) {
        const map = new Map();

        map.parseFiles(loc);
        map.afterParseFiles();

        maps.add(map);
    }

    const output = maps.process();

    for (const plugin of plugins) {
        if (plugin.afterParse) plugin.afterParse(output);
    }

    fs.writeFileSync(outputLocation, JSON.stringify(output, null, 2));
}


main();