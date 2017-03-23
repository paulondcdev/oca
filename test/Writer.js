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
      this.result = super._errorOutput();
      return this.result;
    }

    _successOutput(){
      this.result = super._successOutput();
      return this.result;
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

    assert.equal(writer.result, value);
  });

  it('Should test serialize a vector value as output', () => {

    const value = [
      {a: 1},
      {a: 2},
    ];

    const writer = new CustomWriter(value);
    writer.serialize();

    assert(writer.result);
    assert.equal(writer.result.length, value.length);
    assert.equal(writer.result[0].a, value[0].a);
    assert.equal(writer.result[1].a, value[1].a);
  });

  it('Should test serialize an error as output', () => {

    const err = new Oca.Error.ValidationFail('Some Error');

    const writer = new CustomWriter(err);
    writer.serialize();
    assert.equal(writer.result, err.toJson());
  });
});
