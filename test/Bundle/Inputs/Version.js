const assert = require('assert');
const minimatch = require('minimatch'); // eslint-disable-line
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Version Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: version');
    assert.equal(input.value, null);
  });

  it('Minimum required should fail when the input value has a version that is bellow of the required one', (done) => {
    const input = Input.create('input: version', {minimumRequired: '9.1.3'});
    input.value = '9.0.3';
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(minimatch(err.message, 'Version is not compatible, minimum Version required: *, current version *') ? null : err);
    });
  });

  it('Minimum required should allow a version that is greater than the required one', (done) => {
    const input = Input.create('input: version', {minimumRequired: '10.1.2'});
    input.value = '10.1.3';
    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Minimum required should work when the input value is set with only major.minor version', (done) => {
    const input= Input.create('input: version', {minimumRequired: '9.0.0'});
    input.value = '10.0';
    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Minimum required should work when the input value is set with only major version', (done) => {
    const input= Input.create('input: version', {minimumRequired: '9.0.0'});
    input.value = '10';
    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail when the version is not defined as string', (done) => {
    const input= Input.create('input: version', {minimumRequired: '9.0.0'});
    input.value = 10;
    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });
});
