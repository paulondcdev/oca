const assert = require('assert');
const minimatch = require('minimatch'); // eslint-disable-line
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Text Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: text');
    assert.equal(input.value, null);
  });

  it('Integer should not be considered as text', (done) => {
    const input = Input.create('input: text');
    input.value = 1;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.message === 'Value needs to be a string' ? null : err);
    });
  });

  it('String value should be valid', (done) => {
    const input = Input.create('input: text');
    input.value = 'value';
    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should accept a string array', (done) => {
    const input = Input.create('input: text[]');
    input.value = ['a', 'b', 'c'];

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail when the array contains a non string value', (done) => {
    const input = Input.create('input: text[]');
    input.value = ['a', 2, 'c'];

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'Value needs to be a string') ? null : err);
    });
  });

  it('Should fail to serialize', (done) => {
    const input = Input.create('input: text[]');
    input.value = ['a', 2, 'c'];

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'Value needs to be a string') ? null : err);
    });
  });

  it("When 'min' property is set, it should not allow strings shorter than the minimum", (done) => {
    const input = Input.create('input: text', {min: 4});
    input.value = 'foo';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'Value is too short, it needs to have at least * characters') ? null : err);
    });
  });

  it("When 'max' property is set, it should not allow strings longer than the maximum", (done) => {
    const input = Input.create('input: text', {max: 2});
    input.value = 'foo';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'Value is too long, maximum is * characters') ? null : err);
    });
  });

  it("When 'regex' property is set, it should validate date based on a regex pattern", (done) => {
    const input = Input.create('input: text', {regex: '[0-9]{2}/[0-9]{2}/[0-9]{4}'});
    input.value = '25/05/1984';
    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it("When 'regex' property is set, it should not validate the input with a wrong date format based on a regex pattern", (done) => {
    const input = Input.create('input: text', {regex: '[0-9]{2}/[0-9]{2}/[0-9]{4}'});
    input.value = 'AA/05/1984';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.message === 'Value does not meet the requirements' ? null : err);
    });
  });

  it("An empty string assigned as value should be considered as empty when calling 'isEmpty'", () => {
    const input = Input.create('input: text', {required: true});
    input.value = '';
    assert(input.isEmpty);
  });
});
