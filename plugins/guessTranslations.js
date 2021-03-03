const {filesToProcess} = require('../config');
const {objectIterator} = require('./utils');

const withProps = Object.values(filesToProcess).filter(v => v.props).map(v => v.name);

const afterParse = (output) => {
    const processed = new WeakSet();

    for (const [obj, prop] of objectIterator(output)) {
        if (obj.changed && !processed.has(obj)) {
            processed.add(obj);
            
            //only numbers changed
            if (obj.newUntranslated.replace(/\d+/g) == obj.oldUntranslated.replace(/\d+/g)) {
                const n1 = obj.newUntranslated.match(/\d+/g) || [];
                const n2 = obj.oldUntranslated.match(/\d+/g) || [];
                const n3 = obj.oldTranslated.split(/\d+/g) || [];

                const used = new Set();

                if (n1.length == n2.length) {
                    for (let i = 0; i < n1.length; i++) {
                        let idx = 0;

                        while(idx != -1 && used.has(idx)) {
                            idx = n3.indexOf(n2[i], idx);
                        }

                        if (idx != -1) {
                            n3[idx] = n1[i];
                            used.add(idx);
                        }
                    }
                    obj.newTranslated = n3.join(''); 
                }
            }
        }
    }
}

module.exports = {afterParse};