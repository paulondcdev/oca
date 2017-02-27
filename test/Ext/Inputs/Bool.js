const assert = require('assert');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Bool Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: bool');
    assert.equal(input.value, null);
  });

  it('Should create the input using the alias: boolean', () => {
    const input = Input.create('input: boolean');
    assert(input instanceof Oca.Ext.Inputs.Bool);
  });

  it('Input should fail when validating an empty value, it makes sure that the super class is being called', (done) => {
    const input = Input.create('input: bool');
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(err.code === '28a03a60-a405-4737-b94d-2b695b6ce156' ? null : err);
    });
  });

  it('Integer should not be considered as boolean', (done) => {
    const input = Input.create('input: bool');
    input.value = 1;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Boolean value should be valid', () => {
    const input = Input.create('input: bool');
    input.value = true;
    return input.validate.bind(input)();
  });

  it('Value should be able to be parsed from a string', () => {
    const input = Input.create('input: bool');
    input.parseValue('true');
    assert.equal(input.value, true);

    input.parseValue('1');
    assert.equal(input.value, true);

    return input.validate.bind(input)();
  });

  it('Value should be able to be serialized as string', (done) => {
    const input = Input.create('input: bool');
    input.parseValue('true');

    input.serializeValue().then((value) => {
      done(value === '1' ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });

  it('Vector value should be able to be parsed directly from a json version', () => {
    const testValue = JSON.stringify([true, false, true]);
    const input = Input.create('input: bool[]');
    input.parseValue(testValue);

    assert.equal(input.value.length, 3);
    assert.equal(input.value[0], true);
    assert.equal(input.value[1], false);
    assert.equal(input.value[2], true);
  });

  it('Vector value should be able to be parsed directly from a json version where each item is encoded as string', () => {
    return (async () => {

      const testValue = [true, false, true];
      const input = Input.create('input: bool[]');
      input.value = testValue;

      const serializedValue = await input.serializeValue();
      input.value = null;
      input.parseValue(serializedValue);

      assert.equal(input.value.length, 3);
      assert.equal(input.value[0], true);
      assert.equal(input.value[1], false);
      assert.equal(input.value[2], true);
    });
  });

  it('Vector value should be able to be serialized as string', (done) => {
    const input = Input.create('input: bool[]');
    input.value = [true, false, true];

    input.serializeValue().then((value) => {
      done((value === '["1","0","1"]') ? null : new Error('unexpected value'));
    }).catch((err) => {
      done(err);
    });
  });
});
