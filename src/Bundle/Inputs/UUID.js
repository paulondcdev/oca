const uuid = require('uuid');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * UUID input
 *
 * ```javascript
 * const input = Input.create('myInput: uuid');
 * input.value = '075054e0-810a-11e6-8c1d-e5fb28c699ca';
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Universally_unique_identifier
 */
class UUID extends BaseText{

  /**
   * Generates a new time based id (uuid v1) and assigns it to the value
   * of the input
   *
   */
  setNewTimeBasedId(){
    if (this.isVector){
      throw new Error('Not supported, input is a vector!');
    }

    this.value = uuid.v1();
  }

  /**
   * Generates a new random id (uuid v4) and assigns it to the value
   * of the input
   */
  setNewRandomId(){
    if (this.isVector){
      throw new Error('Not supported, input is a vector!');
    }

    this.value = uuid.v4();
  }

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
    const value = await BaseText.prototype._validation.call(this, at);

    // format checking
    if (!UUID._uuidFormatRegEx.test(value)){
      throw new ValidationError('Invalid UUID format', UUID.errorCodes[0]);
    }

    return value;
  }

  static errorCodes = [
    '66b476c7-d1d3-4241-91a3-d71154807840',
  ];
}

UUID._uuidFormatRegEx = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/;

// registering the input
Input.registerInput(UUID);

module.exports = UUID;
