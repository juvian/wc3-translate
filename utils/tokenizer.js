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

const koreanRegex = /[\u3131-\uea60]/;

module.exports = {tokenize, isColorCode, isNumber, koreanRegex}