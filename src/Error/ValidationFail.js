const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Settings = require('../Settings');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _inputName = Symbol('inputName');
const _code = Symbol('code');
const _message = Symbol('message');

/**
 * Exception raised by {@link Input} validations
 *
 * It carries additional information about the context of the error that can be used when
 * reporting/handling it. For this reason when this exception is raised through a {@link Handler}
 * it gets encoded into json {@link ValidationFail.toJson}.
 *
 * ```javascript
 * throw new ValidationFail('File does not exit!')
 * ```
 * @see {@link Handler._errorOutput}
 */
class ValidationFail extends Error{

  /**
   * Initialize the exception
   *
   * @param {string} message - error message
   * @param {string} [code] - unique code based on uuid v4 that can be used to identify the error
   * @param {string} [inputName] - name of the input about where the exception was generated
   * type
   */
  constructor(message, code=null, inputName=null){
    assert(TypeCheck.isString(message) && message.length, 'message needs to defined as valid string (cannot be empty)');

    super(message);

    this.code = code;
    this.inputName = inputName;

    /**
     * Validation fail is assigned with the status code found at
     * `Settings.get('error/validationFail/status')`
     * (default: `422`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/validationFail/status');

    // storing the original message
    this[_message] = message;

    this._updateMessage();
  }

  /**
   * Sets the input name related with the validation
   *
   * @param {string} [inputName] - name of the input
   */
  set inputName(inputName){
    assert(inputName === null || (TypeCheck.isString(inputName) && inputName.length), 'inputName needs to defined as valid string');

    this[_inputName] = inputName;

    this._updateMessage();
  }

  /**
   * Returns the input name related with the validation
   *
   * @type {string}
   */
  get inputName(){
    return this[_inputName];
  }

  /**
   * Sets an unique error code specifically related with the validation itself, this can be used
   * to identify the failed validation.
   *
   * @param {string} [errorCode] - unique code based on uuid v4 that can be used to identify the error
   */
  set code(errorCode){
    assert(errorCode === null || /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(errorCode), 'errorCode needs to defined as uuid or null');

    this[_code] = errorCode;
  }

  /**
   * Returns the code related with the validation itself
   *
   * @type {string}
   */
  get code(){
    return this[_code];
  }

  /**
   * Bakes the exception into a json string
   *
   * @return {string} json string containing the serialized version of the exception
   */
  toJson(){
    return JSON.stringify({
      message: this[_message],
      code: this.code,
      inputName: this.inputName,
    });
  }

  /**
   * Creates a ValidationFail instance based on the input json string
   *
   * @param {string} json - string containing the serialized json version of the exception
   * @return {ValidationFail}
   */
  static fromJson(json){
    assert(TypeCheck.isString(json) && json.length, 'json needs to be defined as valid string');

    const data = JSON.parse(json);
    return new ValidationFail(data.message, data.code, data.inputName);
  }

  /**
   * Auxiliary method that updates the validation fail message
   * @private
   */
  _updateMessage(){
    if (this.inputName){
      this.message = `${this.inputName}: ${this[_message]}`;
    }
    else{
      this.message = this[_message];
    }
  }
}

// default settings
Settings.set('error/validationFail/status', 422);

module.exports = ValidationFail;
