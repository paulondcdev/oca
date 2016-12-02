const TypeCheck = require('js-typecheck');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');


/**
 *
 * This input type holds any kind of object, however it's not exposed for
 * requests. It's intended to be used internally
 *
 * ```javascript
 * const input = Input.create('myInput: any');
 * input.value = {a: 1};
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * type | Specific object type that should be allowed by the input | `false` |
 */
class Any extends Input{

  /**
   * Creates the Generic Object Input
   *
   */
  constructor(...args){
    super(...args);

    // making the input as private (not available for requests)
    this.assignProperty('private', true);
  }

  /**
   * Implements the object validations
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
    if (!TypeCheck.isObject(value)){
      throw new ValidationError('Value needs to be an object!', Any.errorCodes[0]);
    }
    else if (this.hasProperty('type') && !TypeCheck.isInstanceOf(value, this.property('type'))){
      throw new ValidationError(`Invalid object type: ${value.constructor.name}, expecting ${this.property('type').name}`, Any.errorCodes[1]);
    }

    return value;
  }

  /**
   * Implements the parsing of the object
   *
   * @param {string} value - string containing the serialized value
   * @throws Error cannot be serialized
   */
  parseValue(value){
    throw new Error('Cannot be parsed!');
  }

  /**
   * Implements the serialization of the object
   *
   * @throws Error cannot be serialized
   */
  serializeValue(){
    throw new Error('Cannot be serialized!');
  }

  static errorCodes = [
    '25c9158a-30ee-4a9f-8767-bc2c170f77fd',
    'd59814e4-0432-435a-b116-4491819c58d4',
  ];
}

// registering the input
Input.registerInput(Any);

module.exports = Any;
