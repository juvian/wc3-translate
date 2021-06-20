const fs = require('fs');

const code = fs.readFileSync('../data/war3map.j');

const insertCodeAfter = 'function main takes nothing returns nothing';
const insertCodeAfterBuffer = Buffer.from(insertCodeAfter);

const codeToInsert = `\nlocal integer s = 4`;

const idx = code.indexOf(insertCodeAfterBuffer);

if (idx == -1) throw "code not found";

const newCode = Buffer.concat([code.slice(0, idx), insertCodeAfterBuffer, Buffer.from(codeToInsert), code.slice(idx + insertCodeAfterBuffer.length)]);

fs.writeFileSync('../data/war3map_edited.j', newCode);


