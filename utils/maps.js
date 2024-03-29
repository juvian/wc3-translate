const Map = require('./map');
const {filesToProcess} = require('../config');
const Processor = require('./processor');
const path = require('path');
const {quotesRegex} = require('../utils/tokenizer');

module.exports = class Maps {

    constructor(maps) {
        if (maps) maps.forEach(map => this.add(map));
    }
    
    add(map) {
        if (this.newUntranslated == undefined) this.newUntranslated = map;
        else if (this.oldTranslated == undefined) this.oldTranslated = map;
        else if (this.oldUntranslated == undefined) this.oldUntranslated = map;
        else throw Error('more than 3 maps provided');
    }

    process() {
        this.oldTranslated = this.oldTranslated || new Map();
        this.oldUntranslated = this.oldUntranslated || new Map();
        const output = {};
        
        this.maps = [this.newUntranslated, this.oldTranslated, this.oldUntranslated];
        this.maps.forEach((m, idx) => m.name = ["newUntranslated", "oldTranslated", "oldUntranslated"][idx]);

        for (const [name, file] of Object.entries(filesToProcess)) {
            if (this.newUntranslated.hasOwnProperty(name) && file.props) {
                output[name] = new Processor(this.maps.map(m => Object.assign({}, m[name].original, m[name].custom)), this.maps, file.props, file.ignore).process();
            }
        } 

        output.info = this.processInfo();
        output.script = this.processScript();
        output.strings = this.processStrings();
        output.interface = this.processTxt("interface");
        output.commandStrings = this.processTxt("commandStrings");

        output.metadata = {
            maps: this.maps.map(m => ({location: m.location == null ? null : path.resolve(m.location)}))
        }

        return output;
    }

    processStrings() {
        const result = {};

        for (const [idx, str] of Object.entries(this.newUntranslated.strings).filter(arr => !this.newUntranslated.usedStrings.has(+arr[0]) && arr[1])) {
            result[idx] = {};
            for (const map of this.maps) {
                if (map.strings.hasOwnProperty(idx)) result[idx][map.name] = map.strings[idx];
            }
        }

        return result;
    }

    processInfo() {
        const result = {players: [], forces: [], loadingScreen: {}, prologue: {}};

        for (const map of this.maps) {
            if (!map.info.players) continue;

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

            for (const parent of ["loadingScreen", "prologue"]) {
                for (const prop of ["text", "title", "subtitle"]) {
                    result[parent][prop] = result[parent][prop] || {};
                    result[parent][prop][map.name] = map.getString(map.info[parent][prop]);
                }
            }
        }

        return result;
    }

    processTxt(fileName) {
        const result = {};
        for (const [key, obj] of Object.entries(this.newUntranslated[fileName])) {
            for (const prop of Object.keys(obj)) {
                for (const map of this.maps) {
                    const val = map.getString(map[fileName]?.[key]?.[prop]);

                    if (val && !filesToProcess[fileName].ignore.includes(key)) {
                        result[key] = result[key] || {};
                        result[key][prop] = result[key][prop] || {};
                        result[key][prop][map.name] = val;
                    }
                }
            }
        }
        
        return result;
    }

    isSameLine(l1, l2) {
        return l1 == l2 || (l1.split('"').length == l2.split('"').length && l1.replace(quotesRegex, "") == l2.replace(quotesRegex, ""));
    }

    getMatches(line, map) {
        return(line.match(quotesRegex) || []).map(l => l.substring(1, l.length - 1)).map(s => map.getString(s))
            .filter(l => !l.endsWith('.mp3') && !l.endsWith('.wav') && !l.endsWith('.mdl') && !l.endsWith('.mdx') && !l.endsWith('.blp') && l.trim());
    }

    //this is hard, as we don't have a 1 to 1 match like in object files. New file can have new strings so can't even guess its the same amount of string
    //for each string of oldUntranslated, we try to find its equivalent in oldTranslated in order to know the translation
    //to check if its equivalent, we consider either is same line or is same line without the strings in it
    //then when we iterate all strings in newUntranslated, we check if we already know the translation from the other 2 maps
    //we can't know if it changed so we split into matched (things we already saw the translation) and unmatched (things we didn't)

    processScript() {
        const strings = {};
        const newStrings = {};
        let idx = 0;
        let slow = 0;

        this.maps.forEach(m => m.preprocessScript());
        console.log("processing scripts", this.maps.map(m => m.script.length))

        for (let j = 0; j < this.oldUntranslated.script.length; j++) {
            for (let i = idx; i < Math.min(this.oldTranslated.script.length, idx + 500); i++) {
                
                if (this.isSameLine(this.oldUntranslated.script[j], this.oldTranslated.script[i])) {
                    idx = i + 1;

                    const s1 = this.getMatches(this.oldUntranslated.script[j], this.oldUntranslated);
                    const s2 = this.getMatches(this.oldTranslated.script[i], this.oldTranslated);
        
                    for (let k = 0; k < Math.min(s1.length, s2.length); k++) {
                        strings[s1[k]] = s2[k].split('\\n').join('\n');
                    }

                    break;
                }
                if (i + 1 == Math.min(this.oldTranslated.script.length, idx + 500) && slow++ < 20) console.warn('could not match ' + this.oldUntranslated.script[j]);
            }
        } 

        for (const line of this.newUntranslated.script) {
            for (const match of this.getMatches(line, this.newUntranslated, true)) {
                newStrings[match] = newStrings[match] || {newUntranslated: match.split('\\n').join('\n')};
                if (strings[match]) {
                    newStrings[match].oldTranslated = strings[match];
                    newStrings[match].oldUntranslated = newStrings[match].newUntranslated;
                }
            }
        }

        return newStrings;
    }
}