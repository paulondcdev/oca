const assert = require('assert');
const Oca = require('../../../src');
const minimatch = require('minimatch'); // eslint-disable-line
const Input = Oca.Input;


describe('Numeric Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: numeric');
    assert.equal(input.value, null);
  });

  it('Integer value should be valid', (done) => {
    const input = Input.create('input: numeric');
    input.value = 1;
    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
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
      done(minimatch(err.message, 'Value needs to be greater or equal to the minimum: *') ? null : err);
    });
  });

  it("When 'max' property is set, it should not allow a numeric value greater than the maximum", (done) => {
    const input = Input.create('input: numeric', {max: 5});
    input.value = 10;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'Value needs to be less or equal to the maximum: *') ? null : err);
    });
  });
});
