const {filesToProcess} = require('../config');
const path = require('path');
const fs = require('fs');
const { FS, MPQ } = require('@wowserhq/stormjs');
const {isMPQ} = require('./argParser');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


FS.mkdir('/maps');

process.removeAllListeners('uncaughtException') // stormlib hides error stack
process.removeAllListeners('unhandledRejection') // stormlib hides error stack

const scripts = ['war3map.j', 'scripts/war3map.j', 'war3map.lua', 'scripts/war3map.lua'];

class Map {
    constructor(loc) {   
        this.location = loc || "";
        this.isMPQ = loc && isMPQ(loc);

        for (const info of Object.values(filesToProcess)) {
            this[info.name] = info.empty;
        }

        this.usedStrings = new Set();
    }

    parseFiles(files) {
        for (const [buffer, file] of this.fileIterator(files)) {
            try {
                if(buffer) this.parseFile(buffer, filesToProcess[scripts.includes(file) ? 'war3map.j' : file]);
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
        return this.isMPQ ? this.mpq.hasFile(name.replace(/\//g, '\\')) : fs.existsSync(path.join(this.location, name));
    }

    getScript() {
        return scripts.find(f => this.hasFile(f));
    }

    *fileIterator(files) {
        if (!this.location) return;

        files = files || Object.keys(filesToProcess);

        for (let file of files) {
            if (file == "war3map.j") file = this.getScript();
            yield [this.readFile(file), file];
        }
    }

    readFile(file) {
        try {
            let buffer;
            
            if (this.hasFile(file)) {
                if (this.mpq) {
                    const f = this.mpq.openFile(file.replace(/\//g, '\\'));
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

    parseFile(buffer, info) {
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
            if (!this.strings[index]) {
                console.warn('string not found in wts file: ' + index);
                return str;
            }
            return this.strings[index];
        }

        return str;
    }

    writeWar(name, file, outputLocation) {
        const toWar = file.toWar(this[file.name]);

        if (toWar.errors && toWar.errors.length) console.warn(toWar.errors);

        const folderPath = outputLocation || path.join(this.isMPQ ? path.join(path.resolve(this.location), '..') : this.location, "translated");

        if (!fs.existsSync(path.join(folderPath))){
            fs.mkdirSync(path.join(folderPath), {recursive:true});
        }

        fs.writeFileSync(path.join(folderPath, name), toWar.buffer || toWar);
    }

    async validateScript(script) {
        try {
            console.log("validating script");

            let common = './data/common.j';
            let blizzard = './data/blizzard.j';

            if (this.hasFile('scripts/common.j')) {
                fs.writeFileSync('./data/map_common.j', this.readFile('scripts/common.j'));
                common = './data/map_common.j';
            }

            if (this.hasFile('scripts/blizzard.j')) {
                fs.writeFileSync('./data/map_blizzard.j', this.readFile('scripts/blizzard.j'));
                blizzard = './data/map_blizzard.j';
            }

            fs.writeFileSync('./data/map_script.j', script);

            const promise = exec(`pjass ${path.resolve(common)} ${path.resolve(blizzard)} ${path.resolve('./data/map_script.j')}`);
            const child = promise.child;

            child.stdout.on('data', function(data) {
                console.log(data);
            });

            await promise;
        } catch (e) {
            if (e.message.includes(`'pjass' is not recognized as an internal or external command`)) {
                console.log("pjass not installed, can't validate script. Install from https://www.hiveworkshop.com/threads/pjass-updates.258738/");
            } else {
                console.log(e);
            }
        }
    }

}

module.exports = Map;