const fs = require('fs');
const {parseArgs} = require('../utils/argParser');
const Map = require('../utils/map');
const {fileRegex} = require('../utils/tokenizer');
const path = require('path');

const shouldScan = (file) => {
    return file.endsWith('mdx') || file.includes('war3map');
}

const checkFile = (map, file, seen, foundFiles) => {
    if (seen.has(file) || !file.trim()) return;

    seen.add(file);

    if (map.hasFile(file)) {
        foundFiles.add(file);
        if (shouldScan(file)) scanFile(map, file, seen, foundFiles);
    }

    if (file.endsWith('.mdx')) checkFile(map, file.slice(-4) + '_portrait.mdx', seen, foundFiles);
}

const checkFiles = (map, files, seen, foundFiles) => {
    files.forEach(f => checkFile(map, f, seen, foundFiles));
}

const scanFile = (map, file, seen, foundFiles) => {
    const buffer = map.readFile(file);

    if (buffer) {
        const str = buffer.toString();

        if (file == '(listfile)') checkFiles(map, str.split(/\r\n/), seen, foundFiles);
        else {
            const separator = (file.endsWith('war3map.j') || file.endsWith('war3map.lua')) ? '"' : (file.endsWith('.txt') ? '=' : '\0');

            for (const candidate of str.matchAll(fileRegex)) {
                const idx = Math.max(str.lastIndexOf(separator, candidate.index), 0);
                const file = str.substring(idx + 1, candidate.index + candidate[0].length).replace(/\.mdl$/, '.mdx').replace(/\\+/g, '\\');
                checkFile(map, file, seen, foundFiles);
            }
        }
    } else {
        foundFiles.delete(file);
    }
}

async function main() {
    const args = await parseArgs(process.argv.slice(2));
    const mapLocation = args[0].arg;
    const outputLocation = args[1].arg;
    const outputFolderLocation = args.length > 2 && args[2].arg.endsWith('.txt') == false ? args[2].arg : null;
    const listFileLocations = args.slice(2).map(a => a.arg).filter(arg => arg !== outputFolderLocation).concat([path.join(__dirname, '..\\utils\\listfile.txt')]);

    const files = new Set();

    for (const location of listFileLocations) {
        fs.readFileSync(location).toString().split(/\r\n/).forEach(f => files.add(f));
    }
    

    const map = new Map(mapLocation);
    await map.mount();

    const foundFiles = new Set();
    const seen = new Set();
    
    checkFiles(map, files, seen, foundFiles);

    console.log("found " + foundFiles.size + " files");

    fs.writeFileSync(outputLocation, Array.from(foundFiles).join('\n'))

    if (outputFolderLocation) {
        for (const file of foundFiles) {
            try {
                const buffer = map.readFile(file);
                const loc = path.join(outputFolderLocation, file);

                if (!fs.existsSync(path.dirname(loc))) {
                    fs.mkdirSync(path.dirname(loc), {recursive: true});
                }

                if (buffer && !fs.existsSync(loc)) fs.writeFileSync(loc, buffer);
            } catch (e) {
                console.warn('failed to extract ' + file, e);
            }
        }
    }
}

main();