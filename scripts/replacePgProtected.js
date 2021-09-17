//replaces fromString in map and puts toString instead. Uses buffer to avoid breaking utf-8 protected maps

module.exports = function(buffer, fromString = 'EVENT_PLAYER_UNIT_DAMAGED', toString = 'EVENT_PLAYER_UNIT_DAMAGED_CUSTOM') {
    let newScript = [];
    let lastIdx = 0;
    let idx = buffer.indexOf(Buffer.from(fromString));
    
    while (idx != -1) {
        newScript.push(buffer.slice(lastIdx, idx));
        newScript.push(Buffer.from(toString));
        lastIdx = idx + Buffer.from(fromString).length;
        idx = buffer.indexOf(Buffer.from(fromString), lastIdx);
    }

    if (newScript.length) {
        newScript.push(buffer.slice(lastIdx));
        buffer = Buffer.concat(newScript);
        newScript = [];
        lastIdx = 0;
    }

    return buffer;
}
