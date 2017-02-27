const assert = require('assert');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Numeric Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: numeric');
    assert.equal(input.value, null);
  });

  it('Should create the input using the alias: number', () => {
    const input = Input.create('input: number');
    assert(input instanceof Oca.Ext.Inputs.Numeric);
  });

  it('Integer value should be valid', () => {
    const input = Input.create('input: numeric');
    input.value = 1;
    return input.validate.bind(input)();
  });

  it('String value should not be valid', (done) => {
    const input = Input.create('input: numeric');
    input.value = '1';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it("When 'min' property is set, it should not allow a numeric value less than the minimum", (done) => {
    const input = Input.create('input: numeric', {min: -5});
    input.value = -10;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));

    }).catch((err) => {
      done((err.code === '12e85420-04ae-4ef0-b64c-400b68bced3c') ? null : err);
    });
  });

  it("When 'max' property is set, it should not allow a numeric value greater than the maximum", (done) => {
    const input = Input.create('input: numeric', {max: 5});
    input.value = 10;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.code === 'd1d3ffc2-67e9-4404-873c-199603ca7632') ? null : err);
    });
  });
});
