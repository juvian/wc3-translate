module.exports = class Processor {
    constructor(data, maps, props, toIgnore) {
        this.data = data;
        this.maps = maps;
        this.props = props;
        this.toIgnore = toIgnore || [];
    }

    process() {
        this.results = {};

        for (const [id, data] of Object.entries(this.data[0])) {
            for (const [prop, name] of Object.entries(this.props)) {
                this.set(id, prop, name);
            }

            //process in order to remove from strings but dont save in output
            for (const prop of this.toIgnore) {
                this.set(id, prop, null);
            }
        }

        return this.results;
    }

    //for a certain id such as itemId and prop such as utib, check if it exists in maps and set result to output if name is set
    set(id, prop, name) {
        for (const [idx, data] of Object.entries(this.data)) {
            if (data.hasOwnProperty(id) && data[id].hasOwnProperty(prop)) {
                for (const [level, modification] of Object.entries(data[id][prop])) {
                    if (modification.value != null) {
                        let val = this.maps[idx].getString(modification.value);
                        
                        if (name) {
                            this.results[id] = this.results[id] || {};
                            this.results[id][name] = this.results[id][name] || [];
                            this.results[id][name][level] = this.results[id][name][level] || {};
                            this.results[id][name][level][this.maps[idx].name] = val ? val.replace(/\r\n/g, '\n') : val;
                        }
                    }
                }
            }
        }
    }
}