const crypto = require('crypto');
const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Input = require('./Input');
const Session = require('./Session');
const ValidationError = require('./ValidationError');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _inputs = Symbol('inputs');
const _info = Symbol('info');
const _session = Symbol('session');

/**
 * An action is used to evaluate operations.
 *
 * It provides a layer that can be used to wrap any evaluation in which this layer
 * takes control of the execution. It makes the evaluation much more flexible by providing
 * an abstracted interface that can be triggered from many different forms.
 *
 * The data used to perform the execution is held by inputs ({@link createInput}).
 * These inputs can be widely configured to enforce quality control, it's done by
 * checking the data held by the input through validations that are performed asynchronously,
 * therefore enabling validations that fully verify the data.
 *
 * The execution is triggered through {@link execute} that internally calls {@link _perform}
 * which should be used to implement the evaluation of the action.
 *
 * Actions are registered and created through Providers {@link Provider.registerAction}
 * and {@link Provider.createAction}.
 *
 * Any action can take advantage of the caching mechanism which is designed to improve the performance
 * by avoiding re-evaluations in actions that may be executed multiple times for the same
 * data, it can enabled through {@link _cacheable}.
 * Also, actions can be serialized ({@link toJson}) to postpone their execution where they can be
 * executed later through ({@link Provider.createActionFromJson}).
 */
class Action{

  /**
   * Creates an action
   */
  constructor(){
    this[_inputs] = [];
    this[_info] = {};
    this[_session] = null;

    // Adding the api input, all actions will inherit this input, this is used when the action is
    // triggered by a request, so this input is used to make sure that the request
    // is still compatible with the action signature.
    // In case the request does not provide this information, this input will be ignored.
    // To set a minimum require api version, use the property: minimumRequired
    // example:
    // this.input('api').assignProperty('minimumRequired', '10.1.0');
    this.createInput('api?: version');
  }

  /**
   * Associates an {@link Session} with the action, by doing this all inputs that
   * are flagged by the 'autofill' property are initialized with the
   * session value
   *
   * @param {Session} session - session object
   */
  set session(session){
    assert(session === null || TypeCheck.isInstanceOf(session, Session), 'session must be an object or null');

    this[_session] = session;

    // update the session inputs based on the request
    if (session !== null){
      // setting the session inputs
      for (const inputName of this.inputNames){
        const input = this.input(inputName);

        // setting the autofill inputs
        const autofillName = input.property('autofill', null);
        if (autofillName && autofillName in session.autofill){
          input.value = session.autofill[autofillName];
        }
      }
    }
  }

  /**
   * Returns the session object
   *
   * @type {Session|null}
   */
  get session(){
    return this[_session];
  }

  /**
   * Factories a new input through {@link Input.create} then adds it
   * to the action inputs {@link addInput}
   *
   * @param {string} inputInterface - string followed by either the pattern `name: type`
   * or `name?: type` in case of optional {@link Input}
   * @param {...*} args - arguments passed to the input's constructor
   * @return {Input} Returns the created input instance
   */
  createInput(inputInterface, ...args){
    const inputInstance = Input.create(inputInterface, ...args);
    this.addInput(inputInstance);

    return inputInstance;
  }

  /**
   * Adds an {@link Input} instance to the action
   *
   * @param {Input} inputInstance - input that should be added to the action
   */
  addInput(inputInstance){
    // making sure the input is derived from Inputs
    assert(TypeCheck.isInstanceOf(inputInstance, Input), 'Invalid Input Type!');

    // making sure the new input name is not in use
    if (this.inputNames.includes(inputInstance.name)){
      throw new Error('Input name is already in use!');
    }

    this[_inputs].push(inputInstance);
  }

  /**
   * Returns the action input names
   *
   * @type {Array<string>}
   */
  get inputNames(){
    return this[_inputs].map(input => input.name);
  }

  /**
   * Returns an input object based on the input name name
   *
   * @param {string} inputName - name of the input
   * @param {*} [defaultValue] - default value that is returned in case the
   * input does not exist
   * @return {Input}
   */
  input(inputName, defaultValue=null){
    assert(TypeCheck.isString(inputName), 'inputName needs to be defined as string!');

    for (const input of this[_inputs]){
      if (inputName === input.name){
        return input;
      }
    }

    return defaultValue;
  }

  /**
   * Executes the action and returns the result through a promise
   *
   * @param {boolean} [useCache=true] - tells if the action should try to use the LRU
   * cache to avoid the execution. This option is only used when the action is {@link _cacheable}
   * @param {boolean} [finalize=false] - tells if the execution should finalize the session
   * (if true the session will be finalized even if the action fails) {@link Session.finalize}
   * @return {Promise<*>}
   */
  async execute(useCache=true, finalize=false){
    let result = null;
    let err = null;

    // pulling out result from the cache (if applicable)
    let actionSignature = null;
    if (useCache && this._cacheable){
      actionSignature = await this.id;

      // checking if the input hash is under the cache
      if (this.session.resultCache.has(actionSignature)){
        return this.session.resultCache.get(actionSignature);
      }
    }

    // checking if the inputs are valid (it throws an exception in case an input fails)
    await this._inputsValidation();

    // the action is performed inside of a try/catch block to call the _finalize
    // no matter what, since that can be used to perform clean-up operations...
    try{
      // perform the action
      result = await this._perform();
    }
    catch(errr){
      err = errr;
    }

    // running the finalize (it can even affect the final result which is not recommended at all)
    try{
      result = await this._finalize(err, result);
    }
    catch(errr){
      throw this._processError(errr);
    }
    finally{
      if (finalize){
        await this.session.finalize();
      }
    }

    // adding the result to the cache
    if (actionSignature){
      this.session.resultCache.set(actionSignature, result);
    }

    return result;
  }

  /**
   * Bakes the current interface of the action into json format.
   * This can be used to postpone the execution which can be achieved later
   * through {@link Provider.createActionFromJson}
   *
   * @param {boolean} [bakeAutofill=true] - tells if the {@link Session.autofill} will be
   * included in the serialization
   * @return {Promise<string>} serialized json version of the action
   */
  async toJson(bakeAutofill=true){
    const actionInputs = {};
    for (const inputName of this.inputNames){
      const input = this.input(inputName);
      actionInputs[inputName] = await input.serializeValue();
    }

    const result = {
      id: this.id,
      info: this.info,
      inputs: actionInputs,
      session: {
        autofill: (bakeAutofill && this.session) ? this.session.autofill : {},
      },
    };

    return JSON.stringify(result, null, '\t');
  }

  /**
   * Returns a plain object containing information about the creation
   * of the action, such as: `providerName`, `actionName`, etc.
   *
   * @return {Object}
   */
  get info(){
    return this[_info];
  }

  /**
   * Returns an unique signature based on the action name and the current state
   * of the their inputs
   *
   * @type {Promise<string>}
   */
  get id(){
    if (!this.info.providerName || !this.info.actionName){
      throw new Error("Can't read the information about the action, was the action created through a provider?");
    }

    return (async () => {
      const separator = ';\n';
      let actionSignature = `${this.info.providerName}/${this.info.actionName}${separator}`;

      for (const input of this[_inputs]){
        const bakedValue = await input.serializeValue();
        actionSignature += `${input.name}: ${bakedValue}${separator}`;
      }

      return crypto.createHash('sha1').update(actionSignature).digest('hex');
    })();
  }

  /**
   * This method should be used to implement the evaluation of the action, it's called
   * by {@link execute} after all inputs have been validated. It's expected to return
   * a Promise containing the return value of the execution.
   *
   * You don't need to serialize the value for the response of the request (in
   * case the action is triggered through a request), this is done automatically
   * by {@link RequestHandler.render}
   *
   * @return {Promise<*>} value that should be returned by the action
   *
   * @abstract
   * @protected
   */
  _perform(){
    return Promise.reject(Error('Not implemented error!'));
  }

  /**
   * This method is called after the execution of the action.
   *
   * Some examples bellow about what you could do by re-implementing this method:
   *
   * - Add arbitrary information to a log
   * - In case of errors to purge temporary files
   * - Customize exceptions to a more contextual one
   *
   * @param {Error|null} err - Error exception or null in case the action has
   * been successfully executed
   * @param {*} value - value returned by the action
   * @return {Promise<*>} either the value returned by the action or the exception
   *
   * @protected
   */
  _finalize(err, value){
    if (err){
      return Promise.reject(err);
    }

    return Promise.resolve(value);
  }

  /**
  * Returns a boolean telling if the action is cacheable (`false` by default)
  *
  * The configuration about the LRU cache can be found under the {@link Settings}:
  * {@link Settings.lruCacheSize} and {@link Settings.lruCacheLifespan}
  *
  * @type {boolean}
  * @protected
  */
  get _cacheable(){
    return false;
  }

  /**
   * Auxiliary method that is used to include additional information
   * to the exception raised during execution
   *
   * @param {Error} err - exception that should be processed
   * @param {Input} [input] - input about where the error was raised
   * @return {Error}
   * @private
   */
  _processError(err, input=null){
    // got an validation error, lets bake it into json
    if (TypeCheck.isInstanceOf(err, ValidationError) && input){
      err.inputName = input.name; // eslint-disable-line no-param-reassign
    }

    err.stack = `Error: ${this.info.providerName}/${this.info.actionName}\n${err.stack}`; // eslint-disable-line no-param-reassign

    return err;
  }

  /**
   * Auxiliary method that runs the validations of all inputs
   *
   * @return {Promise<boolean>}
   * @private
   */
  _inputsValidation(){
    return Promise.all(

      this[_inputs].map((input) => {
        // in order to format the exception, it needs to be wrapped into a new promise
        return new Promise((resolve, reject) => {
          input.validate().then(() => {
            resolve();
          }).catch((err) => {
            reject(this._processError(err, input));
          });
        });
      }));
  }
}

module.exports = Action;
