(function() {
    "use strict";

    window.qs = function(selector, scope) {
        return (scope || document).querySelector(selector);
    };

    window.qsa = function(selector, scope) {
        return (scope || document).querySelectorAll(selector);
    };

    NodeList.prototype.forEach = Array.prototype.forEach;

    function Controller() {}

    Controller.prototype.setView = function(id) {
        this.hideAll();
        qs("#" + id).classList.add("show");
        qs("#" + id).classList.remove("hide");
    };

    Controller.prototype.hideAll = function() {
        qsa(".screen").forEach(function(el) {
            el.classList.add("hide");
            el.classList.remove("show");
        });
    };

    var controller = new Controller();

    function setView() {
        var id = window.location.hash ? window.location.hash.slice(1) : "get-started";
        controller.setView(id);
    }

    addEventListener("hashchange", setView);
    addEventListener("load", setView);
}());
