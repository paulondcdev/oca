const Oca = require('../../../src');


class PlainObjectResult extends Oca.Action{
  constructor(){
    super();
    this.createInput('a: text');
    this.createInput('b: numeric');
  }

  _perform(data){
    return {
      a: data.a,
      b: data.b,
    };
  }
}

module.exports = PlainObjectResult;
