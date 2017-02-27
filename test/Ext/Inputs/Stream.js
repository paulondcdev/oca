const assert = require('assert');
const stream = require('stream');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Stream Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: stream');
    assert.equal(input.value, null);
  });

  it('Stream should be accepted as value', () => {

    const input = Input.create('input: stream');
    input.value = new stream.Readable();

    return input.validate();
  });

  it('Should fail for non-stream value', (done) => {
    const input = Input.create('input: stream');
    input.value = 10;

    input.validate.bind(input)().then((value) => {
      done(new Error('Unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Should allow a readable stream type', () => {

    const input = Input.create('input: stream', {streamType: 'readable'});
    input.value = new stream.Readable();

    return input.validate();
  });

  it('Should allow a writable stream (type property)', () => {

    const input = Input.create('input: stream', {streamType: 'writable'});
    input.value = new stream.Writable();

    return input.validate();
  });

  it('Should allow a duplex stream (type property)', () => {

    const input = Input.create('input: stream', {streamType: 'duplex'});
    input.value = new stream.Duplex();

    return input.validate();
  });

  it('Should allow a transform stream (type property)', () => {

    const input = Input.create('input: stream', {streamType: 'transform'});
    input.value = new stream.Transform();

    return input.validate();
  });

  it('Should fail when a stream type does not match the specified one (type property)', (done) => {

    const input = Input.create('input: stream', {streamType: 'transform'});
    input.value = new stream.Writable();

    input.validate.bind(input)().then((value) => {
      done(new Error('Unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Input should not be serializable', (done) => {
    const input = Input.create('input: stream');
    input.value = new stream.Writable();

    input.serializeValue().then((value) => {
      done(new Error('Not expected result'));
    }).catch((err) => {
      done((err.message === 'serialization not supported!') ? null : err);
    });
  });

  it('Input should not be able to parse a value', () => {
    const input = Input.create('input: stream');

    let error = null;
    try{
      input.parseValue('Value');
    }
    catch(err){
      error = err;
    }

    assert(error);
    assert.equal(error.message, 'parsing not supported!');
  });
});
