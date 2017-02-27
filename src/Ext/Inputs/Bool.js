const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
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
 *
 * *This input can also be created using the alias:* `boolean`
 *
 * <h2>Property Summary</h2>
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class Bool extends Input{

  /**
   * Implements the boolean validations
   *
   * @param {null|number} at - index used when the input is defined as vector to
   * tell which value should be used
   * @return {Promise<*>} value held by the input based on the current context (at)
   * @protected
   */
  _validation(at){

    // calling super class validations
    return super._validation(at).then((value) => {

      // type checking
      if (!TypeCheck.isBool(value)){
        throw new ValidationFail('Value needs to be a boolean', Bool.errorCodes[0]);
      }

      return value;
    });
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

// also, registering as 'boolean' for convenience
Input.registerInput(Bool, 'boolean');

module.exports = Bool;
