const assert = require('assert');
const TypeCheck = require('js-typecheck');
const minimatch = require('minimatch'); // eslint-disable-line
const Oca = require('../src');

const Input = Oca.Input;
const ValidationError = Oca.ValidationError;


describe('Input:', () => {

  // initializing oca
  Oca.initialize();

  const testInstance = () => new Input('test', {propertyA: 1, propertyB: 2, propertyC: 3, defaultValue: 'foo'}, function customValidation(){

    return new Promise((resolve, reject) => {
      if (this.value !== 'new foo'){
        reject(new ValidationError('oops, not yet'));
      }
      else{
        resolve(this.value);
      }
    });
  });

  it("Input name should be 'test'", () => {
    assert.equal(testInstance().name, 'test');
  });

  it('Should return the available property names', () => {

    const input = new Input('inputName');
    input.assignProperty('test', true);

    assert(input.propertyNames.includes('test'));
  });

  it('Should register a custom input type', () => {

    class CustomInput extends Input{}

    Input.registerInput(CustomInput);
    Input.registerInput(CustomInput, 'CustomInputName_.-1');

    assert(Input.registeredInputNames.includes('CustomInput'.toLowerCase()));
    assert(Input.registeredInputNames.includes('CustomInputName_.-1'.toLowerCase()));
  });

  it('Should fail to register a custom input type with invalid name', () => {

    class CustomInput extends Input{}

    Input.registerInput(CustomInput);

    let error = null;
    try{
      Input.registerInput(CustomInput, 'CustomInputName$');
    }
    catch(err){
      error = err;
    }

    if (error && minimatch(error.message, 'Invalid input name: *')){
      return;
    }

    throw error || new Error('Unexpected result');
  });

  it('Should set an input through setupFrom', () => {

    class CustomInput extends Input{}

    const a = new CustomInput('inputA', {defaultValue: 10});
    a.cache.set('someValue', 20);

    // with cache support
    const b = new CustomInput('inputB');
    b.setupFrom(a);
    assert.equal(b.cache.get('someValue'), a.cache.get('someValue'));
    assert.equal(b.value, a.value);

    // without cache support
    const c = new CustomInput('inputC');
    c.setupFrom(a, null, false);
    assert(!c.cache.has('someValue'));
    assert.equal(c.value, a.value);
  });

  it('Should factory a registered input through create', () => {

    class A extends Input{}

    Input.registerInput(A);
    assert(TypeCheck.isInstanceOf(Input.create('input: A'), A));

    assert.equal(Input.create('input?: A').property('required'), false);

    // should fail when the creation syntax is not defined properly
    let syntaxFailed = false;
    try{
      Input.create('input A');
    }
    catch(err){
      syntaxFailed = true;
    }

    assert(syntaxFailed, 'It should fail when the syntax is not properly defined');

    // should fail when the type defined in the creation syntax is not found
    let typeFailed = false;
    try{
      Input.create('input: InvalidType');
    }
    catch(err){
      typeFailed = true;
    }
    assert(typeFailed, 'It should fail when creating an invalid input type');
  });

  it('Should parse and serialize the input value', (done) => {
    const inputA = new Input('input');
    inputA.value = 'Some Value';

    inputA.serializeValue().then((value) => {

      const inputB = new Input('input');
      inputB.parseValue(value);

      done(inputB.value === inputA.value ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });

  it('When querying an input name that is not registered it should return null', () => {
    assert.equal(Input.registeredInput('InvalidRegisteredName'), null);
  });

  it('Initial Value should match value defined at constructing time', () => {
    const i = testInstance();
    assert.equal(i.property('defaultValue'), 'foo');
    assert.equal(i.value, 'foo');
  });

  it('Value assigned to the input should be set as immutable by default', () => {

    const inputA = new Input('input', {vector: true});
    inputA.value = [1, 2, 3];

    try{
      inputA.value[1] = 'new value';
      throw new Error('Unexpected result');
    }
    catch(err){
      assert(minimatch(err.message, "Cannot assign to read only property '*' of object '*'"));
    }
  });

  it('Immutable flag can be disabled', () => {

    const inputA = new Input('input', {vector: true, immutable: false});
    inputA.value = [1, 2, 3];
    inputA.value[1] = 'new value';

    assert.equal(inputA.value[1], 'new value');
  });

  it('Should fail when the value of the input is not a vector and the input is setup as a vector', (done) => {

    const input1 = new Input('input', {vector: true});
    input1.value = 'not value';
    input1.validate().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((minimatch(err.message, 'Input needs to be a vector!')) ? null : err);
    });
  });

  it('Custom properties should match their value defined at constructing time', () => {
    const i = testInstance();
    assert.equal(i.property('propertyA'), 1);
    assert.equal(i.property('propertyB'), 2);
    assert.equal(i.property('propertyC'), 3);
  });

  it('Extended validation callback should fail when asking if the value is valid', (done) => {
    const input1 = testInstance();
    input1.validate.bind(input1)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.message === 'oops, not yet' ? null : err);
    });
  });

  it('Extended validation should not return any message', (done) => {
    const input2 = testInstance();
    input2.value = 'new foo';
    input2.validate.bind(input2)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it("When the property 'required' is set (comes on by default), it should not allow null or undefined types", (done) => {
    const input3 = testInstance();
    input3.value = null;

    input3.validate.bind(input3)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.message === 'Input is required, it cannot be empty!' ? null : err);
    });
  });

  it("Extended validation should have 'this' as context int the input object", (done) => {

    const input4 = new Input('test', {defaultValue: 'foo', customProperty1: true}, function customValidation(){
      return new Promise((resolve, reject) => {
        if (this.property && this.property('customProperty1')){
          resolve();
        }
        else{
          reject(new ValidationError(this.name, 'Properties are not working'));
        }
      });
    });

    input4.validate.bind(input4)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Input should have new value', () => {
    const i = testInstance();

    i.value = 10;
    assert.equal(i.value, 10);
    i.value = 'foo';
    assert.equal(i.value, 'foo');
  });

  it('Should not have duplicated error codes', () => {
    const passedErrorCodes = [];

    // base input
    for (const code of Input.errorCodes){
      if (passedErrorCodes.includes(code)){
        throw new Error(`Error code duplicated: ${code}`);
      }
      passedErrorCodes.push(code);
    }

    // bundle inputs
    for (const inputName in Oca.Bundle.Inputs){
      if (TypeCheck.isSubClassOf(Oca.Bundle.Inputs[inputName], Input)){
        for (const code of Oca.Bundle.Inputs[inputName].errorCodes){
          if (passedErrorCodes.includes(code)){
            throw new Error(`Error code duplicated: ${code}`);
          }
          passedErrorCodes.push(code);
        }
      }
    }
  });
});
