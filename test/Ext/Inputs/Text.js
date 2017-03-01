const assert = require('assert');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Text Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: text');
    assert.equal(input.value, null);
  });

  it('Should create the input using the alias: string', () => {
    const input = Input.create('input: string');
    assert(input instanceof Oca.Ext.Inputs.Text);
  });

  it('Integer should not be considered as text', (done) => {
    const input = Input.create('input: text');
    input.value = 1;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '71b205ae-95ed-42a2-b5e9-ccf8e42ba454' ? null : err);
    });
  });

  it('String value should be valid', () => {
    const input = Input.create('input: text');
    input.value = 'value';
    return input.validate.bind(input)();
  });

  it('Should parse a vector value from JSON', () => {
    const input = Input.create('input: text[]');
    const data = ['a', null, ''];

    input.parseValue(JSON.stringify(data));

    assert.equal(input.value[0], 'a');
    assert.equal(input.value[1], null);
    assert.equal(input.value[2], null);
  });

  it('Should accept a string array', () => {
    const input = Input.create('input: text[]');
    input.value = ['a', 'b', 'c'];

    return input.validate.bind(input)();
  });

  it('Should fail when the array contains a non string value', (done) => {
    const input = Input.create('input: text[]');
    input.value = ['a', 2, 'c'];

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '71b205ae-95ed-42a2-b5e9-ccf8e42ba454') ? null : err);
    });
  });

  it('Should fail to serialize', (done) => {
    const input = Input.create('input: text[]');
    input.value = ['a', 2, 'c'];

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '71b205ae-95ed-42a2-b5e9-ccf8e42ba454') ? null : err);
    });
  });

  it("When 'min' property is set, it should not allow strings shorter than the minimum", (done) => {
    const input = Input.create('input: text', {min: 4});
    input.value = 'foo';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === '64358b78-ec83-4494-b734-0b1bdac43720') ? null : err);
    });
  });

  it("When 'max' property is set, it should not allow strings longer than the maximum", (done) => {
    const input = Input.create('input: text', {max: 2});
    input.value = 'foo';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === 'c7ff4423-2c27-4538-acd7-923dada7f4d3') ? null : err);
    });
  });

  it("When 'regex' property is set, it should validate date based on a regex pattern", () => {
    const input = Input.create('input: text', {regex: '[0-9]{2}/[0-9]{2}/[0-9]{4}'});
    input.value = '25/05/1984';
    return input.validate.bind(input)();
  });

  it("When 'regex' property is set, it should not validate the input with a wrong date format based on a regex pattern", (done) => {
    const input = Input.create('input: text', {regex: '[0-9]{2}/[0-9]{2}/[0-9]{4}'});
    input.value = 'AA/05/1984';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === 'c902610c-ef17-4a10-bc75-887d1550793a' ? null : err);
    });
  });

  it("An empty string assigned as value should be considered as empty when calling 'isEmpty'", () => {
    const input = Input.create('input: text', {required: true});
    input.value = '';
    assert(input.isEmpty);
  });
});
