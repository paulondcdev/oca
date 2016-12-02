const ValidationError = require('../../ValidationError');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * Email input RFC-5322 compliant
 *
 * ```javascript
 * const input = Input.create('myInput: email');
 * input.value = 'test@domain.com';
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Email_address#Overview
 */
class Email extends BaseText{

  /**
   * Implements the email validations
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
    if (!Email._emailFormatRegEx.test(value)){
      throw new ValidationError('Invalid email format', Email.errorCodes[0]);
    }

    return value;
  }

  static errorCodes = [
    '93d6f463-6650-46c8-bb9f-e5c3bc00d78e',
  ];
}

Email._emailFormatRegEx = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/; // eslint-disable-line no-useless-escape

// registering the input
Input.registerInput(Email);

module.exports = Email;
