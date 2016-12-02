const TypeCheck = require('js-typecheck');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');


/**
 * Timestamp input
 *
 * ```javascript
 * const input = Input.create('myInput: timestamp');
 * input.value = new Date();
 * ```
 */
class Timestamp extends Input{

  /**
   * Implements the Timestamp validations
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
    if (!(TypeCheck.isInstanceOf(value, Date) && TypeCheck.isNumber(value.getTime()))){
      throw new ValidationError('Value needs to be a valid Date', Timestamp.errorCodes[0]);
    }

    return value;
  }

  /**
   * Decodes the value by casting it to the type that is compatible with the input
   *
   * @param {string} value - string containing the encoded value
   * @return {Date}
   * @protected
   */
  static _decode(value){
    return new Date(value);
  }

  static errorCodes = [
    '93b2fcf4-7fc6-4a3d-bfff-4504b37b9801',
  ];
}

// registering the input
Input.registerInput(Timestamp);

module.exports = Timestamp;
