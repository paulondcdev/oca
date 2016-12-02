const util = require('util');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
 * Text input
 *
 * ```javascript
 * const input = Input.create('myInput: text');
 * input.value = 'Some text';
 *
 * input.serializeValue().then(...);
 * // 'Some Text'
 * ```
 *
 * ```javascript
 * // vector
 * const input = Input.create('myInput: text[]');
 * input.value = ['A', 'B', 'C'];
 *
 * input.serializeValue().then(...);
 * // '["A","B","C"]'
 * ```
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * min | minimum number of characters | `false` |
 * max | maximum number of characters | `false` |
 */
class Text extends BaseText{

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
    const value = await BaseText.prototype._validation.call(this, at);

    // min property
    if (this.hasProperty('min') && value.length < this.property('min')){
      throw new ValidationError(util.format('Value is too short, it needs to have at least %d characters', this.property('min')), Text.errorCodes[0]);
    }
    // max property
    else if (this.hasProperty('max') && value.length > this.property('max')){
      throw new ValidationError(util.format('Value is too long, maximum is %d characters', this.property('max')), Text.errorCodes[1]);
    }

    return value;
  }

  static errorCodes = [
    '64358b78-ec83-4494-b734-0b1bdac43720',
    'c7ff4423-2c27-4538-acd7-923dada7f4d3',
  ];
}

// registering the input
Input.registerInput(Text);

module.exports = Text;
