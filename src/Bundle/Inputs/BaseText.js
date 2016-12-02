const TypeCheck = require('js-typecheck');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');


/**
 * Base text input class derived by all text input implementations
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * regex | custom regular expression to test the value | `false` |
  */
class BaseText extends Input{

  /**
   * Returns if the input is empty
   * @type {boolean}
   */
  get isEmpty(){
    return (super.isEmpty || this.value.length === 0);
  }

  /**
   * Implements the string validations
   *
   * @param {number} [at] - index used when the input is defined as vector to
   * tell which value should be used
   * @return {*} value held by the input based on the current context (at)
   * @protected
   */
  async _validation(at=null){

    // calling super class validations
    // todo: babel does not support 'await' calling a method under 'super'
    // https://github.com/babel/babel/issues/3930
    // const value = await super._validation(at);
    const value = await Input.prototype._validation.call(this, at);

    // type checking
    if (!TypeCheck.isString(value)){
      throw new ValidationError('Value needs to be a string', BaseText.errorCodes[0]);
    }

    // regex property
    else if (this.property('regex', false) && (!(new RegExp(this.property('regex'))).test(value))){
      throw new ValidationError('Value does not meet the requirements', BaseText.errorCodes[1]);
    }

    return value;
  }

  static errorCodes = [
    '71b205ae-95ed-42a2-b5e9-ccf8e42ba454',
    'c902610c-ef17-4a10-bc75-887d1550793a',
  ];
}

module.exports = BaseText;
