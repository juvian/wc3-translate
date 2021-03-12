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

}

function* mapIterator(map) {
  for (const [id, file] of Object.entries(filesToProcess)) {
    if (file.props) yield* objectIterator(map[file.name], file.name);
    else if (id == "war3map.w3i") yield* infoIterator(map[file.name], file.name);
    else yield* stringsIterator(map[file.name]);
  }
}

function serialize(type, output) {
  return type == "json" ? JSON.stringify(output, null, 2) : require('js-yaml').dump(output, {lineWidth: 9999999});
}

function deserialize(type, data) {
  return type == "json" ? JSON.parse(data) : require('js-yaml').load(data);
}

module.exports = {objectIterator, infoIterator, stringsIterator, mapIterator, serialize, deserialize}