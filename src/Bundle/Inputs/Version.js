const util = require('util');
const compareVersions = require('compare-versions');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * Version input
 *
 * This input follows the semver convention.
 *
 * ```javascript
 * const input = Input.create('myInput: version');
 * input.value = '2.2.1';
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * minimumRequired | minimum version required | `false` |
 *
 * @see http://semver.org
 */
class Version extends BaseText{

  /**
   * Implements the version validations
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

    // minimumVersionRequired
    if (this.hasProperty('minimumRequired') && compareVersions(value, this.property('minimumRequired')) === -1){
      throw new ValidationError(util.format('Version is not compatible, minimum Version required: %s, current version %s', this.property('minimumRequired'), value), Version.errorCodes[0]);
    }

    return value;
  }

  static errorCodes = [
    '524f9ed1-44e8-43d8-83b1-72dc8d33788b',
  ];
}

// registering the input
Input.registerInput(Version);

module.exports = Version;
