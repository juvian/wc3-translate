const Translator = require('wc3maptranslator');
const fs = require('fs');
const interface = require('./utils/gameInterface');

const toEntries = (data, name) => {
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
    "units": {
        props: {"unam": "name", "upro": "properNames", "uawt": "awakenTip", "utip": "tip", "utub": "uberTip", "utpr": "reviveTip"},
        ignore: ["unsf"],
        paths: ["war3map.w3u", "war3campaign.w3u"]
    },
    "abilities": {
        props: {"aub1": "uberTip", "anam": "name", "atp1": "tip", "aret": "researchTip", "arut": "researchUberTip", "aut1": "unTip", "auu1": "unUberTip"},
        ignore: ["ansf", "arhk", "ahky", "auhk"],
        paths: ["war3map.w3a", "war3campaign.w3a"]
    },
    "items": {
        name: "items",
        props: {"unam": "name", "utub": "uberTip", "utip": "tip", "ides": "description"},
        paths: ["war3map.w3t", "war3campaign.w3t"]
    },
    "buffs": {
        name: "buffs",
        props: {"fnam": "name", "fube": "uberTip", "ftip": "tip"},
        paths: ["war3map.w3h", "war3campaign.w3h"]
    },
    "upgrades": {
        props: {"gnam": "name", "gub1": "uberTip", "gtp1": "tip"},
        ignore: ["gef1"],
        paths: ["war3map.w3q", "war3campaign.w3q"]
    },
    "destructables": {
        props: {"bnam": "name", "bube": "uberTip", "btip": "tip"},
        paths: ["war3map.w3b", "war3campaign.w3b"]
    },
    "doodads": {
        props: {"dnam": "name", "dube": "uberTip", "dtip": "tip"},
        paths: ["war3map.w3d", "war3campaign.w3d"]
    },
    "info": {
        toJson: Translator.Info.warToJson,
        toWar: Translator.Info.jsonToWar,
        afterParse: false,
        empty: {},
        paths: ["war3map.w3i", "war3campaign.w3i"]
    },
    "script": {
        toJson: (b) => b,
        toWar: (b) => b,
        afterParse: false,
        empty: "",
        paths: ["war3map.j", "scripts\\war3map.j", "war3map.lua", "scripts\\war3map.lua"]
    },
    "interface": {
        toJson: interface.toJson,
        toWar: interface.toWar,
        afterParse: false,
        empty: {},
        ignore: ["Terrain", "WorldEditMisc", "WorldEditStrings", "CustomSkin"],
        paths: ["war3mapSkin.txt", "war3campaignSkin.txt"]
    },
    "strings": {
        toJson: Translator.Strings.warToJson,
        toWar: Translator.Strings.jsonToWar,
        afterParse: false,
        empty: {},
        paths: ["war3map.wts", "war3campaign.wts"]
    },
    "commandStrings": {
        toJson: interface.toJson,
        toWar: interface.toWar,
        afterParse: false,
        empty: {},
        ignore: [],
        paths: ["units\\CommandStrings.txt"]
    }
}

const pathsToName = {};

for (const name of Object.keys(filesToProcess)) {
    for (const path of filesToProcess[name].paths) {
        pathsToName[path] = name;
    }
}

for (const [name, file] of Object.entries(filesToProcess)) {
    if (file.hasOwnProperty('afterParse') == false) file.afterParse = toEntries;
    if (file.hasOwnProperty('empty') == false) file.empty = {custom: {}, original: {}};
    if (file.hasOwnProperty('toJson') == false) file.toJson = Translator.Objects.warToJson.bind(null, name);
    if (file.hasOwnProperty('toWar') == false) file.toWar = Translator.Objects.jsonToWar.bind(null, name);
}

module.exports = {filesToProcess, pathsToName};

