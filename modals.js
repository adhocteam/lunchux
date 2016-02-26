(function() {
    "use strict";

    var LunchUX = LunchUX || {};

    LunchUX.Modals = function(scopeSelector) {
        var scope = qs(scopeSelector);

        $delegate(scope, ".modal-state", "change", this.onChange.bind(this));

        $delegate(scope, ".modal-fade-screen, .modal-close", "click", function(event) {
            var trigger = qs(".modal-state");
            trigger.checked = false;
            this.onChange({target: trigger}); // :D
        }.bind(this));

        $delegate(scope, ".modal-inner", function(event) {
            event.stopPropagation();
        });
    };

    LunchUX.Modals.prototype.onChange = function(event) {
        var el = event.target;
        if (el.checked) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
    };

    $on(document, "DOMContentLoaded", function() {
        var modals = new LunchUX.Modals("main");
    });
}());
