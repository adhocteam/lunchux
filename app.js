(function() {
    "use strict";

    window.LunchUX = window.LunchUX || {};

    // helpers

    // model storage -- uses browser's localStorage

    function Store(name) {
        this.name = name;
    }

    Store.prototype.load = function() {
        return JSON.parse(localStorage[this.name] || null);
    };

    Store.prototype.save = function(data) {
        localStorage[this.name] = JSON.stringify(data);
    };

    Store.prototype.reset = function() {
        delete localStorage[this.name];
    };

    // views

    function templateFrom(selector) {
        var templateEl = qs(selector);
        if (!templateEl) throw new Error("couldn't find template from selector " + selector);
        return _.template(templateEl.innerHTML);
    }

    function GetStartedView(options) {
        this.el = qs("#get-started");
        this.unloaders = [];

        var radioBtns = qsa("[name=over-18]", this.el);
        var continueBtn = qs("form button", this.el);
        radioBtns.forEach(function(btn) {
            var unloader = $on(btn, "change", function(event) {
                if (this.anyChecked()) {
                    continueBtn.disabled = false;
                } else {
                    continueBtn.disabled = true;
                }
            }.bind(this));
            this.unloaders.push(unloader);
        }.bind(this));
    }

    function identity(x) { return x; }

    GetStartedView.prototype.anyChecked = function() {
        var radioBtns = qsa("[name=over-18]", this.el);
        return radioBtns.map(function(el) { return el.checked; }).filter(identity).length > 0;
    };

    function getHashFromURL(url) {
        var a = document.createElement("a");
        a.href = url;
        return a.hash;
    }

    GetStartedView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleContinueBtnClick":
            var form = qs("form", this.el);
            var unloader = $on(form, "submit", function(event) {
                event.preventDefault();
                var form = event.target;
                var hash = getHashFromURL(form.action);
                var nextIfYes = hash.slice(1);
                var nextScreenId;
                for (var i = 0; i < form.elements.length; i++) {
                    var el = form.elements[i];
                    if (el.type === "radio" && el.name === "over-18") {
                        if (el.checked) {
                            nextScreenId = el.value === "yes" ? nextIfYes : el.getAttribute("data-next-screen");
                            break;
                        }
                    }
                }
                handler({nextScreenId: nextScreenId});
            }.bind(this));
            this.unloaders.push(unloader);
            break;
        }
    };

    GetStartedView.prototype.render = function() {
        return this;
    };

    GetStartedView.prototype.unload = function() {
        this.unloaders.forEach(function(unload) {
            unload();
        });
    };

    function PersonView(options) {
        this.el = document.createElement("div");
        this.template = templateFrom("#person-template");
        this.model = options.model; // app-wide model
        this.person = options.person;
    }

    PersonView.prototype.render = function() {
        var displayName = this.person.name ? this.person.name : this.person.ageClass === LunchUX.AgeClass.child ? "Kid (needs name!)" : "Adult (needs name!)";
        this.el.innerHTML = this.template({person: this.person, displayName: displayName});
        return this;
    };

    PersonView.prototype.bind = function(event, handler) {};

    function KidPersonView(options) {
        this.el = options.el;
        this.model = options.model;
        this.person = options.person;
        this.template = templateFrom("#kid-person-form-template");

        this.model.on("toggleDetailsForm", function(view, show) {
            if (this === view) {
                if (show) {
                    this.showForm();
                } else {
                    this.hideForm();
                }
            }
        }.bind(this));

        this.model.on("updatedPerson", function(options) {
            if (options.person.id === this.person.id) {
                this.render();
            }
        }.bind(this));
    }

    KidPersonView.prototype.showForm = function() {
        qs(".details-form", this.el).style.display = "block";
    };

    KidPersonView.prototype.hideForm = function() {
        qs(".details-form", this.el).style.display = "none";
    };

    KidPersonView.prototype.render = function() {
        var person = this.person;
        var personView = new PersonView({person: person, model: this.model});
        empty(this.el);
        this.el.appendChild(personView.render().el);
        var li = qs("li", this.el);

        function tribool(prop, test) {
            if (prop === undefined || prop === null) {
                return "";
            }
            return (test === false && prop === false) || (test === true && prop === true) ? "checked" : "";
        }

        var form = document.createElement("div");
        li.appendChild(form);
        form.innerHTML = this.template({person: person, tribool: tribool});

        return this;
    };

    function serializeForm(form) {
        var data = [];
        var checkboxes = {};
        for (var i = 0; i < form.elements.length; i++) {
            var el = form.elements[i];
            if (el.name === "") {
                continue;
            }
            switch (el.type) {
            case "text":
            case "number":
            case "tel":
            case "email":
                data.push({name: el.name, value: el.value});
                break;
            case "radio":
                if (el.checked) {
                    data.push({name: el.name, value: el.value});
                }
                break;
            case "checkbox":
                if (el.checked) {
                    var values = checkboxes[el.name] || [];
                    values.push(el.value);
                    checkboxes[el.name] = values;
                }
                break;
            default:
                throw new Error("got unexpected form element type " + type);
            }
        }
        for (var key in checkboxes) {
            if (checkboxes.hasOwnProperty(key)) {
                var values = checkboxes[key];
                data.push({name: key, value: values});
            }
        }
        return data;
    }

    var booleans = [
        "isStudent",
        "isHomeless",
        "isFosterChild"
    ];

    function updateFromForm(obj, params) {
        for (var i = 0; i < params.length; i++) {
            var param = params[i];
            var prop = dashToCamel(param.name);
            if (booleans.indexOf(prop) >= 0) {
                obj[prop] = param.value === "yes";
            } else {
                obj[prop] = param.value;
            }
        }
    }

    KidPersonView.prototype.bind = function(event, handler) {
        switch (event) {
        case "toggleDetailsForm":
            $delegate(this.el, ".actions", "click", function(event) {
                handler(this);
            }.bind(this));
            break;
        case "handleSaveBtnClick":
            $delegate(this.el, "form", "submit", function(event) {
                event.preventDefault();
                var data = serializeForm(event.target);
                var person = this.person;
                updateFromForm(person, data);
                handler({view: this, person: person});
            }.bind(this));
            break;
        case "handleDeleteBtnClick":
            $delegate(this.el, ".remove", "click", function(event) {
                event.preventDefault();
                handler(this.person);
            }.bind(this));
            break;
        }
    };

    KidPersonView.prototype.unload = function() {
    };

    function PeopleListView(options) {
        this.personView = (options.personView || PersonView);
        this.el = null;
        this.model = options.model;
        this.peopleMethod = options.peopleMethod || function() { return this.all().people; };
        this.childViews = [];

        this.events = [
            "toggleDetailsForm",
            "handleSaveBtnClick",
            "handleDeleteBtnClick",
            "handleIncomeAmountInput",
            "handleIncomeFrequencyChange"
        ];

        this.model.on("addedPerson", this.addOne.bind(this));
        this.model.on("deletedPerson", this.deleteOne.bind(this));
    }

    PeopleListView.prototype.addOne = function(person, options) {
        var div = document.createElement("div");
        var personView = new this.personView({person: person, model: this.model, el: div});
        this.el.appendChild(personView.render().el);
        this.events.forEach(function(event) {
            personView.bind(event, function() {
                if (this[event]) {
                    this[event].apply(this, Array.prototype.slice.call(arguments));
                }
            }.bind(this));
        }.bind(this));
        this.childViews.push(personView);

        options = options || {};
        if (options.expand) {
            this.model.toggleDetailsForm(personView);
        }
    };

    PeopleListView.prototype.deleteOne = function(person) {
        var index, view;
        for (var i = 0; i < this.childViews.length; i++) {
            view = this.childViews[i];
            if (view.person === person) {
                index = i;
                break;
            }
        }
        this.el.removeChild(view.el);
        this.childViews.splice(index, 1);
        view.unload();
    };

    PeopleListView.prototype.render = function() {
        this.el = document.createElement("div");
        var people = this.peopleMethod.call(this.model);
        var expandedFirst = false;
        people.forEach(function(person) {
            var options = {expand: false};
            if (person.name === "" && !expandedFirst) {
                options.expand = true;
                expandedFirst = true;
            }
            this.addOne(person, options);
        }.bind(this));
        return this;
    };

    PeopleListView.prototype.bind = function(event, handler) {
        if (this.events.indexOf(event) === -1) {
            throw new Error("tried to bind an unknown event for this view: '" + event + "'");
        }
        this[event] = handler;
    };

    function KidListView(options) {
        this.listEl = qs("#kids .person-list");
        this.numPeopleEl = qs("#kids .num-people");
        this.addPersonEl = qs("#kids .add-person");
        this.listenersToUnload = [];
        this.peopleListView = null;
        this.model = options.model;

        this.model.on("addedPerson", this.setNumPeople.bind(this));
        this.model.on("deletedPerson", this.setNumPeople.bind(this));
    }

    KidListView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleAddPersonClick":
            var unload = $on(qs(".actions", this.addPersonEl), "click", function(event) {
                // TODO: move details to controller/handler
                handler({ageClass: LunchUX.AgeClass.child});
            }.bind(this));
            this.listenersToUnload.push(unload);
            break;
        default:
            this.peopleListView.bind(event, handler);
        }
    };

    KidListView.prototype.render = function() {
        var peopleListView = this.peopleListView = new PeopleListView({personView: KidPersonView, model: this.model, peopleMethod: this.model.kids});
        empty(this.listEl);
        this.listEl.appendChild(peopleListView.render().el);
        this.setNumPeople();
    };

    KidListView.prototype.setNumPeople = function() {
        this.numPeopleEl.innerHTML = pluralize(this.model.kids().length, "kid");
    };

    KidListView.prototype.unload = function() {
        this.listenersToUnload.forEach(function(unload) {
            unload();
        });
    };

    function AdultPersonView(options) {
        this.el = options.el;
        this.model = options.model;
        this.person = options.person;
        this.template = templateFrom("#adult-person-form-template");

        this.model.on("toggleDetailsForm", function(view, show) {
            if (this === view) {
                if (show) {
                    this.showForm();
                } else {
                    this.hideForm();
                }
            }
        }.bind(this));

        this.model.on("updatedPerson", function(options) {
            if (options.person.id === this.person.id) {
                this.render();
            }
        }.bind(this));
    }

    AdultPersonView.prototype.showForm = function() {
        qs(".details-form", this.el).style.display = "block";
    };

    AdultPersonView.prototype.hideForm = function() {
        qs(".details-form", this.el).style.display = "none";
    };

    AdultPersonView.prototype.render = function() {
        var person = this.person;
        var personView = new PersonView({person: person, model: this.model});
        empty(this.el);
        this.el.appendChild(personView.render().el);
        var li = qs("li", this.el);
        var form = document.createElement("div");
        li.appendChild(form);
        form.innerHTML = this.template({person: this.person});
        return this;
    };

    AdultPersonView.prototype.bind = function(event, handler) {
        switch (event) {
        case "toggleDetailsForm":
            $delegate(this.el, ".actions", "click", function(event) {
                handler(this);
            }.bind(this));
            break;
        case "handleSaveBtnClick":
            $delegate(this.el, "form", "submit", function(event) {
                event.preventDefault();
                var data = serializeForm(event.target);
                var person = this.person;
                updateFromForm(person, data);
                handler({view: this, person: person});
            }.bind(this));
            break;
        case "handleDeleteBtnClick":
            $delegate(this.el, ".remove", "click", function(event) {
                event.preventDefault();
                handler(this.person);
            }.bind(this));
            break;
        }
    };

    AdultPersonView.prototype.unload = function() {
    };

    function AdultListView(options) {
        this.el = qs("#adults");
        this.listEl = qs("#adults .person-list");
        this.numPeopleEl = qs("#adults .num-people");
        this.ssnFormEl = qs("#adults .ssn-form");
        this.last4SSNEl = qs("[name=last-4-ssn]", this.el);
        this.peopleListView = null;
        this.model = options.model;
        this.unloaders = [];

        this.model.on("addedPerson", this.setNumPeople.bind(this));
        this.model.on("deletedPerson", this.setNumPeople.bind(this));

        var radioBtns = qsa("[name=has-ssn]", this.el);
        radioBtns.forEach(function(btn) {
            var unload = $on(btn, "change", function(event) {
                var el = event.target;
                this.toggleSSNDisplay(el.value === "yes" && el.checked);
            }.bind(this));
            this.unloaders.push(unload);
        }.bind(this));

        var unload = $on(this.last4SSNEl, "input", function(event) {
            var radio = qs("[name=has-ssn]:checked");
            if (radio) {
                if (radio.value === "yes" && this.last4SSNEl.value === "") {
                    this.last4SSNEl.setCustomValidity("Please supply the last 4 digits of the SSN.");
                } else {
                    this.last4SSNEl.setCustomValidity("");
                }
            }
        }.bind(this));
    }

    AdultListView.prototype.toggleSSNDisplay = function(isDisplayed) {
        var el = qs(".last-4-ssn-control", this.el);
        if (isDisplayed) {
            el.style.display = "block";
            this.last4SSNEl.setCustomValidity("Please supply the last 4 digits of the SSN.");
        } else {
            el.style.display = "none";
            this.last4SSNEl.setCustomValidity("");
        }
    };

    AdultListView.prototype.render = function() {
        var peopleListView = this.peopleListView = new PeopleListView({personView: AdultPersonView, model: this.model, peopleMethod: this.model.adults});
        empty(this.listEl);
        this.listEl.appendChild(peopleListView.render().el);
        this.setNumPeople();

        var last4SSN = this.model.get("last4SSN");
        if (last4SSN) {
            var el = qs("[name=last-4-ssn]", this.el);
            el.value = last4SSN;
            var radioBtn = qs("[name=has-ssn][value=yes]", this.el);
            radioBtn.checked = true;
        } else {
            var radioBtn = qs("[name=has-ssn][value=no]", this.el);
            radioBtn.checked = true;
        }
    };

    AdultListView.prototype.setNumPeople = function() {
        this.numPeopleEl.innerHTML = pluralize(this.model.adults().length, "adult");
    };

    AdultListView.prototype.bind = function(event, handler) {
        var unloader;
        switch (event) {
        case "handleAddPersonClick":
            unloader = $on(qs("#adults .add-person .actions"), "click", function(event) {
                handler({ageClass: LunchUX.AgeClass.adult});
            }.bind(this));
            this.unloaders.push(unloader);
            break;
        case "handleContinueBtnClick":
            unloader = $on(qs("#adults form.ssn-form"), "submit", function(event) {
                event.preventDefault();
                var last4SSN = "";
                var hasSSN = qs("[name=has-ssn]:checked", this.el);
                if (hasSSN.value === "yes") {
                    last4SSN = this.last4SSNEl.value;
                }
                var continueBtn = qs("button.button", event.target);
                var nextScreenId = continueBtn.getAttribute("data-next-screen");
                handler({
                    modelUpdates: [{name: "last4SSN", value: last4SSN}],
                    nextScreenId: nextScreenId
                });
            }.bind(this));
            this.unloaders.push(unloader);
            break;
        default:
            this.peopleListView.bind(event, handler);
        }
    };

    AdultListView.prototype.unload = function() {
        this.unloaders.forEach(function(unload) {
            unload();
        });
    };

    function OtherHelpView(options) {
        this.el = options.el;
        this.otherHelpFormEl = qs("#other-help .other-help-form");
        this.caseNumberEl = qs("[name=case-number]", this.el);
        this.model = options.model;
        this.template = options.template;
        this.unloaders = [];

        var radioBtns = qsa("[name=has-other-help]", this.el);
        radioBtns.forEach(function(btn) {
            var unload = $on(btn, "change", function(event) {
                var el = event.target;
                this.toggleCaseNumberDisplay(el.value === "yes" && el.checked);
            }.bind(this));
            this.unloaders.push(unload);
        }.bind(this))

        var unload = $on(this.caseNumberEl, "input", function(event) {
            var radio = qs("[name=has-other-help]:checked");
            if (radio) {
                if (radio.value === "yes" && this.caseNumberEl.value === "") {
                    this.caseNumberEl.setCustomValidity("Please supply a case number.");
                } else {
                    this.caseNumberEl.setCustomValidity("");
                }
            }
        }.bind(this));
        this.unloaders.push(unload);
    }

    OtherHelpView.prototype.toggleCaseNumberDisplay = function(isDisplayed) {
        var el = qs(".case-number-control", this.el);
        if (isDisplayed) {
            el.style.display = "block";
            this.caseNumberEl.setCustomValidity("Please supply a case number.");
        } else {
            el.style.display = "none";
            this.caseNumberEl.setCustomValidity("");
        }
    };

    OtherHelpView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleContinueBtnClick":
            var unload = $on(qs("#other-help form"), "submit", function(event) {
                event.preventDefault();
                var caseNumber = "";
                var hasOtherHelp = qs("[name=has-other-help]:checked", this.el);
                if (hasOtherHelp.value === "yes") {
                    caseNumber = this.caseNumberEl.value;
                }
                var continueBtn = qs("button.button", event.target);
                var nextScreenId = continueBtn.getAttribute("data-next-screen");
                handler({
                    modelUpdates: [{name: "caseNumber", "value": caseNumber}],
                    nextScreenId: nextScreenId
                });
            }.bind(this));
            this.unloaders.push(unload);
            break;
        }
    };

    OtherHelpView.prototype.unload = function() {
        this.unloaders.forEach(function(unload) {
            unload();
        });
    };

    OtherHelpView.prototype.render = function() {
        var caseNumber = this.model.get("caseNumber");
        if (caseNumber) {
            this.toggleCaseNumberDisplay(true);
            var el = qs("[name=case-number]", this.el);
            el.value = caseNumber;
            var radio = qs("[name=has-other-help][value=yes]")
            radio.checked = true;
        } else {
            var radio = qs("[name=has-other-help][value=no]")
            radio.checked = true;
        }
    };

    function IncomePersonView(options) {
        this.el = options.el;
        this.model = options.model;
        this.person = options.person;
        this.template = templateFrom("#income-person-form-template");
        this.events = new LunchUX.Event();

        this.model.on("toggleDetailsForm", function(view, show) {
            if (this === view) {
                if (show) {
                    this.showForm();
                } else {
                    this.hideForm();
                }
            }
        }.bind(this));

        $delegate(this.el, "form [type=radio]", "change", function(event) {
            this.toggleIncomeType(event.target);
        }.bind(this));
    }

    IncomePersonView.prototype.toggleIncomeType = function(el) {
        var incomeType = el.getAttribute("data-income-type");
        var incomeTypeForm = qs(".income-" + incomeType + " .income-control", this.el);
        incomeTypeForm.style.display = el.value === "yes" && el.checked ? "block" : "none";
    };

    IncomePersonView.prototype.showForm = function() {
        qs(".details-form", this.el).style.display = "block";
    };

    IncomePersonView.prototype.hideForm = function() {
        qs(".details-form", this.el).style.display = "none";
    };

    var incomeTypes = [
        {label: 'work', value: 'work'},
        {label: 'assistance programs, alimony, or child support', value: 'assistance'},
        {label: 'pensions, retirement, or any other income', value: 'pensions'}
    ];

    IncomePersonView.prototype.render = function() {
        var person = this.person;
        var personView = new PersonView({person: person, model: this.model});
        empty(this.el);
        this.el.appendChild(personView.render().el);
        var li = qs("li", this.el);
        var form = document.createElement("div");
        li.appendChild(form);

        var frequencies = ['pick one','hourly', 'daily', 'weekly', 'every two weeks', 'monthly', 'yearly'];

        function incomeAmount(person, type) {
            return person.incomes && person.incomes[type] ? person.incomes[type].amount : 0;
        }

        function incomeFrequency(person, type) {
            return person.incomes && person.incomes[type] ? person.incomes[type].freq : "";
        }

        form.innerHTML = this.template({
            person: person,
            incomeTypes: incomeTypes,
            frequencies: frequencies,
            incomeAmount: incomeAmount,
            incomeFrequency: incomeFrequency
        });

        return this;
    };

    IncomePersonView.prototype.bind = function(event, handler) {
        switch (event) {
        case "toggleDetailsForm":
            $delegate(this.el, ".actions", "click", function(event) {
                handler(this);
            }.bind(this));
            break;
        case "handleSaveBtnClick":
            $delegate(this.el, "form", "submit", function(event) {
                event.preventDefault();
                var form = event.target;
                var incomes = {};
                incomeTypes.forEach(function(type) {
                    var type = type.value;
                    var hasIncome = qs("[name=has-income-"+type+"]:checked", form).value === "yes";
                    if (!hasIncome) {
                        incomes[type] = {
                            amount: 0,
                            freq: "",
                            answered: true
                        }
                    } else {
                        var amount = parseInt(qs("[name=income-"+type+"-amount]", form).value, 10);
                        var freq = qs("[name=income-"+type+"-freq]", form).value;
                        incomes[type] = {
                            amount: amount,
                            freq: freq,
                            answered: true
                        }
                    }
                }.bind(this));
                var person = this.person;
                person.incomes = incomes;
                handler({view: this, person: person});
                this.events.notify("saved", {view: this});
            }.bind(this));
            break;
        }
    };

    function IncomeListView(options) {
        this.el = null;
        this.model = options.model;
        this.childViews = [];

        this.events = [
            "toggleDetailsForm",
            "handleSaveBtnClick"
        ];
    }

    IncomeListView.prototype.addOne = function(person) {
        var div = document.createElement("div");
        var childView = new IncomePersonView({person: person, model: this.model, el: div});
        this.el.appendChild(childView.render().el);
        this.events.forEach(function(event) {
            childView.bind(event, function() {
                if (this[event]) {
                    this[event].apply(this, Array.prototype.slice.call(arguments));
                }
            }.bind(this));
        }.bind(this));
        childView.events.bind("saved", function(options) {
            this.expandNextUnanswered();
        }.bind(this));
        this.childViews.push(childView);
    };

    IncomeListView.prototype.render = function() {
        this.el = document.createElement("div");
        var people = this.model.sortedHousehold();
        var expandedFirst = false;
        people.forEach(this.addOne.bind(this));
        this.expandNextUnanswered();
        return this;
    };

    IncomeListView.prototype.expandNextUnanswered = function() {
        for (var i = 0; i < this.childViews.length; i++) {
            var view = this.childViews[i];
            var person = view.person;
            if (!hasAnsweredIncome(person)) {
                this.model.toggleDetailsForm(view);
                break;
            }
        }
    };

    function hasAnsweredIncome(person) {
        var incomes = person.incomes || {};
        for (var i = 0; i < incomeTypes.length; i++) {
            var type = incomeTypes[i].value;
            if (!(type in incomes) ||
                (incomes[type].amount < 0 || (income[type] > 0 && incomes[type].freq === ""))) {
                return false;
            }
        }
        return true;
    }

    IncomeListView.prototype.bind = function(event, handler) {
        if (this.events.indexOf(event) === -1) {
            throw new Error("tried to bind an unknown event for this view: '" + event + "'");
        }
        this[event] = handler;
    };

    function IncomeView(options) {
        this.listEl = qs("#income .person-list");
        this.numPeopleEl = qs("#income .num-people");
        this.model = options.model;
        this.listView = new IncomeListView({el: this.listEl, model: this.model});
    }

    IncomeView.prototype.render = function() {
        empty(this.listEl);
        this.listEl.appendChild(this.listView.render().el);
        this.numPeopleEl.innerHTML = pluralize(this.model.all().people.length, "person", "people");
    };

    IncomeView.prototype.bind = function(event, handler) {
        this.listView.bind(event, handler);
    };

    function pluralize(number, singular, plural) {
        var word = number === 1 ? singular : (plural ? plural : singular + 's');
        return number.toString() + ' ' + word;
    }

    function states() {
        return [
            {'name': 'Alabama', 'abbrev': 'AL'},
            {'name': 'Alaska', 'abbrev': 'AK'},
            {'name': 'Arizona', 'abbrev': 'AZ'},
            {'name': 'Arkansas', 'abbrev': 'AR'},
            {'name': 'California', 'abbrev': 'CA'},
            {'name': 'Colorado', 'abbrev': 'CO'},
            {'name': 'Connecticut', 'abbrev': 'CT'},
            {'name': 'Delaware', 'abbrev': 'DE'},
            {'name': 'Florida', 'abbrev': 'FL'},
            {'name': 'Georgia', 'abbrev': 'GA'},
            {'name': 'Hawaii', 'abbrev': 'HI'},
            {'name': 'Idaho', 'abbrev': 'ID'},
            {'name': 'Illinois', 'abbrev': 'IL'},
            {'name': 'Indiana', 'abbrev': 'IN'},
            {'name': 'Iowa', 'abbrev': 'IA'},
            {'name': 'Kansas', 'abbrev': 'KS'},
            {'name': 'Kentucky', 'abbrev': 'KY'},
            {'name': 'Louisiana', 'abbrev': 'LA'},
            {'name': 'Maine', 'abbrev': 'ME'},
            {'name': 'Maryland', 'abbrev': 'MD'},
            {'name': 'Massachusetts', 'abbrev': 'MA'},
            {'name': 'Michigan', 'abbrev': 'MI'},
            {'name': 'Minnesota', 'abbrev': 'MN'},
            {'name': 'Mississippi', 'abbrev': 'MS'},
            {'name': 'Missouri', 'abbrev': 'MO'},
            {'name': 'Montana', 'abbrev': 'MT'},
            {'name': 'Nebraska', 'abbrev': 'NE'},
            {'name': 'Nevada', 'abbrev': 'NV'},
            {'name': 'New Hampshire', 'abbrev': 'NH'},
            {'name': 'New Jersey', 'abbrev': 'NJ'},
            {'name': 'New Mexico', 'abbrev': 'NM'},
            {'name': 'New York', 'abbrev': 'NY'},
            {'name': 'North Carolina', 'abbrev': 'NC'},
            {'name': 'North Dakota', 'abbrev': 'ND'},
            {'name': 'Ohio', 'abbrev': 'OH'},
            {'name': 'Oklahoma', 'abbrev': 'OK'},
            {'name': 'Oregon', 'abbrev': 'OR'},
            {'name': 'Pennsylvania', 'abbrev': 'PA'},
            {'name': 'Rhode Island', 'abbrev': 'RI'},
            {'name': 'South Carolina', 'abbrev': 'SC'},
            {'name': 'South Dakota', 'abbrev': 'SD'},
            {'name': 'Tennessee', 'abbrev': 'TN'},
            {'name': 'Texas', 'abbrev': 'TX'},
            {'name': 'Utah', 'abbrev': 'UT'},
            {'name': 'Vermont', 'abbrev': 'VT'},
            {'name': 'Virginia', 'abbrev': 'VA'},
            {'name': 'Washington', 'abbrev': 'WA'},
            {'name': 'West Virginia', 'abbrev': 'WV'},
            {'name': 'Wisconsin', 'abbrev': 'WI'},
            {'name': 'Wyoming', 'abbrev': 'WY'}
        ];
    }

    function ReviewView(options) {
        this.hhDescriptionEl = qs("#review .hh-description");
        this.personListEl = qs("#review .person-list");
        this.contactInfoEl = qs("#review .contact-info");
        this.otherHelpEl = qs("#review .other-help-summary .summary");
        this.ssnEl = qs("#review .ssn-summary .summary");
        this.model = options.model;
        this.unloaders = [];

        this.descriptionTemplate = templateFrom("#review-description-template");
        this.kidSummaryTemplate = templateFrom('#kid-summary-template');
        this.adultSummaryTemplate = templateFrom('#adult-summary-template');
        this.personSummaryTemplate = templateFrom('#person-summary-template');
    }

    ReviewView.prototype.render = function() {
        var people = this.model.all().people;
        var numKids = this.model.kids().length;
        var numAdults = this.model.adults().length;
        var numPeople = people.length;

        this.hhDescriptionEl.innerHTML = this.descriptionTemplate({
            numKids: numKids,
            numAdults: numAdults,
            numPeople: numPeople,
            pluralize: pluralize
        });

        this.personListEl.innerHTML = this.personSummaryTemplate({
            people: people,
            kidSummary: this.kidSummary.bind(this),
            adultSummary: this.adultSummary.bind(this),
        });

        this.otherHelpEl.innerHTML = this.model.get("caseNumber") ? "Someone in your household receives SNAP, TANF, or FDPIR." :
            "Nobody in your household receives other assistance.";

        this.ssnEl.innerHTML = this.model.get("last4SSN") ? '<p>You told us the last four digits of your SSN are:</p><div class="ssn">XXX-XXX-' + this.model.get("last4SSN") + '</div>' : "Nobody in your household has a Social Security number.";
    };

    ReviewView.prototype.incomeText = function(p) {
        var text = [];
        for (var type in p.incomes) {
            if (p.incomes.hasOwnProperty(type)) {
                var income = p.incomes[type];
                if (income.amount !== 0) {
                    var amountString = '$' + income.amount.toLocaleString() + ' ' + income.freq;
                    text.push(amountString);
                }
            }
        }
        text = text.join(", ");
        text = (text ? "income of " + text : "no income");
        return text;
    };

    ReviewView.prototype.kidSummary = function(person) {
        return this.kidSummaryTemplate({person: person, incomeText: this.incomeText});
    };

    ReviewView.prototype.adultSummary = function(person) {
        return this.adultSummaryTemplate({person: person, incomeText: this.incomeText});
    };

    ReviewView.prototype.bind = function(event, handler) {
        switch (event) {
        }
    };

    ReviewView.prototype.unload = function() {
        this.unloaders.forEach(function(unload) {
            unload();
        });
    };

    function ContactAndSignView(options) {
        this.el = qs("#contact");
        this.formEl = qs("form", this.el);
        this.model = options.model;
        this.unloaders = [];

        this.model.on("updated:hasAddress", function() {
            qs(".address", this.contactInfoEl).style.display = this.model.get("hasAddress") ? "block" : "none";
        }.bind(this));
    }

    function dashToCamel(name) {
        return name.replace(/-[a-z]/g, function(m) { return m.slice(1).toUpperCase(); });
    }

    ContactAndSignView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleHasAddressRadioClick":
            qsa("[name=has-address]", this.contactInfoEl).forEach(function(el) {
                var unloader = $on(el, "click", function(event) {
                    handler(event.target.value === "yes" && event.target.checked);
                }.bind(this));
                this.unloaders.push(unloader);
            }.bind(this));
            break;
        case "handleSubmit":
            var unloader = $on(this.formEl, "submit", function(event) {
                event.preventDefault();
                if (window.confirm("Are you sure you want to submit your application?")) {
                    // TODO: change this to use serializeForm + updateFromForm
                    var form = event.target;
                    var elements = Array.prototype.slice.call(form);
                    var values = [];
                    var races = [];
                    for (var i = 0; i < elements.length; i++) {
                        var el = elements[i];
                        if (el.name === "") {
                            continue;
                        }
                        var name = dashToCamel(el.name)
                        switch (el.name) {
                        case "is-hispanic":
                            if (el.checked) {
                                if (el.value === "declined") {
                                    values.push({name: "isHispanicDeclined", value: true});
                                    values.push({name: "isHispanic", value: undefined});
                                } else {
                                    values.push({name: "isHispanicDeclined", value: undefined});
                                    values.push({name: "isHispanic", value: el.value === "yes"});
                                }
                            }
                            break;
                        case "race":
                            if (el.checked) {
                                races.push(el.value);
                            }
                            break;
                        default:
                            values.push({name: name, value: el.value});
                        }
                    }
                    values.push({name: "races", value: races});
                    handler(values);
                }
            }.bind(this));
            this.unloaders.push(unloader);
        }
    };

    ContactAndSignView.prototype.render = function() {
        var races = [
            {label: "American Indian or Alaskan Native", value: "american-indian"},
            {label: "Asian", value: "asian"},
            {label: "Black or African-American", value: "black"},
            {label: "Native Hawaiian or other Pacific Islander", value: "hawaiian"},
            {label: "White", value: "white"},
            {label: "I'd rather not say", value: "declined"}
        ];

        var statesEl = qs("[name=state]", this.formEl);
        states().forEach(function(state) {
            var option = document.createElement("option");
            option.value = state.abbrev;
            option.label = state.abbrev;
            statesEl.appendChild(option);
        }.bind(this));

        return this;
    };

    ContactAndSignView.prototype.unload = function() {
        this.unloaders.forEach(function(unload) {
            unload();
        });
    };

    function View(options) {
    }

    View.prototype.render = function() {
    };

    View.prototype.bind = function() {
    };

    // controller

    function Controller(model) {
        this.model = model;
        this.activeView = null;
        this.events = new LunchUX.Event();
        this.views = {
            "get-started": GetStartedView,
            "kids": KidListView,
            "adults": AdultListView,
            "other-help": OtherHelpView,
            "income": IncomeView,
            "review": ReviewView,
            "contact": ContactAndSignView
        };
        this.progress = [
            "get-started",
            "kids",
            "other-help",
            "adults",
            "income",
            "review",
            "contact"
        ];
        this.handlers = {
            "get-started": [
                {event: "handleContinueBtnClick", handler: this.handleContinueBtnClick.bind(this)}
            ],
            "kids": [
                {event: "toggleDetailsForm", handler: this.toggleDetailsForm.bind(this)},
                {event: "handleSaveBtnClick", handler: this.handleSaveBtnClick.bind(this)},
                {event: "handleDeleteBtnClick", handler: this.handleDeleteBtnClick.bind(this)},
                {event: "handleAddPersonClick", handler: this.handleAddPersonClick.bind(this)}
            ],
            "adults": [
                {event: "toggleDetailsForm", handler: this.toggleDetailsForm.bind(this)},
                {event: "handleSaveBtnClick", handler: this.handleSaveBtnClick.bind(this)},
                {event: "handleDeleteBtnClick", handler: this.handleDeleteBtnClick.bind(this)},
                {event: "handleAddPersonClick", handler: this.handleAddPersonClick.bind(this)},
                {event: "handleContinueBtnClick", handler: this.handleContinueBtnClick.bind(this)}
            ],
            "other-help": [
                {event: "handleContinueBtnClick", handler: this.handleContinueBtnClick.bind(this)}
            ],
            "income": [
                {event: "toggleDetailsForm", handler: this.toggleDetailsForm.bind(this)},
                {event: "handleSaveBtnClick", handler: this.handleSaveBtnClick.bind(this)}
            ],
            "review": [],
            "contact": [
                {event: "handleHasAddressRadioClick", handler: this.handleHasAddressRadioClick.bind(this)},
                {event: "handleSubmit", handler: this.handleSubmit.bind(this)}
            ]
        };
    }

    Controller.prototype.on = function(event, handler) {
        this.events.bind(event, handler);
    };

    Controller.prototype.toggleDetailsForm = function(view) {
        this.model.toggleDetailsForm(view);
    };

    Controller.prototype.handleSaveBtnClick = function(options) {
        this.model.savePerson(options.person);
        this.model.toggleDetailsForm(options.view);
    };

    Controller.prototype.handleDeleteBtnClick = function(person) {
        this.model.deletePerson(person);
    };

    Controller.prototype.handleAddPersonClick = function(options) {
        this.model.addPerson(options);
    };

    Controller.prototype.handleContinueBtnClick = function(options) {
        if (options.modelUpdates) {
            options.modelUpdates.forEach(function(pair) {
                this.model.set(pair.name, pair.value);
            }.bind(this));
        }
        this.setView(options.nextScreenId);
    };

    Controller.prototype.handleHasAddressRadioClick = function(hasAddress) {
        this.model.set("hasAddress", hasAddress);
    };

    Controller.prototype.handleSubmit = function(values) {
        values.forEach(function(obj) {
            this.model.set(obj.name, obj.value);
        }.bind(this));
        var xhttp = new XMLHttpRequest()
        xhttp.open("POST", submitURL, true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send("data=" + JSON.stringify(this.model.data));
        this.model.clear();
        this.setView("submitted");
    };

    Controller.prototype.setView = function(id) {
        window.location.hash = "#" + id;
    };

    Controller.prototype.getViewToLoad = function(id) {
        var viewClass = this.views[id];
        if (!viewClass) {
            viewClass = View;
        }
        return viewClass;
    };

    if (!Array.prototype.all) {
        Array.prototype.all = function(predicate) {
            for (var i = 0; i < this.length; i++) {
                if (!predicate(this[i])) {
                    return false;
                }
            }
            return true;
        };
    }

    Controller.prototype.loadView = function(id, options) {
        options = options || {};

        //console.debug("setting view '%s'", id);

        // TODO would be great to move this and the next if statement to some isolated biz logic method
        var allFosterKids = this.model.kids().all(function(p) { return p.isFosterChild; });
        if ((id === "adults" || id === "income") && (this.model.get("caseNumber") || allFosterKids)) {
            //console.debug("short-circuit %s due to hasOtherHelp == true || all foster kids", id);
            controller.setView("review");
            return;
        }

        if ((id === "kids" || id === "adults") && this.model.get("people").length === 0) {
            this.model.setInitialHousehold();
        }

        if (options.initial && this.model.hasExistingSession()) {
            var existingSession = qs(".existing-session");
            existingSession.classList.remove("hide");
            var unload = $on(existingSession, "click", function() {
                existingSession.classList.add("hide");
                unload();
            });
        } else {
            qs(".existing-session").classList.add("hide");
        }

        if (options.fromView && options.fromView !== "contact") {
            this.markComplete(options.fromView);
        }

        this.setActiveNavTab(id);

        if (this.activeView && this.activeView.unload) {
            this.activeView.unload();
            this.model.reset();
            this.events.notify("view:unloaded");
        }

        var appContainer = qs("#app");

        var ViewToLoad = this.getViewToLoad(id);
        if (ViewToLoad) {
            var template = _.template(LunchUX.Templates[id]);
            var div = document.createElement("div");
            div.innerHTML = template();
            empty(appContainer);
            appContainer.appendChild(div);
            var view = new ViewToLoad({model: this.model, template: template, el: div});
            view.render();
            this.activeView = view;
            if (this.handlers[id]) {
                this.handlers[id].forEach(function(handler) {
                    view.bind(handler.event, handler.handler);
                });
            }
            this.events.notify("view:loaded");
        }
    };

    Controller.prototype.markComplete = function(fromView) {
        var completed = this.model.get("completed");
        completed[fromView] = true;
        this.model.set("completed", completed);
    };

    Controller.prototype.setActiveNavTab = function(viewId) {
        var progress = this.progress.indexOf(viewId);
        var completed = this.model.get("completed");
        qsa(".subnav li").forEach(function(li) {
            var a = qs("a", li);
            var thisViewId = a.hash === "" ? "get-started" : a.hash.slice(1);
            if ((thisViewId === viewId)) {
                li.classList.add("active");
            } else {
                li.classList.remove("active");
            }
            if (this.progress.indexOf(thisViewId) < progress) {
                li.classList.add("done");
            } else {
                li.classList.remove("done");
            }
            if (thisViewId !== viewId && !completed[thisViewId]) {
                li.classList.add("disabled");
            } else {
                li.classList.remove("disabled");
            }
        }.bind(this));
    };

    // the app

    function initDebugging() {
        function updateDebugWindow() {
            var store = JSON.stringify(model.data, null, 4);
            var formDisplay = model.formDisplay.map(function(state) {
                return {view: state.view.person.id, show: state.show};
            });
            var extra = JSON.stringify({
                formDisplay: formDisplay
            }, null, 4);
            qs("#debug pre").innerText = "extra:\n" + extra + "\n\nmodel:\n" + store;
        }

        model.on("saved", updateDebugWindow);
        controller.on("view:unloaded", updateDebugWindow);
        controller.on("view:loaded", updateDebugWindow);
        updateDebugWindow();

        $on(qs("#debug"), "click", function(event) {
            var div = event.currentTarget;
            var i = qs("i", div);
            if (i.textContent === "Show debug") {
                i.previousElementSibling.style.display = "block";
                i.innerText = "Hide debug";
            } else {
                i.previousElementSibling.style.display = "none";
                i.innerText = "Show debug";
            }
        });
    }

    $on(document, "DOMContentLoaded", function() {
        var store = new Store("lunchux");
        var model = window.model = new LunchUX.Model(store);
        var controller = window.controller = new Controller(model);

        var initialViewId = "get-started";

        //initDebugging();

        function loadView(event, initial) {
            var options = {initial: !!initial};
            if (event) {
                var a = document.createElement("A");
                a.href = event.oldURL;
                options.fromView = a.hash ? a.hash.slice(1) : initialViewId;
            }
            var id = window.location.hash ? window.location.hash.slice(1) : initialViewId;
            controller.loadView(id, options);
        }

        $on(window, "hashchange", loadView);
        loadView(null, true);
    }, false);
}());
