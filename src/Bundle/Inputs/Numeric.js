const util = require('util');
const TypeCheck = require('js-typecheck');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');


/**
 * Numeric input
 *
 * ```javascript
 * const input = Input.create('myInput: numeric');
 * input.value = 5;
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * min | minimum permitted value | `false` |
 * max | maximum permitted value | `false` |
 */
class Numeric extends Input{

  /**
   * Implements the numeric validations
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
    if (!TypeCheck.isNumber(value)){
      throw new ValidationError('Value needs to be a number', Numeric.errorCodes[0]);
    }
    // min property
    else if (this.hasProperty('min') && value < this.property('min')){
      throw new ValidationError(util.format('Value needs to be greater or equal to the minimum: %d', this.property('min')), Numeric.errorCodes[1]);
    }
    // max property
    else if (this.hasProperty('max') && value > this.property('max')){
      throw new ValidationError(util.format('Value needs to be less or equal to the maximum: %d', this.property('max')), Numeric.errorCodes[2]);
    }

    return value;
  }

  /**
   * Decodes the value by casting it to the type that is compatible with the input
   *
   * @param {string} value - string containing the encoded value
   * @return {number}
   * @protected
   */
  static _decode(value){
    return Number(value);
  }

  static errorCodes = [
    'b9f7f1bf-18a3-45f8-83d0-aa8f34f819f6',
    '12e85420-04ae-4ef0-b64c-400b68bced3c',
    'd1d3ffc2-67e9-4404-873c-199603ca7632',
  ];
}

// registering the input
Input.registerInput(Numeric);

module.exports = Numeric;
