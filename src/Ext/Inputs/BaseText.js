const TypeCheck = require('js-typecheck');
const ValidationFail = require('../../Error/ValidationFail');
const Input = require('../../Input');


/**
 * Base text input class derived by all text input implementations
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * regex | custom regular expression to test the value | ::off:: | ::none::
 *
 * All properties including the inherited ones can be listed via
 * {@link registeredPropertyNames}
 */
class BaseText extends Input{

  /**
   * Returns if the input is empty
   * @type {boolean}
   */
  get isEmpty(){
    return (super.isEmpty || this.value.length === 0);
  }

  /**
   * Implements the string validations
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
      if (!TypeCheck.isString(value)){
        throw new ValidationFail('Value needs to be a string', BaseText.errorCodes[0]);
      }

      // regex property
      else if (this.property('regex') && (!(new RegExp(this.property('regex'))).test(value))){
        throw new ValidationFail('Value does not meet the requirements', BaseText.errorCodes[1]);
      }

      return value;
    });
  }

  static errorCodes = [
    '71b205ae-95ed-42a2-b5e9-ccf8e42ba454',
    'c902610c-ef17-4a10-bc75-887d1550793a',
  ];
}

// registering properties
Input.registerProperty(BaseText, 'regex');

module.exports = BaseText;
