const fs = require('fs');
const {parseArgs} = require('../utils/argParser');
const Map = require('../utils/map');
const {fileRegex} = require('../utils/tokenizer');
const path = require('path');

const shouldScan = (file) => {
    return file.endsWith('mdx') || file.includes('war3map') || file.endsWith('.toc') || file.endsWith('.fdf');
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

const fileSeparator = (file) => {
    if (file.endsWith('war3map.j') || file.endsWith('war3map.lua') || file.endsWith('.fdf')) return '"';
    if (file.endsWith('.txt')) return '=';
    if (file.endsWith('.toc')) return '\n';
    return '\0';
}

const solveParts = (parts, idx, options = new Set()) => {
    if (idx >= parts.length) return options;
    if (parts[idx].type == 'var' && solveAdditions.variableOptions.hasOwnProperty(parts[idx].val) == false) return options;

    for (const option of [...options]) {
        options.delete(option);
        for (const val of parts[idx].type == 'var' ? solveAdditions.variableOptions[parts[idx].val] : [parts[idx].val]) {
            options.add(val + option);
        }
    }
    
    return solveParts(parts, idx + 1, options);
}

//try to replace variables to solve "UI\\"+VHv+"A.tga" case
solveAdditions = function(str, idx, newFile) {
    //console.log(str)
    if (solveAdditions.variableOptions == null) {
        solveAdditions.variableOptions = {};

        for (const match of str.matchAll('set\s*([^\s]+)\s*=\s*"([^\"]+)')) {
            const variable = match[1].trim();
            const str = match[2];

            if (solveAdditions.variableOptions.hasOwnProperty(variable) == false) solveAdditions.variableOptions[variable] = [];
            solveAdditions.variableOptions[variable].push(str);
        }
    }

    const parts = [];

    while (idx > 0) {
        while (idx > 0 && str[idx] == ' ') idx -= 1;
        if (str[idx] != '+') break;
        idx -= 1;
        while (idx > 0 && str[idx] == ' ') idx -= 1;

        const oldIdx = idx;

        if (str[idx] == '"') {
            idx = str.lastIndexOf('"', idx - 1);
            parts.push({val: str.substring(idx + 1, oldIdx - 1), type: 'str'});
            idx -= 1;
        } else {
            while (idx > 0 && str[idx] == ' ') idx -= 1;
            if (str[idx] == ',' || str[idx] == ')' || str[idx] == '(') break;
            while (idx > 0 && str[idx] != ' ' && str[idx] != ',' && str[idx] != '(' && str[idx] != '+' && str[idx] != ')') idx -= 1;
            parts.push({val: str.substring(idx + 1, oldIdx + 1), type: 'var'});
        }
    }

    return parts.length == 0 ? [] : solveParts(parts, 0, new Set([newFile]));
}

const scanFile = (map, file, seen, foundFiles) => {
    const buffer = map.readFile(file);

    if (buffer) {
        const str = buffer.toString();

        if (file == '(listfile)') checkFiles(map, str.split(/\r\n/), seen, foundFiles);
        else {
            const separator = fileSeparator(file);
            for (const candidate of str.matchAll(fileRegex)) {
                const idx = str.lastIndexOf(separator, candidate.index);
                const newFile = str.substring(idx + 1, candidate.index + candidate[0].length).replace(/\.mdl$/, '.mdx').replace(/\\+/g, '\\');
                checkFile(map, newFile, seen, foundFiles);

                if ((file.endsWith('war3map.j') || file.endsWith('war3map.lua')) && foundFiles.has(newFile) == false) {
                    for (const option of solveAdditions(str, idx - 1, newFile)) {
                        checkFile(map, option, seen, foundFiles);
                    }
                }
            }

            if (file.endsWith('war3map.j') || file.endsWith('war3map.lua')) {
                
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