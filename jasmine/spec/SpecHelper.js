function InMemoryStore(name) {
    this.name = name;
    this.store = {};
}

InMemoryStore.prototype.load = function() {
    return JSON.parse(this.store[this.name] || null);
};

InMemoryStore.prototype.save = function(data) {
    this.store[this.name] = JSON.stringify(data);
};
