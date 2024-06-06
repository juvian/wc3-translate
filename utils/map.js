const {filesToProcess, pathsToName} = require('../config');
const path = require('path');
const fs = require('fs');
const { FS, MPQ } = require('@ldcv/stormjs');
const {isMPQ} = require('./argParser');
const {replaceHex} = require('../utils/utils');
const {quotesRegex} = require('../utils/tokenizer');

FS.mkdir('/maps');

process.removeAllListeners('uncaughtException') // stormlib hides error stack
process.removeAllListeners('unhandledRejection') // stormlib hides error stack

class Map {
    constructor(loc) {   
        this.location = loc || "";
        this.isMPQ = loc && isMPQ(loc);

        for (const [name, info] of Object.entries(filesToProcess)) {
            this[name] = info.empty;
        }

        this.usedStrings = new Set();
        this.namesToFiles = {};
    }

    static fromMPQ(mpq) {
        const map = new Map("fake.mpq");
        map.mpq = mpq;
        return map;
    }

    parseFiles(files) {
        for (const [buffer, file] of this.fileIterator(files)) {
            try {
                if(buffer) this.parseFile(buffer, file);
            } catch(e) {
                console.error('failed to parse ' + file + ', will skip', e)
            }
        }
    }

    async mount() {
        if (this.isMPQ) {
            FS.mount(FS.filesystems.NODEFS, { root: path.join(path.resolve(this.location), '..') }, '/maps');
            this.mpq = await MPQ.open('/maps/' + path.basename(this.location), 'r');
        }
    }

    unmount() {
        if (this.isMPQ) {
            this.mpq.close();
            FS.unmount('/maps');
        }
    }

    hasFile(name) {
        return name && (this.isMPQ ? this.mpq.hasFile(this.cleanName(name)) : fs.existsSync(path.join(this.location, name)));
    }

    cleanName(file) {
        return file != null ? file.replace(/\//g, '\\') : null;
    }

    getScript() {
        return filesToProcess['script'].paths.find(f => this.hasFile(f));
    }

    *fileIterator(files) {
        if (!this.location) return;

        files = files || [].concat.apply([], Object.values(filesToProcess).map(f => f.paths));

        for (let file of files) {
            yield [this.readFile(file), file];
        }
    }

    readFile(file) {
        try {
            let buffer;
            
            if (this.hasFile(file)) {
                if (this.mpq) {
                    const f = this.mpq.openFile(this.cleanName(file));
                    buffer = Buffer.from(f.read());
                    f.close();
                } else {
                    buffer = fs.readFileSync(path.join(this.location, file));
                }
            }
            
            return buffer;
        } catch (ex) {
            console.error('Failed to read file ' + file, ex.message);
        }
    }

    parseFile(buffer, file) {
        const name = pathsToName[file];
        const parsed = filesToProcess[name].toJson(buffer);

        if (parsed.errors && parsed.errors.length) console.warn('errors parsing ' + name, parsed.errors);

        this[name] = parsed.json || parsed;
        this.namesToFiles[name] = file;
    }

    afterParseFiles() {
        for (const [name, info] of Object.entries(filesToProcess)) {
            if (info.afterParse) info.afterParse(this[name], name);
        }
    }

    //if string comes from wts file, replace and mark as seen in order to ignore later when outputing string
    getString(str) {
        if (str && str.match(/TRIGSTR_\d+/)) {
            const index = parseInt(str.split('TRIGSTR_')[1]);
            this.usedStrings.add(index);
            if (!this.strings[index]) {
                console.warn('string not found in wts file: ' + index);
                return str;
            }
            return this.strings[index];
        }

        return str;
    }

    writeWar(name, file, outputLocation) {
        if (!this.namesToFiles[name]) return console.warn(name + ' not found in map, skipping writing the file');

        const toWar = file.toWar(this[name]);

        if (toWar.errors && toWar.errors.length) console.warn(toWar.errors);

        const folderPath = outputLocation || path.join(this.isMPQ ? path.join(path.resolve(this.location), '..') : this.location, "translated");

        if (!fs.existsSync(path.dirname(path.join(folderPath, this.namesToFiles[name])))){
            fs.mkdirSync(path.dirname(path.join(folderPath, this.namesToFiles[name])), {recursive:true});
        }

        fs.writeFileSync(path.join(folderPath, this.namesToFiles[name]), toWar.buffer || toWar);
    }

    async validateScript(script) {
        const util = require('util');
        const exec = util.promisify(require('child_process').exec);
        const commandExists = require('command-exists').sync;

        const exists = commandExists(path.join(__dirname, '../pjass'));

        if (!exists) {
            console.log("pjass not installed, can't validate script. Install from https://www.hiveworkshop.com/threads/pjass-updates.258738/");
            return;
        }

        try {
            console.log("validating script");

            let common = '../data/common.j';
            let blizzard = '../data/blizzard.j';

            if (this.hasFile('scripts/common.j')) {
                fs.writeFileSync(path.join(__dirname, '../data/map_common.j'), this.readFile('scripts/common.j'));
                common = '../data/map_common.j';
            }

            if (this.hasFile('scripts/blizzard.j')) {
                fs.writeFileSync(path.join(__dirname, '../data/map_blizzard.j'), this.readFile('scripts/blizzard.j'));
                blizzard = '../data/map_blizzard.j';
            }

            fs.writeFileSync(path.join(__dirname, '../data/map_script.j'), script);

            const promise = exec(`${path.join(__dirname, '../pjass')} "${path.join(__dirname, common)}" "${path.join(__dirname, blizzard)}" "${path.join(__dirname, '../data/map_script.j')}"`);
            const child = promise.child;

            child.stdout.on('data', function(data) {
                console.log(data);
            });

            await promise;
        } catch (e) {
            console.log(e);
        }
    }

    preprocessScript() {
        if (this.script instanceof Buffer == false) return;
        this.script = this.script.toString().replace(quotesRegex, (str) => str.replace(/\r\n/g, '\n').replace(/[\r\n]/g, '??|??||??')).split(/[\r\n]+/).filter(line => !line.trim().startsWith('//') && line.includes('"') && !line.trim().startsWith('call ExecuteFunc')).map(str => replaceHex(str).split('??|??||??').join('\n'))
    }

}

module.exports = Map;