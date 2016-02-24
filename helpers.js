(function() {
    "use strict";

    var LunchUX = window.LunchUX = (window.LunchUX || {});

    window.extend = function(dest, src) {
        for (var k in src) if (src.hasOwnProperty(k)) dest[k] = src[k];
        return dest;
    };

    LunchUX.Event = function () {};

    LunchUX.Event.prototype.bind = function(type, handler) {
        var subscribers = (this.subscribers || {});
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
}());
