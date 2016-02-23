(function() {
    "use strict";

    // helpers

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

    var LunchUX = window.LunchUX = {};

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

    function HouseholdSizeView(options) {
        this.numKidsInput = qs("#household-size [name=num-kids]");
        this.numAdultsInput = qs("#household-size [name=num-adults]");
        this.formEl = qs("#household-size form");
        this.listenersToUnload = [];
        this.model = options.model;
    }

    HouseholdSizeView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleSetHouseholdSize":
            var unloader = $on(this.formEl, "submit", function(event) {
                event.preventDefault();
                var numKids = parseInt(this.numKidsInput.value, 10);
                var numAdults = parseInt(this.numAdultsInput.value, 10);
                var submitBtn = qs("button.fwd", this.formEl);
                var nextScreenId = submitBtn.getAttribute("data-next-screen");
                handler({numKids: numKids, numAdults: numAdults, nextScreenId: nextScreenId});
            }.bind(this));
            this.listenersToUnload.push(unloader);
            break;
        }
    };

    HouseholdSizeView.prototype.render = function() {
        var household = this.model.all();
        this.numKidsInput.value = household.numKids;
        this.numAdultsInput.value = household.numAdults;
    };

    HouseholdSizeView.prototype.unload = function() {
        this.listenersToUnload.forEach(function(unload) {
            unload();
        });
    };

    function templateFrom(selector) {
        var templateEl = qs(selector);
        if (!templateEl) throw new Error("couldn't find template from selector " + selector);
        return _.template(templateEl.innerHTML);
    }

    function PersonView(options) {
        this.el = document.createElement("div");
        this.template = templateFrom("#person-template");
        this.model = options.model; // app-wide model
        this.person = options.person;
    }

    PersonView.prototype.render = function() {
        this.el.innerHTML = this.template({person: this.person});
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
                show ? this.showForm() : this.hideForm();
            }
        }.bind(this));

        this.model.on("updatedPerson", function(options) {
            if (options.current.id === this.person.id) {
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

        var races = [
            {label: "American Indian or Alaskan Native", value: "american-indian"},
            {label: "Asian", value: "asian"},
            {label: "Black or African-American", value: "black"},
            {label: "Native Hawaiian or other Pacific Islander", value: "hawaiian"},
            {label: "White", value: "white"},
            {label: "Decline to answer", value: "declined"}
        ];

        function tribool(prop, test) {
            if (prop === undefined || prop === null) {
                return ""
            }
            return (test === false && prop === false) || (test === true && prop === true) ? "checked" : "";
        }

        var form = document.createElement("div");
        li.appendChild(form);
        form.innerHTML = this.template({person: person, races: races, tribool: tribool});

        return this;
    };

    KidPersonView.prototype.bind = function(event, handler) {
        switch (event) {
        case "toggleDetailsForm":
            $delegate(this.el, ".actions", "click", function(event) {
                handler(this);
            }.bind(this));
            break;
        case "handleNameInput":
            $delegate(this.el, "[name=name]", "input", function(event) {
                handler(this.person, event.target.value);
            }.bind(this));
            break;
        case "handleBooleanRadioClick":
            $delegate(this.el, "[type=radio]", "click", function(event) {
                var input = event.target;
                if (input.name === "is-hispanic") {
                    if (input.value === "declined" && input.checked) {
                        handler(this.person, "is-hispanic", undefined);
                        handler(this.person, "is-hispanic-declined", true);
                        return;
                    } else {
                        handler(this.person, "is-hispanic-declined", undefined);
                        handler(this.person, "is-hispanic", input.value === "yes" && input.checked);
                        return;
                    }
                }
                var checked = input.value === "yes" && input.checked;
                handler(this.person, input.name, checked);
            }.bind(this));
            break;
        case "handleRaceCheckboxClick":
            $delegate(this.el, "[name=race]", "click", function(event) {
                var checked = qsa("[name=race]:checked", this.el);
                var races = checked.map(function(checkbox) {
                    return checkbox.value;
                });
                handler(this.person, races);
            }.bind(this));
            break;
        case "handleSaveBtnClick":
            $delegate(this.el, "form", "submit", function(event) {
                event.preventDefault();
                handler(this, this.person);
            }.bind(this));
            break;
        case "handleDeleteBtnClick":
            $delegate(this.el, ".button.delete", "click", function(event) {
                event.preventDefault();
                handler(this.person);
            }.bind(this));
            break;
        }
    };

    function PeopleListView(options) {
        this.personView = (options.personView || PersonView);
        this.el = null;
        this.model = options.model;
        this.peopleMethod = options.peopleMethod || function() { return this.all().people }

        this.events = [
            "toggleDetailsForm",
            "handleNameInput",
            "handleBooleanRadioClick",
            "handleRaceCheckboxClick",
            "handleSaveBtnClick",
            "handleDeleteBtnClick",
            "handleIncomeAmountInput",
            "handleIncomeFrequencyChange"
        ];
    }

    PeopleListView.prototype.render = function() {
        this.el = document.createElement("div");
        var people = this.peopleMethod.call(this.model);
        people.forEach(function(person) {
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
        }.bind(this));
        return this;
    };

    PeopleListView.prototype.bind = function(event, handler) {
        if (this.events.indexOf(event) === -1) {
            console.error("tried to bind an unknown event for this view: '%s'", event);
            return;
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

//        this.model.on("addedPerson", this.render.bind(this));
    }

    KidListView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleAddPersonClick":
            var unload = $on(qs(".actions", this.addPersonEl), "click", function(event) {
                handler({name: "Kid #" + (this.model.kids().length + 1), ageClass: AgeClass.child});
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
                show ? this.showForm() : this.hideForm();
            }
        }.bind(this));

        this.model.on("updatedPerson", function(options) {
            if (options.current.id === this.person.id) {
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
        case "handleNameInput":
            $delegate(this.el, "[name=name]", "input", function(event) {
                handler(this.person, event.target.value);
            }.bind(this));
            break;
        case "handleSaveBtnClick":
            $delegate(this.el, "button.save", "click", function(event) {
                handler(this, this.person);
            }.bind(this));
            break;
        case "handleDeleteBtnClick":
            $delegate(this.el, ".button.delete", "click", function(event) {
                event.preventDefault();
                handler(this.person);
            }.bind(this));
            break;
        }
    };

    function AdultListView(options) {
        this.listEl = qs("#adults .person-list");
        this.numPeopleEl = qs("#adults .num-people");
        this.ssnFormEl = qs("#adults .ssn-form");
        this.peopleListView = null;
        this.model = options.model;
        this.unloaders = [];
        this.model.on("updated:hasSSN", function() {
            qs(".last-4-ssn-control", this.ssnFormEl).style.display = this.model.get("hasSSN") ? "block" : "none";
        }.bind(this));
    }

    AdultListView.prototype.render = function() {
        var peopleListView = this.peopleListView = new PeopleListView({personView: AdultPersonView, model: this.model, peopleMethod: this.model.adults});
        empty(this.listEl);
        this.listEl.appendChild(peopleListView.render().el);
        this.numPeopleEl.innerHTML = pluralize(this.model.adults().length, "adult");
    };

    AdultListView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleLast4SSNInput":
            var unloader = $on(qs("[name=last-4-ssn]", this.ssnFormEl), "input", function(event) {
                handler(event.target.value);
            }.bind(this));
            this.unloaders.push(unloader);
            break;
        case "handleHasSSNRadioClick":
            qsa("[name=has-ssn]", this.ssnFormEl).forEach(function(el) {
                var unloader = $on(el, "click", function(event) {
                    handler(event.target.value === "yes" && event.target.checked);
                }.bind(this));
                this.unloaders.push(unloader);
            }.bind(this));
            break;
        case "handleAddPersonClick":
            var unload = $on(qs("#adults .add-person .actions"), "click", function(event) {
                handler({name: "Adult #" + (this.model.adults().length + 1), ageClass: AgeClass.adult});
            }.bind(this));
            this.unloaders.push(unload);
            break;
        case "handleContinueBtnClick":
            var unload = $on(qs("#adults form.ssn-form"), "submit", function(event) {
                event.preventDefault();
                var submitBtn = qs("button.button", event.target);
                var nextScreenId = submitBtn.getAttribute("data-next-screen");
                handler({nextScreenId: nextScreenId});
            }.bind(this));
            this.unloaders.push(unload);
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
        this.otherHelpFormEl = qs("#other-help .other-help-form");
        this.model = options.model;
        this.unloaders = [];
        this.model.on("updated:hasOtherHelp", function() {
            qs(".case-number-control", this.otherHelpFormEl).style.display = this.model.get("hasOtherHelp") ? "block" : "none";
        }.bind(this));
    }

    OtherHelpView.prototype.bind = function(event, handler) {
        switch (event) {
        case "handleHasOtherHelpRadioClick":
            qsa("[name=has-other-help]", this.otherHelpFormEl).forEach(function(el) {
                var unload = $on(el, "click", function(event) {
                    handler(event.target.value === "yes" && event.target.checked);
                }.bind(this));
                this.unloaders.push(unload);
            }.bind(this));
            break;
        case "handleCaseNumberInput":
            var caseNumber = qs("[name=case-number]", this.otherHelpFormEl);
            var unload = $on(caseNumber, "input", function(event) {
                handler(caseNumber.value);
            }.bind(this));
            this.unloaders.push(unload);
            break;
        case "handleContinueBtnClick":
            var unload = $on(qs("#other-help form"), "submit", function(event) {
                event.preventDefault();
                var submitBtn = qs("button.button", event.target);
                var nextScreenId = submitBtn.getAttribute("data-next-screen");
                handler({nextScreenId: nextScreenId});
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

    OtherHelpView.prototype.render = function() {};

    function IncomePersonView(options) {
        this.el = options.el;
        this.model = options.model;
        this.person = options.person;
        this.template = templateFrom("#income-person-form-template");

        this.model.on("toggleDetailsForm", function(view, show) {
            if (this === view) {
                show ? this.showForm() : this.hideForm();
            }
        }.bind(this));
    }

    IncomePersonView.prototype.showForm = function() {
        qs(".details-form", this.el).style.display = "block";
    };

    IncomePersonView.prototype.hideForm = function() {
        qs(".details-form", this.el).style.display = "none";
    };

    IncomePersonView.prototype.render = function() {
        var person = this.person;
        var personView = new PersonView({person: person, model: this.model});
        empty(this.el);
        this.el.appendChild(personView.render().el);
        var li = qs("li", this.el);
        var form = document.createElement("div");
        li.appendChild(form);

        var incomeTypes = [
            {label: 'work', value: 'work'},
            {label: 'assistance programs, alimony, or child support', value: 'assistance'},
            {label: 'pensions, retirement, or any other income', value: 'pensions'}
        ];

        var frequencies = ['', 'daily', 'weekly', 'monthly', 'yearly'];

        function incomeAmount(person, type) {
            return (person.incomes && person.incomes[type]) ? person.incomes[type].amount :
                "";
        }

        function incomeFrequency(person, type) {
            return (person.incomes && person.incomes[type]) ? person.incomes[type].freq :
                "";
        }

        form.innerHTML = this.template({
            person: person,
            incomeTypes:
            incomeTypes,
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
        case "handleIncomeAmountInput":
            $delegate(this.el, "input", "input", function(event) {
                var bits = event.target.name.split(/-/);
                var type = bits[1];
                handler(this.person, type, {amount: event.target.value});
            }.bind(this));
            break;
        case "handleIncomeFrequencyChange":
            $delegate(this.el, "select", "change", function(event) {
                var bits = event.target.name.split(/-/);
                var type = bits[1];
                handler(this.person, type, {freq: event.target.value});
            }.bind(this));
            break;
        case "handleSaveBtnClick":
            $delegate(this.el, "form", "submit", function(event) {
                event.preventDefault();
                handler(this, this.person);
            }.bind(this));
            break;
        }
    };

    function IncomeView(options) {
        this.listEl = qs("#income .person-list");
        this.numPeopleEl = qs("#income .num-people");
        this.model = options.model;
        this.peopleListView = new PeopleListView({model: this.model, personView: IncomePersonView});
    }

    IncomeView.prototype.render = function() {
        empty(this.listEl);
        this.listEl.appendChild(this.peopleListView.render().el);
        this.numPeopleEl.innerHTML = pluralize(this.model.all().people.length, "person", "people");
    };

    IncomeView.prototype.bind = function(event, handler) {
        this.peopleListView.bind(event, handler);
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
        this.formEl = qs("#review form");
        this.model = options.model;
        this.unloaders = [];

        this.descriptionTemplate = templateFrom("#review-description-template");
        this.kidSummaryTemplate = templateFrom('#kid-summary-template');
        this.adultSummaryTemplate = templateFrom('#adult-summary-template');
        this.personSummaryTemplate = templateFrom('#person-summary-template');

        this.model.on("updated:hasAddress", function() {
            qs(".address", this.contactInfoEl).style.display = this.model.get("hasAddress") ? "block" : "none";
        }.bind(this));
    }

    ReviewView.prototype.render = function() {
        var people = this.model.all().people;
        var numKids = people.filter(function(person) { return person.ageClass === AgeClass.child; }).length;
        var numAdults = people.filter(function(person) { return person.ageClass === AgeClass.adult; }).length;
        var numPeople = people.length;

        this.hhDescriptionEl.innerHTML = this.descriptionTemplate({
            numKids: numKids,
            numAdults: numAdults,
            numPeople: numPeople,
            pluralize: pluralize
        });

        function incomeText(p) {
            var text = [];
            for (var type in p.incomes) {
                if (p.incomes.hasOwnProperty(type)) {
                    var income = p.incomes[type];
                    if (income.amount != 0) {
                        text.push(income.amount + ' ' + income.freq);
                    }
                }
            }
            text = text.join(", ");
            text = (text ? "income of " + text : "no income");
            return text;
        }

        function kidSummary(p) {
            return this.kidSummaryTemplate({person: p, incomeText: incomeText});
        }

        function adultSummary(p) {
            return this.adultSummaryTemplate({person: p, incomeText: incomeText});
        }

        this.personListEl.innerHTML = this.personSummaryTemplate({
            people: people,
            kidSummary: kidSummary.bind(this),
            adultSummary: adultSummary.bind(this),
        });

        this.otherHelpEl.innerHTML = this.model.get("hasOtherHelp") ? "Someone in your household receives SNAP, TANF, or FDPIR." :
            "Nobody in your household receives other assistance.";

        this.ssnEl.innerHTML = this.model.get("hasSSN") ? '<p>You told us the last four digits of your SSN are:</p><div class="ssn">XXX-XXX-' + this.model.get("last4SSN") + '</div>' : "Nobody in your household has a Social Security number.";

        var statesEl = qs("[name=state]", this.formEl);
        states().forEach(function(state) {
            var option = document.createElement("option")
            option.value = state.abbrev;
            option.label = state.abbrev;
            statesEl.appendChild(option);
        }.bind(this));
    };

    ReviewView.prototype.bind = function(event, handler) {
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
                    var form = event.target;
                    var elements = Array.prototype.slice.call(form);
                    var values = elements.filter(function(el) {
                        return el.name !== "";
                    }).map(function(el) {
                        return {name: el.name, value: el.value};
                    });
                    handler(values);
                }
            }.bind(this));
            this.unloaders.push(unloader);
        }
    };

    ReviewView.prototype.unload = function() {
        this.unloaders.forEach(function(unload) {
            unload();
        });
    };

    // controller

    function Controller(model) {
        this.model = model;
        this.activeView = null;
        this.events = new LunchUX.Event();
        this.views = {
            "household-size": HouseholdSizeView,
            "kids": KidListView,
            "adults": AdultListView,
            "other-help": OtherHelpView,
            "income": IncomeView,
            "review": ReviewView
        }
        this.progress = [
            "get-started",
            "household-size",
            "kids",
            "other-help",
            "adults",
            "income",
            "review"
        ];
        this.handlers = {
            "household-size": [
                {event: "handleSetHouseholdSize", handler: this.setHouseholdSize.bind(this)}
            ],
            "kids": [
                {event: "toggleDetailsForm", handler: this.toggleDetailsForm.bind(this)},
                {event: "handleNameInput", handler: this.handleNameInput.bind(this)},
                {event: "handleBooleanRadioClick", handler: this.handleBooleanRadioClick.bind(this)},
                {event: "handleRaceCheckboxClick", handler: this.handleRaceCheckboxClick.bind(this)},
                {event: "handleSaveBtnClick", handler: this.handleSaveBtnClick.bind(this)},
                {event: "handleDeleteBtnClick", handler: this.handleDeleteBtnClick.bind(this)},
                {event: "handleAddPersonClick", handler: this.handleAddPersonClick.bind(this)}
            ],
            "adults": [
                {event: "toggleDetailsForm", handler: this.toggleDetailsForm.bind(this)},
                {event: "handleNameInput", handler: this.handleNameInput.bind(this)},
                {event: "handleSaveBtnClick", handler: this.handleSaveBtnClick.bind(this)},
                {event: "handleDeleteBtnClick", handler: this.handleDeleteBtnClick.bind(this)},
                {event: "handleLast4SSNInput", handler: this.handleLast4SSNInput.bind(this)},
                {event: "handleHasSSNRadioClick", handler: this.handleHasSSNRadioClick.bind(this)},
                {event: "handleAddPersonClick", handler: this.handleAddPersonClick.bind(this)},
                {event: "handleContinueBtnClick", handler: this.handleContinueBtnClick.bind(this)}
            ],
            "other-help": [
                {event: "handleHasOtherHelpRadioClick", handler: this.handleHasOtherHelpRadioClick.bind(this)},
                {event: "handleCaseNumberInput", handler: this.handleCaseNumberInput.bind(this)},
                {event: "handleContinueBtnClick", handler: this.handleContinueBtnClick.bind(this)}
            ],
            "income": [
                {event: "toggleDetailsForm", handler: this.toggleDetailsForm.bind(this)},
                {event: "handleIncomeAmountInput", handler: this.handleIncomeUpdate.bind(this)},
                {event: "handleIncomeFrequencyChange", handler: this.handleIncomeUpdate.bind(this)},
                {event: "handleSaveBtnClick", handler: this.handleSaveBtnClick.bind(this)}
            ],
            "review": [
                {event: "handleHasAddressRadioClick", handler: this.handleHasAddressRadioClick.bind(this)},
                {event: "handleSubmit", handler: this.handleSubmit.bind(this)}
            ]
        }
    }

    Controller.prototype.on = function(event, handler) {
        this.events.bind(event, handler);
    };

    Controller.prototype.setHouseholdSize = function(options) {
        this.model.setHouseholdSize(options.numKids, options.numAdults);
        this.setView(options.nextScreenId);
    };

    Controller.prototype.toggleDetailsForm = function(view) {
        this.model.toggleDetailsForm(view);
    };

    Controller.prototype.handleNameInput = function(person, name) {
        this.model.updatePerson(person, {name: name});
    };

    Controller.prototype.handleBooleanRadioClick = function(person, name, checked) {
        var propNameMap = {
            "is-student": "isStudent",
            "is-homeless": "isHomeless",
            "is-foster-child": "isFosterChild",
            "is-hispanic": "isHispanic",
            "is-hispanic-declined": "isHispanicDeclined"
        };
        var propName = propNameMap[name];
        var options = {};
        options[propName] = checked;
        this.model.updatePerson(person, options);
    };

    Controller.prototype.handleRaceCheckboxClick = function(person, races) {
        this.model.updatePerson(person, {races: races});
    };

    Controller.prototype.handleSaveBtnClick = function(view, person) {
        this.model.savePerson(person);
        this.model.toggleDetailsForm(view);
    };

    Controller.prototype.handleDeleteBtnClick = function(person) {
        this.model.deletePerson(person);
        // TODO this is kind of a hack because event listening is not working
        // correctly at the moment:
        window.location.reload();
    };

    Controller.prototype.handleAddPersonClick = function(options) {
        this.model.addPerson(options);
        // TODO this is kind of a hack because event listening is not working
        // correctly at the moment:
        window.location.reload();
    };

    Controller.prototype.handleLast4SSNInput = function(last4SSN) {
        this.model.set("last4SSN", last4SSN);
    };

    Controller.prototype.handleHasSSNRadioClick = function(hasSSN) {
        this.model.set("hasSSN", hasSSN);
    };

    Controller.prototype.handleContinueBtnClick = function(options) {
        this.setView(options.nextScreenId);
    };

    Controller.prototype.handleHasOtherHelpRadioClick = function(hasOtherHelp) {
        this.model.set("hasOtherHelp", hasOtherHelp);
    };

    Controller.prototype.handleCaseNumberInput = function(caseNumber) {
        this.model.set("caseNumber", caseNumber);
    };

    Controller.prototype.handleIncomeUpdate = function(person, type, options) {
        this.model.updatePersonIncome(person, type, options);
    };

    Controller.prototype.handleHasAddressRadioClick = function(hasAddress) {
        this.model.set("hasAddress", hasAddress);
    };

    Controller.prototype.handleSubmit = function(values) {
        values.forEach(function(obj) {
            this.model.set(obj.name, obj.value);
        }.bind(this));
        // TODO: send model values to server
        this.model.clear();
        this.setView("submitted");
    };

    Controller.prototype.setView = function(id) {
        window.location.hash = "#" + id;
    };

    Controller.prototype.getViewToLoad = function(id) {
        return this.views[id];
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

    Controller.prototype.loadView = function(id) {
        console.debug("setting view '%s'", id);

        var allFosterKids = this.model.kids().all(function(p) { return p.isFosterChild });
        if ((id === "adults" || id === "income") && (this.model.get("hasOtherHelp") || allFosterKids)) {
            console.debug("short-circuit %s due to hasOtherHelp == true || all foster kids", id);
            controller.setView("review");
            return;
        }

        this.hideAll();
        qs("#" + id).classList.add("show");
        qs("#" + id).classList.remove("hide");
        this.setActiveNavTab(id);

        if (this.activeView && this.activeView.unload) {
            this.activeView.unload();
            this.model.reset();
            this.events.notify("view:unloaded");
        }

        var viewToLoad = this.getViewToLoad(id);
        if (viewToLoad) {
            var view = new viewToLoad({model: this.model});
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

    Controller.prototype.setActiveNavTab = function(viewId) {
        var progress = this.progress.indexOf(viewId);
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
        }.bind(this));
    };

    Controller.prototype.hideAll = function() {
        qsa(".screen").forEach(function(el) {
            el.classList.add("hide");
            el.classList.remove("show");
        });
    };

    // the app

    function initDebugging() {
        function updateDebugWindow() {
            var store = JSON.stringify(model.data, null, 4);
            var formDisplay = model.formDisplay.map(function(state) {
                return {view: state.view.person.id, show: state.show};
            });
            var extra = JSON.stringify({
                editingPerson: model.editingPerson,
                formDisplay: formDisplay
            }, null, 4);
            qs("#debug pre").innerText = "extra:\n" + extra + "\n\nmodel:\n" + store;
        }

        model.on("saved", updateDebugWindow);
        model.on("startEditing", updateDebugWindow);
        model.on("stopEditing", updateDebugWindow);
        model.on("editedPerson", updateDebugWindow);
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

    $on(window, "DOMContentLoaded", function() {
        var store = new Store("lunchux");
        var model = this.model = new Model(store);
        var controller = this.controller = new Controller(model);
        var initialViewId = "get-started";

        initDebugging();

        function loadView() {
            var id = window.location.hash ? window.location.hash.slice(1) : initialViewId;
            controller.loadView(id);
        }

        $on(window, "hashchange", loadView);
        loadView();
    }, false);
}());
