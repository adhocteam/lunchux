function extend(dest, src) {
    for (var k in src) {
        if (src.hasOwnProperty(k)) {
            dest[k] = src[k];
        }
    }
    return dest;
}

function Person(options) {
    this.id = options.id || nextId();
    this.name = options.name || "";
    this.ageClass = options.ageClass || AgeClass.child;
    this.isStudent = options.isStudent;
    this.isFosterChild = options.isFosterChild;
    this.isHomeless = options.isHomeless;
    this.isHispanic = options.isHispanic;
    this.isHispanicDeclined = options.isHispanicDeclined;
    this.races = options.races || [];
    this.incomes = options.incomes || {};
};

Person.prototype.valid = function() {
    return this.name !== "";
};

var AgeClass = {
    child: 1,
    adult: 2
};

var nextId = (function() {
    var id = 0;
    return function() {
        return ++id;
    };
}());

function Model(store) {
    this.store = store;
    this.events = new LunchUX.Event();

    this.data = store.load() || this.defaultValues();

    this.editingPerson = null;
    this.formDisplay = [];
}

Model.prototype.clear = function() {
    this.data = this.defaultValues();
    this.store.reset();
};

Model.prototype.defaultValues = function() {
    return {
        people: [],
        hasSSN: false,
        last4SSN: "",
        hasOtherHelp: false,
        caseNumber: "",
        phone: "",
        email: "",
        hasAddress: false,
        street: "",
        city: "",
        state: "",
        zip: "",
        readNonDiscriminationStatement: false,
        readUseOfInformationStatement: false,
        signature: ""
    };
};

Model.prototype.setInitialHousehold = function() {
    this.data.people = [];
    this.data.people.push(new Person({name: "Kid #1", ageClass: AgeClass.child}));
    this.data.people.push(new Person({name: "Adult #1", ageClass: AgeClass.adult}));
    this.save();
};

Model.prototype.addPerson = function(options) {
    var person = new Person(options);
    this.data.people.push(person);
    this.save();
    this.events.notify("addedPerson", person);
}

Model.prototype.deletePerson = function(person) {
    var index;
    this.data.people.forEach(function(p, i) {
        if (p === person) {
            index = i;
        }
    });
    this.data.people.splice(index, 1);
    this.save();
    this.events.notify("deletedPerson", person);
};

Model.prototype.all = function() {
    return this.data;
};

Model.prototype.reset = function() {
    this.editingPerson = null;
    this.formDisplay = [];
};

Model.prototype.toggleDetailsForm = function(view) {
    var state;
    var found = false;

    this.formDisplay.forEach(function(s) {
        if (s.view === view) {
            found = true;
            state = s;
        }
    }.bind(this));

    if (!found) {
        state = {view: view, show: true}; // show on initial click
        this.formDisplay.push(state);
    } else {
        state.show = !state.show;
    }

    if (state.show) {
        this.formDisplay.forEach(function(s) {
            if (s.view !== view && s.show) {
                s.show = false;
                this.events.notify("toggleDetailsForm", s.view, false);
            }
        }.bind(this));
        this.startEditing(view.person);
    } else {
        this.stopEditing();
    }

    this.events.notify("toggleDetailsForm", view, state.show);
}

Model.prototype.startEditing = function(person) {
    this.editingPerson = extend({}, person);
    this.events.notify("startEditing");
};

Model.prototype.stopEditing = function() {
    this.editingPerson = null;
    this.events.notify("stopEditing");
};

Model.prototype.showDetailsForm = function(view) {
    if (!(view in this.detailsFormHidden)) {
        return false; // initially hidden
    }
    return !this.detailsFormHidden[view];
};

Model.prototype.kids = function() {
    return this.all().people.filter(function(person) { return person.ageClass === AgeClass.child; });
};

Model.prototype.adults = function() {
    return this.all().people.filter(function(person) { return person.ageClass === AgeClass.adult; });
};

Model.prototype.on = function(type, handler) {
    this.events.bind(type, handler);
};

Model.prototype.save = function() {
    this.store.save(this.data);

    this.events.notify("saved");
};

Model.prototype.personIsBeingEdited = function(person) {
    return person.id === this.editingPerson.id;
};

Model.prototype.updatePerson = function(person, props) {
    if (!this.personIsBeingEdited(person)) {
        console.error("view state out of sync -- expected editingPerson id (%d) to match update id (%d)", person.id, this.editingPerson.id);
        return;
    }
    this.editingPerson = extend(this.editingPerson || extend({}, person), props);
    this.events.notify("editedPerson");
};

Model.prototype.savePerson = function(person) {
    if (!this.personIsBeingEdited(person)) {
        console.error("view state out of sync -- expected editingPerson id (%d) to match update id (%d)", person.id, this.editingPerson.id);
        return;
    }
    var current = null;
    for (var i = 0, people = this.all().people; i < people.length; i++) {
        var p = people[i];
        if (p.id === this.editingPerson.id) {
            extend(p, this.editingPerson);
            current = p;
            break;
        }
    }
    this.stopEditing();
    this.save();
    this.events.notify("updatedPerson", {previous: person, current: current});
};

Model.prototype.get = function(prop) {
    return this.data[prop];
};

Model.prototype.set = function(prop, value) {
    this.data[prop] = value;
    this.save();
    this.events.notify("updated:" + prop);
};

Model.prototype.updatePersonIncome = function(person, type, options) {
    if (!this.personIsBeingEdited(person)) {
        console.error("view state out of sync -- expected editingPerson id (%d) to match update id (%d)", person.id, this.editingPerson.id);
        return;
    }
    var incomes = this.editingPerson.incomes || {};
    var income = incomes[type] || {};
    extend(income, options);
    incomes[type] = income;
    this.editingPerson.incomes = incomes;
    this.events.notify("editedPerson");
};
