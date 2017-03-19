const assert = require('assert');
const Oca = require('../src');

const Writer = Oca.Writer;


describe('Writer:', () => {

  class CustomWriter extends Writer{
    constructor(value){
      super(value);
      this.result = {};
      this.options.defaultOption = 'test';
    }

    _errorOutput(){
      return Object.assign(this.result, super._errorOutput());
    }

    _successOutput(){
      return Object.assign(this.result, super._successOutput());
    }
  }

  it('Should test custom options defined to the writer', () => {

    const writer = new CustomWriter(20);
    // default option
    assert.equal(writer.options.defaultOption, 'test');
  });

  it('Should test serialize a value as output', () => {

    const value = 20;

    const writer = new CustomWriter(value);
    writer.serialize();

    assert.equal(writer.result.data, value);
  });

  it('Should test serialize an error as output', () => {

    const err = new Error('Some Error');

    const writer = new CustomWriter(err);
    writer.serialize();

    assert.equal(writer.result.error.code, 500);
    assert.equal(writer.result.error.message, err.message);
  });
});
