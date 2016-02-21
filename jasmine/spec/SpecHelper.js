var LunchUX = {};

LunchUX.Event = function () {}

LunchUX.Event.prototype.bind = function(type, handler) {
    var subscribers = (this.subscribers || {})
    var list = subscribers[type] || [];
    list.push(handler);
    subscribers[type] = list;
    this.subscribers = subscribers;
};

LunchUX.Event.prototype.notify = function(type) {
    var args = Array.prototype.slice.call(arguments, 1);
    var subscribers = this.subscribers || {};
    (subscribers[type] || []).forEach(function(handler) {
        handler.apply(this, args);
    });
};

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