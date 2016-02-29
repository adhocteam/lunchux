var Model = LunchUX.Model;
var Person = LunchUX.Person;
var AgeClass = LunchUX.AgeClass;

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

  describe('setInitialHousehold', function() {
      it('should set an initial household of 1 child and 1 adult', function() {
          var store = new InMemoryStore('lunchux-test');
          var model = new Model(store);
          expect(model.get('people').length).toEqual(0);
          model.setInitialHousehold();
          expect(model.get('people').length).toEqual(2);
          expect(model.kids().length).toEqual(1);
          expect(model.adults().length).toEqual(1);
          expect(model.kids()[0].name).toEqual('');
          expect(model.adults()[0].name).toEqual('');
      });
  });

  describe('addPerson', function() {
    it('should add a person to the household', function(){
      var store = new InMemoryStore('lunchux-test');
      var model = new Model(store);
      model.addPerson({name: 'New Person', AgeClass: AgeClass.adult});
      expect(model.data.people[0].name).toEqual('New Person');
    });
  });

  describe('reset', function(){
    it('should reset the state of the model', function(){
      var store = new InMemoryStore('lunchux-test');
      var model = new Model(store);
      model.formDisplay = ['Form Display'];
      model.reset();
      expect(model.formDisplay).toEqual([]);
    });
  });

  describe("get and set", function(){
    var store = new InMemoryStore('lunchux-test');
    var model = new Model(store);

    it("should get data from the underlying data model", function(){
      model.data.last4SSN = "1234";
      expect(model.get("last4SSN")).toEqual("1234");
    });

    it("should set data to the underlying model", function(){
      model.set("last4SSN", "4321");
      expect(model.data.last4SSN).toEqual("4321");
    });
  });

    describe("existing session", function() {
        var store = new InMemoryStore("lunchux-test");
        var model = new Model(store);

        it("should not have an existing session initially", function() {
            expect(model.hasExistingSession()).toBe(false);
        });

        it("should have an existing session", function() {
            model.setInitialHousehold();
            var newModel = new Model(store);
            expect(newModel.hasExistingSession()).toBe(true);
        });
    });

    describe("sortedHousehold", function() {
        var store = new InMemoryStore("lunchux-test");
        var model = new Model(store);

        var kid1 = new Person({name: "Kid 1", ageClass: AgeClass.child});
        var kid2 = new Person({name: "Kid 2", ageClass: AgeClass.child});
        var adult1 = new Person({name: "Adult 1", ageClass: AgeClass.adult});
        var adult2 = new Person({name: "Adult 2", ageClass: AgeClass.adult});
        var kid3 = new Person({name: "Kid 3", ageClass: AgeClass.child});

        var addOrder = [kid1, adult1, kid2, adult2, kid3];
        var sortOrder = [kid1, kid2, kid3, adult1, adult2];

        addOrder.forEach(function(p) {
            model.addPerson(p);
        });

        it("should be sorted kids first then adults", function() {
            var household = model.sortedHousehold();
            for (var i = 0; i < sortOrder.length; i++) {
                expect(household[i]).toBe(sortOrder[i]);
            }
        });
    });
});
