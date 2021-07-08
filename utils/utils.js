const {filesToProcess} = require('../config');

function* objectIterator(objects, type) {
  for (const [id, parent] of Object.entries(objects || {})) {
    for (const [prop, levels] of Object.entries(parent)) {
      for (const data of levels) {
        yield {data, id, type, parent};
      }
    }
  }  
}

function* stringsIterator(strings, type) {
  for (const [id, data] of Object.entries(strings || {})) {
    yield {data, id, type}
  }
}

function* infoIterator(info) {
  if (info == null || Object.keys(info).length == 0 || info.players.length == 0) return;
  
  for (const id of ["name", "author", "description", "recommendedPlayers"]) {
    yield {data: info[id], id, type: "info"};
  }

  for (const [idx, player] of Object.entries(info.players)) {
    for (const [id, data] of Object.entries(player)) {
      yield {data, id, type: "info", parent: player};
    }
  }

  for (const [idx, force] of Object.entries(info.forces)) {
    for (const [id, data] of Object.entries(force)) {
      yield {data, id, type: "info", parent: force};
    }
  }

  for (const parent of ["loadingScreen", "prologue"]) {
    for (const [id, data] of Object.entries(info[parent])) {
      yield {data, id, type: "info", parent: info[parent]};
    }
  }
}

function* interfaceIterator(interface) {
  for (const [parentId, obj] of Object.entries(interface || {})) {
    for (const [id, data] of Object.entries(obj)) {
      yield {data, id, type: "interface", parent: obj, parentId};
    }
  }
}

function* mapIterator(map) {
  for (const [id, file] of Object.entries(filesToProcess)) {
    if (file.props) yield* objectIterator(map[file.name], file.name);
    else if (id == "war3map.w3i") yield* infoIterator(map[file.name], file.name);
    else if (id == "war3mapSkin.txt") yield* interfaceIterator(map[file.name]);
    else yield* stringsIterator(map[file.name]);
  }
}

function serialize(type, output) {
  return type == "json" ? JSON.stringify(output, null, 2) : require('js-yaml').dump(output, {lineWidth: 9999999});
}

function deserialize(type, data) {
  return type == "json" ? JSON.parse(data) : require('js-yaml').load(data);
}

const replaceHex = (line) => line.replace(/\$[0-9A-F]+/gi, function(m) {
  return parseInt(m.slice(1), 16);
});

module.exports = {objectIterator, infoIterator, stringsIterator, mapIterator, interfaceIterator, serialize, deserialize, replaceHex}