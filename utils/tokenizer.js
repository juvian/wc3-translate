const isColorCode = (token) => {
    return token.match(/\|c[0-9a-f]{8}/i) != null;
}

const isNumber = (token) => {
    return token.match(/^\d+\.?\d*$/) != null;
}

const tokenize = (string) => {
    let result = [];

    while (string.length) {
        const token = string.match(/\|c[0-9a-f]{8}|\d+\.?\d*|\[|\]|\(|\)|\|r/i);
        if (token != null) {
            if (token.index > 0) result.push({string: string.substring(0, token.index)});
            string = string.substring(token.index + token[0].length);
            result.push({token: token[0]});
        } else break;
    }

    if (string.length) result.push({string});

    return result;
}

function *iterateBufferStrings(buf) {
    let idx = buf.indexOf(34);
    let beganAt;

    while (idx != -1) {
        if (beganAt == null) beganAt = idx;
        else {
            let backslashes = 0;
            while (idx - backslashes - 1 >= 0 && buf[idx - backslashes - 1] == 92) backslashes++;

            if (backslashes % 2 == 0) { // if it is not \"
                yield {str: buf.slice(beganAt + 1, idx).toString(), beganAt, idx};
                beganAt = null
            } 
        }

        idx = buf.indexOf(34, idx + 1);
    }
}

const koreanRegex = /[\u3131-\uea60]/;
const quotesRegex = /"((?:\\.|[^"\\])*)"/g;
const fileRegex = /\.(blp|mdx|mp3|mdl|tga|dds|wav|slk|txt)/g

module.exports = {tokenize, isColorCode, isNumber, koreanRegex, quotesRegex, fileRegex, iterateBufferStrings}