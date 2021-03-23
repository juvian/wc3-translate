const {filesToProcess} = require('../config');
const path = require('path');
const fs = require('fs');
const { FS, MPQ } = require('@wowserhq/stormjs');
const {isMPQ} = require('./argParser');

FS.mkdir('/maps');

process.removeAllListeners('uncaughtException') // stormlib hides error stack
process.removeAllListeners('unhandledRejection') // stormlib hides error stack

class Map {
    constructor(loc) {   
        this.location = loc || "";
        this.isMPQ = loc && isMPQ(loc);

        for (const info of Object.values(filesToProcess)) {
            this[info.name] = info.empty;
        }

        this.usedStrings = new Set();
    }

    async parseFiles(files) {
        if (!this.location) return;

        files = files || Object.keys(filesToProcess);

        console.log("parsing map " + this.location);

        let mpq;

        if (this.isMPQ) {
            FS.mount(FS.filesystems.NODEFS, { root: path.join(path.resolve(this.location), '..') }, '/maps');
            mpq = await MPQ.open('/maps/' + path.basename(this.location), 'r');
        }

        for (const file of files) {
            let buffer;
            
            if (mpq) {
                let toOpen = !mpq.hasFile(file) && file == "war3map.j" && mpq.hasFile('scripts\\war3map.j') ? 'scripts\\war3map.j' : file;
                if (mpq.hasFile(toOpen)) {
                    const f = mpq.openFile(toOpen);
                    buffer = Buffer.from(f.read());
                    f.close();
                }
            } else {
                buffer = fs.existsSync(path.join(this.location, file)) ? fs.readFileSync(path.join(this.location, file)) : null;
            }
            
            if(buffer) this.parseFile(buffer, filesToProcess[file]);
        }

        if (mpq) {
            mpq.close();
            FS.unmount('/maps');
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
            return this.strings[index];
        }

        return str;
    }

    writeWar(name, file, outputLocation) {
        const toWar = file.toWar(this[file.name]);

        if (toWar.errors && toWar.errors.length) console.warn(toWar.errors);

        const folderPath = outputLocation || path.join(this.isMPQ ? path.join(path.resolve(this.location), '..') : this.location, "translated");

        if (!fs.existsSync(path.join(folderPath))){
            fs.mkdirSync(path.join(folderPath));
        }

        fs.writeFileSync(path.join(folderPath, name), toWar.buffer || toWar, 'utf8');
    }
}

module.exports = Map;