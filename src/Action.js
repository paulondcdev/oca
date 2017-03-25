const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Util = require('./Util');
const Input = require('./Input');
const Session = require('./Session');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _inputs = Symbol('inputs');
const _metadata = Symbol('metadata');
const _session = Symbol('session');


/**
 * An action is used to perform an evaluation.
 *
 * By implementing an evaluation through an action, the evaluation is wrapped by an
 * interface that can be triggered from many different forms ({@link Handler}).
 *
 * ```
  * class HelloWorld extends Oca.Action{
 *   _perform(data){
 *     return Promise.resolve('Hello World');
 *   }
 * }
 *
 * const action = new HelloWorld();
 * action.execute().then(...) //  HelloWorld
 * ```
 *
 * The data used to perform an evaluation is held by inputs ({@link Action.createInput}).
 * These inputs can be widely configured to enforce quality control via properties.
 * The available properties can be found under the documentation for each input type.
 *
 * ```
 * class HelloWorld extends Oca.Action{
 *   constructor(){
 *     super();
 *     this.createInput('repeat: numeric', {max: 100});
 *   }
 *   _perform(data){
 *     const result = 'HelloWorld '.repeat(data.repeat);
 *     return Promise.resolve(result);
 *   }
 * }
 *
 * const action = new HelloWorld();
 * action.input('repeat').value = 3;
 * action.execute().then(...) //  HelloWorld HelloWorld HelloWorld
 * ```
 *
 * An evaluation is triggered through {@link Action.execute} that internally calls {@link Action._perform}
 * which is the method that should be used to implement the evaluation of the action.
 *
 * Actions are registered via {@link Action.registerAction}, in case you want to use a compound name
 * with a prefix common across some group of actions you can use '.' as separator.
 * Also, there are two ways to create actions:
 *
 * - {@link Action.createAction} - allows actions to be created inside of another action.
 * By doing that it creates actions that share the same {@link Session}.
 *
 * - {@link Action.create} - factory an action (also available as `Oca.createAction`) with
 * custom session when supplied otherwise it creates a new session.
 *
 * An action can be serialized ({@link Action.toJson}) to postpone their execution where it can be
 * recreated later through {@link Action.createActionFromJson} or in case of a non registered actions
 * the serialized data can loaded through {@link Action.fromJson}.
 *
 * Also, actions can take advantage of the caching mechanism designed to improve the performance
 * by avoiding re-evaluations in actions that might be executed multiple times. This can enabled
 * through {@link Action.isCacheable}.
 */
class Action{

  /**
   * Creates an action
   */
  constructor(){

    this[_inputs] = new Map();
    this[_session] = null;
    this[_metadata] = new Util.HierarchicalCollection();

    // Adding the api input, all actions will inherit this input.
    // This input is used to make sure that the version requested
    // is still compatible with the action.
    // To set a minimum require api version, use the property: minimumRequired
    // example:
    // this.input('api').assignProperty('minimumRequired', '10.1.0');
    this.createInput('api?: version', {description: 'version used to make sure that the api is still compatible'});
  }

  /**
   * Associates a {@link Session} with the action. By doing this all inputs that
   * are flagged with 'autofill' property will be initialized with the
   * session value
   *
   * @param {Session} value - session object
   */
  set session(value){
    assert(value === null || value instanceof Session, 'session must be an instance of Session or null');

    this[_session] = value;

    if (value !== null){
      // setting the session inputs
      for (const input of this[_inputs].values()){

        // setting the autofill inputs
        const autofillName = input.property('autofill');
        if (autofillName && autofillName in value.autofill){
          input.value = value.autofill[autofillName];
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
  * Returns a boolean telling if the action is cacheable (`false` by default).
  *
  * This method should be overridden by derived classes to tell if the action
  * is cacheable. This information is used by {@link Action.execute}.
  *
  * The configuration about the LRU cache can be found under the {@link Session}.
  *
  * @type {boolean}
  */
  get isCacheable(){
    return false;
  }

  /**
   * Creates a new input through {@link Input.create} then adds it
   * to the action inputs {@link Action.addInput}
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
    assert(inputInstance instanceof Input, 'Invalid Input Type!');

    // making sure the new input name is not in use
    if (this[_inputs].has(inputInstance.name)){
      throw new Error('Input name is already in use!');
    }

    this[_inputs].set(inputInstance.name, inputInstance);
  }

  /**
   * Returns the action input names
   *
   * @type {Array<string>}
   */
  get inputNames(){
    return [...this[_inputs].keys()];
  }

  /**
   * Returns the input instance based on the given name
   *
   * @param {string} inputName - name of the input
   * @param {*} [defaultValue] - default value that is returned in case the
   * input does not exist
   * @return {Input}
   */
  input(inputName, defaultValue=null){
    assert(TypeCheck.isString(inputName), 'inputName needs to be defined as string!');

    if (this[_inputs].has(inputName)){
      return this[_inputs].get(inputName);
    }

    return defaultValue;
  }

  /**
   * Executes the action and returns the result through a promise
   *
   * @param {boolean} [useCache=true] - tells if the action should try to use the LRU
   * cache to avoid the execution. This option is only used when the action is {@link Action.isCacheable}
   * @return {Promise<*>}
   */
  async execute(useCache=true){
    let result = null;
    let err = null;

    // pulling out result from the cache (if applicable)
    let actionSignature = null;
    if (useCache && this.isCacheable){
      actionSignature = await this.id();

      // checking if the input hash is under the cache
      if (this.session.resultCache.has(actionSignature)){
        return this.session.resultCache.get(actionSignature);
      }
    }

    const data = Object.create(null);
    const readOnlyOriginalValues = new Map();

    // making inputs read-only during the execution, otherwise it would be very dangerous
    // since a modified input would not get validated until the next execution.
    // The original read-only value is restored in the end of the execution. Also,
    // this process collects the input values that are stored under 'data' which
    // is later passed as argument of _perform method, it's used as a more convenient
    // way to query the value of the inputs
    for (const [name, input] of this[_inputs]){
      readOnlyOriginalValues.set(input, input.readOnly);

      // making input as readOnly
      input.readOnly = true;

      // input value
      data[name] = input.value;
    }

    // checking if the inputs are valid (it throws an exception in case an input fails)
    try{
      await this._inputsValidation();
    }
    catch(errr){
      // restoring the read-only
      for (const [input, originalReadOnly] of readOnlyOriginalValues){
        input.readOnly = originalReadOnly;
      }

      throw this._processError(errr);
    }

    // the action is performed inside of a try/catch block to call the _finalize
    // no matter what, since that can be used to perform clean-up operations...
    try{
      // performing the action
      result = await this._perform(data);
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

      // restoring the read-only
      for (const [input, originalReadOnly] of readOnlyOriginalValues){
        input.readOnly = originalReadOnly;
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
   * This can be used to postpone the execution which can be done
   * through {@link Action.createActionFromJson} or simply by loading
   * the json data through {@link Action.fromJson}
   *
   * @param {boolean} [autofill=true] - tells if the {@link Session.autofill} will be
   * included in the serialization
   * @return {Promise<string>} serialized json version of the action
   */
  async toJson(autofill=true){

    const actionInputs = await this._serializeInputs();

    const result = {
      id: this.id(),
      inputs: actionInputs,
      metadata: {
        action: this.metadata('action'),
      },
      session: {
        autofill: (autofill && this.session) ? this.session.autofill : {},
      },
    };

    return JSON.stringify(result, null, '\t');
  }

  /**
   * Loads the interface of the action from json (serialized through {@link Action.toJson}).
   *
   * @param {string} serializedAction - serialized json information generated by {@link Action.toJson}
   * @param {boolean} [autofill=true] - tells if the {@link Session.autofill} should
   * be loaded
   */
  fromJson(serializedAction, autofill=true){

    const actionContents = JSON.parse(serializedAction);

    this._loadContents(actionContents, autofill);
  }

  /**
   * Returns a value under the meta-data
   *
   * @param {string} path - path about where the value is localized (the levels
   * must be separated by '.'). In case of an empty string it returns the
   * entire meta-data
   * @param {*} [defaultValue] - default value returned in case a value was
   * not found for the path
   * @return {*}
   */
  metadata(path, defaultValue=undefined){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    return this[_metadata].query(path, defaultValue);
  }

  /**
   * Sets a value to the meta-data
   *
   * @param {string} path - path about where the value should be stored under the metadata
   * (the levels must be separated by '.')
   * @param {*} value - value that is going to be stored under the collection
   * @param {boolean} [merge=true] - this option is used to decide in case of the
   * last level is already existing under the collection, if the value should be
   * either merged (default) or overridden.
   */
  setMetadata(path, value, merge=true){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    this[_metadata].insert(path, value, merge);
  }

  /**
   * Returns an unique signature based on the action's current state. It's based
   * on the input types, input values and meta data information about the action.
   *
   * For a more reliable signature make sure that the action has been created through
   * the factory method ({@link Action.create}).
   *
   * @return {Promise<string>}
   */
  async id(){
    let actionSignature = '';
    const separator = ';\n';

    // header
    if (this.metadata('action.name')){
      actionSignature = this.metadata('action.name');
    }
    // using the class name can be very flawed, make sure to always creating actions
    // via their registration name
    else{
      actionSignature = `!${this.constructor.name}`;
    }
    actionSignature += separator;
    actionSignature += this[_inputs].size;
    actionSignature += separator;

    // contents
    const actionInputs = await this._serializeInputs();
    for (const inputName in actionInputs){
      actionSignature += `${inputName}: ${actionInputs[inputName]}${separator}`;
    }

    return Util.hash(Buffer.from(actionSignature));
  }

  /**
   * Allows the creation of an action based on the current action. By doing this it passes
   * the current {@link Action.session} to the static create method ({@link Action.create}).
   * Therefore creating an action that shares the same session.
   *
   * @param {string} actionName - registered action name (case-insensitive)
   * @return {Action|null}
   */
  createAction(actionName){
    const action = Action.create(actionName, this.session);

    // overriding the meta-data information about the origin of the action, by telling
    // it has been created from inside of another action
    action.setMetadata('action.origin', 'nested');

    return action;
  }

  /**
   * Creates an action based on the serialized input which is generated by
   * {@link Action.toJson}
   *
   * @param {string} serializedAction - json encoded action
   * @param {boolean} [autofill=true] - tells if the autofill information should be
   * loaded
   * @return {Action|null}
   */
  static createActionFromJson(serializedAction, autofill=true){
    assert(TypeCheck.isString(serializedAction), 'serializedAction needs to be defined as string!');

    const actionContents = JSON.parse(serializedAction);
    const name = actionContents.metadata.action.name;

    assert(TypeCheck.isString(name), 'Could not find the action information');
    const action = this.create(name);

    assert(action, `Action not found: ${name}`);

    action._loadContents(actionContents, autofill);

    return action;
  }

  /**
   * Creates an action based on the registered action name, in case the action does
   * not exist `null` is returned instead
   *
   * @param {string} actionName - registered action name (case-insensitive)
   * @param {Session} [session] - optional session object, in case none session is
   * provided a new session object is created
   * @return {Action|null}
   */
  static create(actionName, session=null){
    assert(TypeCheck.isString(actionName), 'Action name needs to be defined as string');
    assert(session === null || session instanceof Session, 'Invalid session type!');

    const RegisteredAction = this.registeredAction(actionName);

    if (RegisteredAction){
      const action = new RegisteredAction();

      // adding the session to the action
      action.session = session || new Session();

      // adding the action name used to create the action under the meta-data
      action.setMetadata('action.name', actionName.toLowerCase());

      // adding a meta-data information telling the action is a top level one
      // it has not being created inside of another action through the
      // Action.createAction
      action.setMetadata('action.origin', 'topLevel');

      return action;
    }

    return RegisteredAction;
  }

  /**
   * Registers an {@link Action} to the available actions
   *
   * In case you want to use a compound name with a prefix common across some group
   * of actions, you can use '.' as separator.
   *
   * @param {Action} actionClass - action implementation that will be registered
   * @param {string} [name] - string containing the registration name for the
   * action, this name is used later to create the action ({@link Action.create}).
   * In case of an empty string, the registration is done by using the name
   * of the type.
   */
  static registerAction(actionClass, name=''){

    assert(TypeCheck.isSubClassOf(actionClass, Action), 'Invalid action type');

    const nameFinal = ((name === '') ? actionClass.name : name).toLowerCase();

    // validating name
    assert(nameFinal.length, 'action name cannot be empty');
    assert((/^([\w_\.\-])+$/gi).test(nameFinal), `Illegal action name: ${nameFinal}`); // eslint-disable-line no-useless-escape

    this._registeredActions.set(nameFinal, actionClass);
  }

  /**
   * Returns the action based on the registration name
   *
   * @param {string} name - name of the registered action
   * @return {Action|null}
   */
  static registeredAction(name){
    assert(TypeCheck.isString(name), 'Invalid name!');

    const normalizedName = name.toLowerCase();

    if (this._registeredActions.has(normalizedName)){
      return this._registeredActions.get(normalizedName);
    }

    return null;
  }

  /**
   * Returns a list containing the names of the registered actions
   *
   * @type {Array<string>}
   */
  static get registeredActionNames(){
    return [...this._registeredActions.keys()];
  }

  /**
   * This method should be used to implement the evaluation of the action. It's called
   * by {@link Action.execute} after all inputs have been validated. It's expected to return
   * a Promise containing the result of the evaluation.
   *
   * During the execution of the action all inputs are assigned as read-only ({@link Input.readOnly}),
   * this is done to prevent any modification in the input while the execution is happening,
   * by the end of the execution the inputs are assigned back with the read-only state
   * that was assigned before of the execution.
   *
   * *Result through a {@link Handler}:*
   *
   * The {@link Handler.output} is used for the serialization of a result. Therefore,
   * actions should not serialize the result by themselves; instead it should be
   * done by a handler. The handlers shipped with Oca have support for streams
   * where in case of any readable stream or buffer value they are piped to the
   * output, otherwise the result is serialized using Json.
   *
   * @param {Object} data - plain object containing the value of the inputs, this is just to
   * provide a more convenient way to query the value of the inputs inside of the
   * execution for instance: ```data.myInput``` instead of ```this.input('myInput').value```.
   * @return {Promise<*>} value that should be returned by the action
   *
   * @abstract
   * @protected
   */
  _perform(data){
    return Promise.reject(Error('Not implemented error!'));
  }

  /**
   * This method is called after the execution of the action.
   *
   * You could re-implement this method to:
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
   * Auxiliary method used to the contents of the action
   *
   * @param {Object} actionContents - object created when a serialized action
   * is parsed
   * @param {boolean} autofill - tells if the {@link Session.autofill} should
   * be loaded
   * @private
   */
  _loadContents(actionContents, autofill){
    if (autofill && this.session){
      for (const autofillName in actionContents.session.autofill){
        this.session.autofill[autofillName] = actionContents.session.autofill[autofillName];
      }
    }

    for (const inputName in actionContents.inputs){
      const input = this.input(inputName);
      assert(input, `Invalid input ${inputName}`);

      input.parseValue(actionContents.inputs[inputName]);
    }
  }

  /**
   * Returns the value of the action inputs serialized
   *
   * @return {Promise<Object>}
   * @private
   */
  async _serializeInputs(){
    const inputNames = this.inputNames;
    const serializeValuePromises = inputNames.map(x => this.input(x).serializeValue());
    const serializedResult = await Promise.all(serializeValuePromises);

    const actionInputs = Object.create(null);
    for (let i=0, len=inputNames.length; i < len; ++i){
      actionInputs[inputNames[i]] = serializedResult[i];
    }

    return actionInputs;
  }

  /**
   * Auxiliary method used to include additional information
   * to the exception raised during execution of the action
   *
   * @param {Error} err - exception that should be processed
   * @return {Error}
   * @private
   */
  _processError(err){

    // adding a member that tells the origin of the error
    let topLevel = false;
    if (!err.origin){
      err.origin = this.metadata('action.origin');
      topLevel = true;

      // disabling output
      if (err.disableOutputAsNested && err.origin === 'nested'){
        err.output = false;
      }
    }

    // adding the action class name and the registered name to the stack information, for
    // debugging purposes
    let actionName = this.constructor.name;
    const registeredName = this.metadata('action.name');
    if (registeredName){
      actionName += ` (${registeredName})`;
    }

    // including the action name information in a way that includes all action levels
    // aka: `/TopLevelAction (...)/NestedActionA (...)/NestedActionB (...)!'
    if (topLevel){
      actionName += '!\n';
    }

    err.stack = `/${actionName}${err.stack}`;

    return err;
  }

  /**
   * Auxiliary method that runs the validations of all inputs
   *
   * @return {Promise}
   * @private
   */
  _inputsValidation(){
    return Promise.all([...this[_inputs].values()].map(input => input.validate()));
  }

  static _registeredActions = new Map();
}

module.exports = Action;
