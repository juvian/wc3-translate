const Translator = require('wc3maptranslator');
const fs = require('fs');
const interface = require('./utils/gameInterface');

const toEntries = (data) => {
    for (const entries of Object.values(data)) {
        for (const key of Object.keys(entries)) {
            const info = {}; 
            for (const modification of entries[key]) {
                info[modification.id] = info[modification.id] || [];
                info[modification.id].push(modification);
            }
            entries[key] = info;
        }
    }
}

const filesToProcess = {
    "war3map.w3u": {
        name: "units",
        props: {"unam": "name", "upro": "properNames", "uawt": "awakenTip", "utip": "tip", "utub": "uberTip", "utpr": "reviveTip"},
        ignore: ["unsf"]
    },
    "war3map.w3a": {
        name: "abilities",
        props: {"aub1": "uberTip", "anam": "name", "atp1": "tip", "aret": "researchTip", "arut": "researchUberTip", "aut1": "unTip", "auu1": "unUberTip"},
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
        props: {"gnam": "name", "gub1": "uberTip", "gtp1": "tip"},
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
        toJson: (b) => b,
        toWar: (b) => b,
        afterParse: false,
        empty: ""
    },
    "war3mapSkin.txt": {
        name: "interface",
        toJson: interface.toJson,
        toWar: interface.toWar,
        afterParse: false,
        empty: {},
        ignore: ["Terrain", "WorldEditMisc", "WorldEditStrings", "CustomSkin"]
    },
    "war3map.wts": {
        name: "strings",
        toJson: Translator.Strings.warToJson,
        toWar: Translator.Strings.jsonToWar,
        afterParse: false,
        empty: {}
    },
}


for (const file of Object.values(filesToProcess)) {
    if (file.hasOwnProperty('afterParse') == false) file.afterParse = toEntries;
    if (file.hasOwnProperty('empty') == false) file.empty = {custom: {}, original: {}};
    if (file.hasOwnProperty('toJson') == false) file.toJson = Translator.Objects.warToJson.bind(null, file.name);
    if (file.hasOwnProperty('toWar') == false) file.toWar = Translator.Objects.jsonToWar.bind(null, file.name);
}

module.exports = {filesToProcess};

