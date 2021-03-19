const {filesToProcess, isMPQ} = require('../config');
const path = require('path');
const fs = require('fs');
const { FS, MPQ } = require('@wowserhq/stormjs');

FS.mkdir('/maps');

class Map {
    constructor(folder) {   
        this.folder = folder;
        this.isMPQ = folder && isMPQ(folder);

        for (const info of Object.values(filesToProcess)) {
            this[info.name] = info.empty;
        }

        this.usedStrings = new Set();
    }

    async parseFiles(files) {
        if (!this.folder) return;
        
        files = files || Object.keys(filesToProcess);

        console.log("parsing map " + this.folder);

        let mpq;

        if (this.isMPQ) {
            FS.mount(FS.filesystems.NODEFS, { root: path.join(path.resolve(this.folder), '..') }, '/maps');
            mpq = await MPQ.open('/maps/' + path.basename(this.folder), 'r');
        }

        for (const file of files) {
            let buffer;
            
            if (mpq) {
                if (!mpq.hasFile(file) && file == "war3map.j" && mpq.hasFile('scrips/war3map.j')) file = 'scrips/war3map.j';
                if (mpq.hasFile(file)) {
                    const f = mpq.openFile(file);
                    buffer = Buffer.from(f.read());
                    f.close();
                }
            } else {
                buffer = fs.existsSync(path.join(this.folder, file)) ? fs.readFileSync(path.join(this.folder, file)) : null;
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

        const folderPath = outputLocation || path.join(this.isMPQ ? path.join(path.resolve(this.folder), '..') : this.folder, "translated");

        if (!fs.existsSync(path.join(folderPath))){
            fs.mkdirSync(path.join(folderPath));
        }

        fs.writeFileSync(path.join(folderPath, name), toWar.buffer || toWar, 'utf8');
    }
}

module.exports = Map;