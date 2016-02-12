(function() {
    "use strict";

    window.qs = function(selector, scope) {
        return (scope || document).querySelector(selector);
    };

    window.qsa = function(selector, scope) {
        return (scope || document).querySelectorAll(selector);
    };

    NodeList.prototype.forEach = Array.prototype.forEach;

    function setView() {
        qsa(".view").forEach(function(view) {
            view.style.display = 'none';
        });
        qs(document.location.hash || "#get-started").style.display = 'block';
    }

    addEventListener("hashchange", setView);
    addEventListener("load", setView);
}());
