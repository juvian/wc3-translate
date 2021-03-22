const isColorCode = (token) => {
    return token.match(/\|cff[0-9a-f]{6}/) != null;
}

const isNumber = (token) => {
    return token.match(/\d+\.?\d*/) != null;
}

const tokenize = (string) => {
    let result = [];

    while (string.length) {
        const token = string.match(/\|cff[0-9a-f]{6}|\d+\.?\d*|\[|\]|\(|\)|\|r/i);
        if (token != null) {
            if (token.index > 0) result.push({string: string.substring(0, token.index)});
            string = string.substring(token.index + token[0].length);
            result.push({token: token[0]});
        } else break;
    }

    if (string.length) result.push({string});

    return result;
}

const koreanRegex = /[\u3131-\uea60]/;

module.exports = {tokenize, isColorCode, isNumber, koreanRegex}