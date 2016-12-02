const ValidationError = require('../../ValidationError');
const Input = require('../../Input');
const BaseText = require('./BaseText');
const nodeIp = require('ip');


/**
 * Ip address input
 *
 * ```javascript
 * // ipv4
 * const input = Input.create('myInput: ip');
 * input.value = '192.168.0.1';
 * ```
 *
 * ```javascript
 * // ipv6
 * const input = Input.create('myInput: ip');
 * input.value = '::ffff:127.0.0.1';
 * ```
 *
 * ```javascript
 * // initializes the value of the input with 'remoteAddress'
 * // which is defined by the RequestHandler
 * const input = Input.create('myInput: ip', {autofill: 'remoteAddress'});
 * console.log(input.value);
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * allowV6 | boolean telling if the input allows ipv6 | `true` | `true`
 */
class Ip extends BaseText{

  /**
   * Creates the Ip Input
   *
   */
  constructor(...args){
    super(...args);

    if (!this.hasProperty('allowV6')){
      this.assignProperty('allowV6', true);
    }
  }

  /**
   * Returns a boolean telling if the value is ipv4
   *
   * @param {number} [at] - index used when the input is defined as vector to
   * tell which value should be used
   * @return {boolean}
   */
  isV4(at=null){

    const value = this._valueAt(at);
    return nodeIp.isV4Format(value);
  }

  /**
   * Returns a boolean telling if the value is ipv6
   *
   * @param {number} [at] - index used when the input is defined as vector to
   * tell which value should be used
   * @return {boolean}
   */
  isV6(at=null){

    const value = this._valueAt(at);
    return nodeIp.isV6Format(value);
  }

  /**
   * Returns a boolean telling if the value is a private ip address
   *
   * @param {number} [at] - index used when the input is defined as vector to
   * tell which value should be used
   * @return {boolean}
   */
  isPrivate(at=null){

    const value = this._valueAt(at);
    return nodeIp.isPrivate(value);
  }

  /**
   * Implements the ip address validations
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


    // checking ip version
    if (!(this.isV4(at) || (this.property('allowV6') && this.isV6(at)))){
      throw new ValidationError('Invalid ip!', Ip.errorCodes[0]);
    }

    return value;
  }

  static errorCodes = [
    '54cb9e90-468e-49ea-8f34-512a7b729d28',
  ];
}

// registering the input
Input.registerInput(Ip);

module.exports = Ip;
