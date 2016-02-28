describe("Person", function() {

  it("should set some defaults on a new Person object", function(){
    var person = new Person({});
    expect(person.id).not.toBe(null);
    expect(person.name).toEqual("");
    expect(person.ageClass).toEqual(AgeClass.child);
    expect(person.isStudent).toBe(undefined);
    expect(person.isHomeless).toBe(undefined);
    expect(person.incomes).toEqual({});
  });

  it("should set attributes on a new Person object", function(){
    var options = {
      id: 123,
      name: "John Doe",
      ageClass: AgeClass.adult,
      isStudent: false,
      isHomeless: false,
      incomes: {salary: 10000}
    };
    var person = new Person(options);
    expect(person.id).toEqual(123);
    expect(person.name).toEqual("John Doe");
    expect(person.ageClass).toEqual(AgeClass.adult);
    expect(person.isStudent).toBe(false);
    expect(person.isHomeless).toBe(false);
    expect(person.incomes).toEqual({salary: 10000});
  });

  it("should validate a person if they have a name", function(){
    var person = new Person({name: "John Doe"});
    expect(person.valid()).toBe(true);
  });

  it("should not validate a person if they have no name", function(){
    var person = new Person({});
    expect(person.valid()).toBe(false);
  });
});
