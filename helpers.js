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

    window.qs = function(selector, scope) {
        return (scope || document).querySelector(selector);
    };

    window.qsa = function(selector, scope) {
        return (scope || document).querySelectorAll(selector);
    };

    window.$on = function(target, type, callback, useCapture) {
        target.addEventListener(type, callback, !!useCapture);
        return function() {
            $off(target, type, callback);
        };
    };

    window.$off = function(target, type, callback) {
        target.removeEventListener(type, callback);
    };

    window.$delegate = function(target, selector, type, handler) {
        var useCapture = type === "blur" || type === "focus";
        var listener = function(event) {
            var elements = qsa(selector, target);
            if (Array.prototype.indexOf.call(elements, event.target) >= 0) {
                handler.call(event.target, event);
            }
        };
        $on(target, type, listener, useCapture);
        return function() {
            $off(target, type, listener);
        };
    };

    NodeList.prototype.forEach = Array.prototype.forEach;
    NodeList.prototype.map = Array.prototype.map;

    function empty(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    window.empty = empty;
}());
