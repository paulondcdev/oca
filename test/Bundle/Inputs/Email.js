const assert = require('assert');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Email Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: email');
    assert.equal(input.value, null);
  });

  it('Should accept a valid email', (done) => {
    const input = Input.create('input: email');
    input.value = 'test@somedomain.com';

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should not accept an invalid email', (done) => {
    const input = Input.create('input: email');
    input.value = 'test@somedomain';

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });
});
