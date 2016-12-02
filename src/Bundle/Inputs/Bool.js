const TypeCheck = require('js-typecheck');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');


/**
 * Boolean input
 *
 * ```javascript
 * const input = Input.create('myInput: bool');
 * input.value = false;
 * ```
 *
 * ```javascript
 * // vector version
 * const input = Input.create('myInput: bool[]');
 * input.value = [false, true, false];
 * ```
 */
class Bool extends Input{

  /**
   * Implements the boolean validations
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

    if (!TypeCheck.isBool(value)){
      throw new ValidationError('Value needs to be a boolean', Bool.errorCodes[0]);
    }

    return value;
  }

  /**
   * Decodes the input value from the string representation ({@link _encode}) to the
   * data type of the input. This method is called internally during {@link parseValue}
   *
   * @param {string} value - string containing the encoded value
   * @return {bool}
   * @protected
   */
  static _decode(value){
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Encodes the input value to a string representation that can be later decoded
   * through {@link _decode}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {*} value - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encode(value){
    return (value) ? '1' : '0';
  }

  static errorCodes = [
    '4304c51a-a48f-41d2-a2b8-9ba43c6617f3',
  ];
}

// registering the input
Input.registerInput(Bool);

module.exports = Bool;
