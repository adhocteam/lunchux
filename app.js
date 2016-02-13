(function() {
    "use strict";

    window.qs = function(selector, scope) {
        return (scope || document).querySelector(selector);
    };

    window.qsa = function(selector, scope) {
        return (scope || document).querySelectorAll(selector);
    };

    window.$on = function(target, type, callback, useCapture) {
        target.addEventListener(type, callback, !!useCapture);
    };

    NodeList.prototype.forEach = Array.prototype.forEach;

    function Store(name) {
        this.name = name;

        if (!localStorage[name]) {
            var data = {
                household: {
                    numKids: 0,
                    numAdults: 0,
                    people: []
                }
            };
            localStorage[name] = JSON.stringify(data);
        }
    }

    Store.prototype.all = function() {
        return JSON.parse(localStorage[this.name]).household;
    };

    Store.prototype.save = function(household) {
        var data = JSON.parse(localStorage[this.name]);
        data.household = household;
        localStorage[this.name] = JSON.stringify(data);
    };

    function Model(store) {
        this.store = store;
    }

    var AgeClass = {
        child: 1,
        adult: 2
    };

    Model.prototype.add = function(name, ageClass, isStudent, isFosterChild, isHomeless) {
        var person = {
            name: name,
            ageClass: ageClass,
            isStudent: isStudent,
            isFosterChild: isFosterChild,
            isHomeless: isHomeless
        };
        var household = this.store.all();
        household.people.push(person);
        this.store.save(household);
    };

    Model.prototype.updateHouseholdSize = function(numKids, numAdults) {
        var household = this.store.all();
        household.numKids = numKids;
        household.numAdults = numAdults;
        household.people = [];
        this.store.save(household);
    };

    Model.prototype.all = function() {
        return this.store.all();
    };

    function View() {
        this.$hhSizeFwdBtn = qs("#household-size .button.fwd");
        this.$numKids = qs("[name=num-kids]");
        this.$numAdults = qs("[name=num-adults]");
    }

    View.prototype.bind = function(event, handler) {
        var self = this;
        switch (event) {
        case "updateHouseholdSize":
            $on(self.$hhSizeFwdBtn, "click", function(event) {
                var numKids = parseInt(self.$numKids.value, 10);
                var numAdults = parseInt(self.$numAdults.value, 10);
                handler(numKids, numAdults);
            }, false);
        }
    };

    View.prototype.render = function(cmd, param) {
        var self = this;
        var viewCmds = {
            setHouseholdSize: function() {
                self.$numKids.value = param.numKids;
                self.$numAdults.value = param.numAdults;
            }
        };
        viewCmds[cmd]();
    };

    function Controller(view, model) {
        this.view = view;
        this.model = model;
        var self = this;

        this.view.bind("updateHouseholdSize", function(numKids, numAdults) {
            self.updateHouseholdSize(numKids, numAdults);
        });

        this.view.render("setHouseholdSize", this.model.all());
    }

    Controller.prototype.updateHouseholdSize = function(numKids, numAdults) {
        this.model.updateHouseholdSize(numKids, numAdults);
    };

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

    $on(window, "DOMContentLoaded", function() {
        var store = new Store("lunchux");
        var model = new Model(store);
        var view = new View();
        var controller = new Controller(view, model);

        function setView() {
            var id = window.location.hash ? window.location.hash.slice(1) : "get-started";
            controller.setView(id);
        }

        $on(window, "hashchange", setView);
        setView();
    }, false);
}());
