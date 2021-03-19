const toJson = (buffer) => {
    const result = {};
    let currentCategory;
    let currentToken;
    let currentString;

    let parsingStr = false;
    
    for (let line of buffer.toString().split(/[\r\n]+/)) {
        if (!parsingStr) {
            if (line.startsWith('[')) {
                currentCategory = line.split('[')[1].split(']')[0];
                result[currentCategory] = {};
            } else {
                const idx = line.indexOf('=');
                currentToken = line.substring(0, idx).trim();
                line = line.substring(idx + 1).trim();
                
                if (line.startsWith('"')) {
                    parsingStr = true;
                } else {
                    result[currentCategory][currentToken] = line;
                }
            }
        }

        if (parsingStr) {
            currentString += line;
            if (currentString.trim().endsWith('"')) {
                parsingStr = false;
                result[currentCategory][currentToken] = currentString;
                currentString = "";
            }
        }
    }

    return result;
}

const toWar = (interface) => {
    const output = [];

    for (const [key, obj] of Object.entries(interface)) {
        output.push('[' + key + ']');
        output.push.apply(output, Object.entries(obj).map(([prop, str]) => `${prop}=${str}`))
        output.push('\n');
    }

    return output.join('\n');
}

module.exports = {toJson, toWar};