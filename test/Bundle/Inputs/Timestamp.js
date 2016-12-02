const assert = require('assert');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Timestamp Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: timestamp');
    assert.equal(input.value, null);
  });

  it('Date value should be accepted', (done) => {
    const input = Input.create('input: timestamp');
    input.value = new Date();

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Invalid date value should be allowed', (done) => {
    const input = Input.create('input: timestamp');
    input.value = new Date('invalid');

    input.validate.bind(input)().then((value) => {
      done(new Error(`unexpected value ${value}`));
    }).catch((err) => {
      done();
    });
  });

  const stringValue = String(new Date());
  it('Value should be able to be parsed from a string', (done) => {
    const input = Input.create('input: timestamp');
    input.parseValue(stringValue);

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Value should be able to be serialized as string', (done) => {
    const input = Input.create('input: timestamp');
    input.parseValue(stringValue);

    input.serializeValue().then((value) => {
      done(value === stringValue ? null : new Error(`unexpected value: ${value}`));
    }).catch((err) => {
      done(err);
    });
  });
});
