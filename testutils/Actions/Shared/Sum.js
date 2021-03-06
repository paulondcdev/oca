const Oca = require('../../../src');

class Sum extends Oca.Action{
  constructor(){
    super();

    this.createInput('a: numeric');
    this.createInput('b: numeric');
  }

  _perform(data){
    return Promise.resolve(data.a + data.b);
  }
}

module.exports = Sum;
