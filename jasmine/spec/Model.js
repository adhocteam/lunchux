describe('Model', function() {

  it('should initialize the data with default values', function(){
    var store = new InMemoryStore('lunchux-test');
    var model = new Model(store);
    expect(model.data).toEqual(model.defaultValues());
  });

  it('should initilize the data to whatever is in the store', function(){
    var store = new InMemoryStore('lunchux-test');
    store.save({numKids: 12});
    var model = new Model(store);
    expect(model.data).toEqual({numKids: 12});
  });

  describe('setHouseholdSize', function() {
    it('should set the household size for kids and adults', function(){
      var store = new InMemoryStore('lunchux-test');
      var model = new Model(store);
      model.setHouseholdSize(3, 2);
      expect(model.data['numKids']).toEqual(3);
      expect(model.data['numAdults']).toEqual(2);
      expect(model.data['people'][0]['name']).toEqual('Kid #1');
      expect(model.data['people'][1]['name']).toEqual('Kid #2');
      expect(model.data['people'][2]['name']).toEqual('Kid #3');
      expect(model.data['people'][3]['name']).toEqual('Adult #1');
      expect(model.data['people'][4]['name']).toEqual('Adult #2');
    });
  });

  describe('addPerson', function() {
    it('should add a person to the household', function(){
      var store = new InMemoryStore('lunchux-test');
      var model = new Model(store);
      model.addPerson({name: 'New Person', AgeClass: AgeClass.adult});
      expect(model.data['people'][0]['name']).toEqual('New Person');
    });
  });

  describe('reset', function(){
    it('should reset the state of the model', function(){
      var store = new InMemoryStore('lunchux-test');
      var model = new Model(store);
      model.editingPerson = "Editing Person";
      model.formDisplay = ['Form Display'];
      model.reset();
      expect(model.editingPerson).toBe(null);
      expect(model.formDisplay).toEqual([]);
    });
  });

  describe('kids and adults', function(){
    var store = new InMemoryStore('lunchux-test');
    var model = new Model(store);
    model.setHouseholdSize(4, 1);

    describe('kids', function(){
      it('should return the kids', function(){
        expect(model.kids().length).toEqual(4);
        for (i = 0; i < 4; i++) {
          expect(model.kids()[i]['name']).toEqual("Kid #" + (i+1));
        }
      });
    });

    describe('adults', function(){
      it('should return the adults', function(){
        expect(model.adults().length).toEqual(1);
        for (i = 0; i < 1; i++) {
          expect(model.adults()[i]['name']).toEqual("Adult #" + (i+1));
        }
      });
    });
  });

  describe('starting and stoping to edit a person', function(){
    var store = new InMemoryStore('lunchux-test');
    var model = new Model(store);
    var person = new Person({name: "Ima Edit"});

    it('should start and stop editing a person', function(){
      model.startEditing(person);
      expect(model.editingPerson).not.toBe(null);
      expect(model.editingPerson.name).toEqual("Ima Edit");
      expect(model.personIsBeingEdited(person)).toBe(true);
      model.stopEditing(person);
      expect(model.editingPerson).toBe(null);
    });

    it("should allow for updating a person only if they are being edited", function(){
      var otherPerson = new Person({name: "Editing Person"});
      model.startEditing(otherPerson);
      expect(model.updatePerson(person, {isHispanic: true})).toBe(undefined);
      expect(model.editingPerson.isHispanic).toBe(undefined)
      model.updatePerson(otherPerson, {isHispanic: true});
      expect(model.editingPerson.isHispanic).toBe(true);
    });

    it("should allow for saving a person that is being edited, which stops editing the person", function(){
      model.startEditing(person);
      model.savePerson(person);
      expect(model.editingPerson).toBe(null);
    });
  });

  describe("get and set", function(){
    var store = new InMemoryStore('lunchux-test');
    var model = new Model(store);

    it("should get data from the underlying data model", function(){
      model.data.numKids = 12;
      expect(model.get("numKids")).toEqual(12);
    });

    it("should set data to the underlying model", function(){
      model.set("numKids", 13);
      expect(model.data.numKids).toEqual(13);
    });
  });

  describe("updatePersonIncome", function(){
    var store = new InMemoryStore('lunchux-test');
    var model = new Model(store);
    var person = new Person({name: "Im Editing"});

    it("should not do anything if the person is not being edited", function(){
      var otherPerson = new Person({name: "Other Person"});
      model.startEditing(otherPerson);
      expect(model.updatePersonIncome(person, "salary", {amount: 100, occurence: "daily"})).toBe(undefined);
    });

    it("should update the person's income if they are being edited", function(){
      model.startEditing(person);
      expect(model.editingPerson.incomes["salary"]).toBe(undefined);
      model.updatePersonIncome(person, "salary", {amount: 100, occurence: "daily"});
      expect(model.editingPerson.incomes["salary"].amount).toEqual(100);
    });
  });
});