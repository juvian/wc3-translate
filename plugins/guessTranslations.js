const {mapIterator} = require('../utils/utils');

const afterParse = (output) => {
    for (const {data} of mapIterator(output)) {
        if (data.changed && !data.newTranslated && data.oldUntranslated != null) {
            //only numbers changed or tooltip color changed?
            const regex = /(\|cff[0-9A-Fa-f]{6}|\d+\.?\d*)/gi
            if (data.newUntranslated.replace(regex) == data.oldUntranslated.replace(regex)) {
                const n1 = data.newUntranslated.match(regex) || [];
                const n2 = data.oldUntranslated.match(regex) || [];
                const n3 = data.oldTranslated.match(regex) || [];

                const used = new Set();

                if (n1.length == n2.length) {
                    for (let i = 0; i < n1.length; i++) {
                        let idx = -1;

                        while(true) {
                            idx = n3.indexOf(n2[i], idx + 1);
                            if (idx == -1 || !used.has(idx)) break;
                        }

                        if (idx != -1) {
                            n3[idx] = n1[i];
                            used.add(idx);
                        }
                    }
                    let idx = 0;
                    data.newTranslated = data.oldTranslated.replace(regex, () => n3[idx++]);
                    data.numberGuessed = true;
                }
            }
        }
    }
}

module.exports = {afterParse};