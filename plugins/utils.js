function* objectIterator(obj, path = '', s = new WeakSet()) {
  if (!obj || s.has(obj)) return;
  s.add(obj);
  for (let key of Object.keys(obj)) {
      let val = obj[key];
      yield [obj, key, path];

      if (typeof val === 'object') {
          yield* objectIterator(val, path + '.' + key, s);
      }
  }
}


module.exports = {objectIterator}