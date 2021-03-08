const Translator = require('wc3maptranslator');
const fs = require('fs');

const toEntries = (data) => {
    for (const key of Object.keys(data.custom)) {
        const info = {}; 
        for (const modification of data.custom[key]) {
            info[modification.id] = info[modification.id] || [];
            info[modification.id].push(modification);
        }
        data.custom[key] = info;
    }
}

const filesToProcess = {
    "war3map.w3u": {
        name: "units",
        props: {"unam": "name", "upro": "properNames"},
        ignore: ["unsf"]
    },
    "war3map.wts": {
        name: "strings",
        toJson: Translator.Strings.warToJson,
        toWar: Translator.Strings.jsonToWar,
        afterParse: false,
        empty: {}
    },
    "war3map.w3a": {
        name: "abilities",
        props: {"aub1": "uberTip", "anam": "name", "atp1": "tip", "aret": "researchTip", "arut": "researchUberTip"},
        ignore: ["ansf", "arhk", "ahky", "auhk"]
    },
    "war3map.w3t": {
        name: "items",
        props: {"unam": "name", "utub": "uberTip", "utip": "tip", "ides": "description"}
    },
    "war3map.w3h": {
        name: "buffs",
        props: {"fnam": "name", "fube": "uberTip", "ftip": "tip"}
    },
    "war3map.w3q": {
        name: "upgrades",
        props: {"gnam": "name", "gube": "uberTip", "gtip": "tip"},
        ignore: ["gef1"]
    },
    "war3map.w3b": {
        name: "destructables",
        props: {"bnam": "name", "bube": "uberTip", "btip": "tip"}
    },
    "war3map.w3d": {
        name: "doodads",
        props: {"dnam": "name", "dube": "uberTip", "dtip": "tip"}
    },
    "war3map.w3i": {
        name: "info",
        toJson: Translator.Info.warToJson,
        toWar: Translator.Info.jsonToWar,
        afterParse: false,
        empty: {}
    },
    "war3map.j": {
        name: "script",
        toJson: (b) => b.toString(),
        toWar: (b) => b,
        afterParse: false,
        empty: {}
    }
}


for (const file of Object.values(filesToProcess)) {
    if (file.hasOwnProperty('afterParse') == false) file.afterParse = toEntries;
    if (file.hasOwnProperty('empty') == false) file.empty = {custom: {}, original: {}};
    if (file.hasOwnProperty('toJson') == false) file.toJson = Translator.Objects.warToJson.bind(null, file.name);
    if (file.hasOwnProperty('toWar') == false) file.toWar = Translator.Objects.jsonToWar.bind(null, file.name);
}

const quotesRegex = /"((?:\\.|[^"\\])*)"/g;
const isMPQ = (path) => path.endsWith('.w3x') || path.endsWith('.w3m') || path.endsWith('.mpq');
const isMap = (path) => !path.endsWith('.json') && !path.endsWith('.js') && fs.existsSync(path) && (isMPQ(path) || fs.lstatSync(path).isDirectory());

module.exports = {filesToProcess, quotesRegex, isMPQ, isMap};

