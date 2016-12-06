const assert = require('assert');
const TypeCheck = require('js-typecheck');
const ValidationError = require('./ValidationError');
const Util = require('./Util');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _name = Symbol('name');
const _properties = Symbol('properties');
const _cache = Symbol('cache');

/**
 * Base class that defines the interface for all inputs
 *
 * An input holds a value that is used for the execution of the {@link Action}. The
 * value carried by the input gets checked through a wide range of validations
 * which make sure that the value meets the necessary requirements for
 * the execution of the {@link Action}.
 *
 * The validations are performed asynchronously which enables an implementation
 * that can go far beyond checking the data type or matching the value through
 * a regex. In most cases these validations are driven by `properties` which usually
 * are defined at construction time. Also, non-generic validations can be
 * implemented through `extendedValidation` where it can be used to implement
 * validations that can be very specific to the action holding the input.
 *
 * Inputs are created through {@link create} using
 * [syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar) that describes
 * its name and type (aka [TypeScript](https://www.typescriptlang.org/)), for instance:
 *
 * ```javascript
 * Input.create('myInput: bool')
 * ```
 *
 * Any input can be defined as a vector by using the short array syntax `[]`:
 *
 * ```javascript
 * Input.create('myInput: bool[]')
 * ```
 *
 * Additionally, you can specify if an input is optional (not required) by adding
 * `?` beside of the input name:
 *
 * ```javascript
 * Input.create('myInput?: bool[]')
 * ```
 *
 * When an action is either accessed through {@link RequestHandler} or
 * created from Json ({@link Provider.createActionFromJson}) the value of the inputs
 * are assigned through {@link Input.parseValue}.
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * required | boolean telling if the value is required | `true` | `true`
 * immutable | boolean telling if the data of the value cannot be altered \
 * overtime, however the value of the input can still be replaced by \
 * the input value setter | `true` | `true`
 * defaultValue | default value of the input | `true` | `null`
 * vector | carries a boolean telling if the input holds a vector value. It's defined \
 * during the construction of the input | `true` |
 * private | boolean telling if the input cannot be initialized through requests, \
 * therefore the input should only be used internally | `false` |
 * autofill | key name about the value under the  {@link Session.autofill} \
 * that should be used to initialized the value of the input | `false` |
 */
class Input{

  /**
   * Creates an input
   *
   * @param {string} name - name of the input
   * @param {Object} [properties={}] - plain object containing the properties which
   * will be assigned to the {@link Input}
   * @param {function} [extendedValidation] - callback that can be defined to supply
   * custom validations to the {@link Input}
   */
  constructor(name, properties={}, extendedValidation=null){
    assert(TypeCheck.isString(name) && name.length, 'name cannot be empty!');
    assert(TypeCheck.isPlainObject(properties), "properties need to be defined as dict {'key': value}");
    assert(extendedValidation === null || TypeCheck.isCallback(extendedValidation),
      'extendedValidation needs to be defined as function(contextValue) or null');

    this[_name] = name;
    this[_properties] = {};
    this[_cache] = new Util.ImmutableMap();

    // defining default properties
    this.assignProperty('required', true);
    this.assignProperty('immutable', true);
    this.assignProperty('vector', false);
    this.assignProperty('defaultValue', null);

    // defining custom properties that may override the default ones
    for (const propertyKey in properties){
      this.assignProperty(propertyKey, properties[propertyKey]);
    }

    this.value = this.property('defaultValue');
    this._extendedValidation = extendedValidation;
  }

  /**
   * Factories an input instance
   *
   * @param {string} inputInterface - string followed by either the pattern `name: type`
   * or `name?: type` in case of optional {@link Input}. The type is case-insensitive
   * @param {Object} [properties={}] - plain object containing the properties which
   * will be assigned to the {@link Input}
   * @param {function} [extendedValidation] - callback that can be defined to supply
   * custom validations to the {@link Input}
   * @return {Input}
   *
   *
   * @example
   * // minimal
   * Input.create('someName: numeric');
   *
   * @example
   * // full
   * Input.create('someName: numeric', {min: 1, max: 5}, function(at){
   *  return new Promise((resolve, reject) =>{
   *    if (this._valueAt(at) === 3)
   *      reject(new ValidationError('Failed for some reason'));
   *    else
   *      resolve(this.value);
   *  });
   * })
   */
  static create(inputInterface, properties={}, extendedValidation=null){
    const inputInterfaceParts = inputInterface.split(':');
    const propertiesFinal = Object.assign({}, properties);

    if (inputInterfaceParts.length !== 2){
      throw new Error("Invalid input interface, it should follow the pattern: 'name: type'");
    }

    for (let i=0; i < inputInterfaceParts.length; i++){
      inputInterfaceParts[i] = inputInterfaceParts[i].trim();
    }

    // not required syntax
    if (inputInterfaceParts[0].endsWith('?')){
      inputInterfaceParts[0] = inputInterfaceParts[0].slice(0, -1);
      propertiesFinal.required = false;
    }

    // vector syntax
    else if (inputInterfaceParts[1].endsWith('[]')){
      inputInterfaceParts[1] = inputInterfaceParts[1].slice(0, -2);
      propertiesFinal.vector = true;
    }

    const InputTypeClass = this.registeredInput(inputInterfaceParts[1]);

    // creates a new instance
    if (!InputTypeClass){
      throw new Error(`Invalid input type: ${inputInterfaceParts[1]}`);
    }

    return new InputTypeClass(inputInterfaceParts[0], propertiesFinal, extendedValidation);
  }

  /**
   * Returns if the value of the input is empty. This is used mainly by
   * the property `required=false` to know if the input does not have a value
   * assigned to it.
   *
   * @type {boolean} If the input is empty
   */
  get isEmpty(){
    return TypeCheck.isNone(this.value) || (this.property('vector') &&
      TypeCheck.isList(this.value) && this.value.length === 0);
  }

  /**
   * Returns if the value of the input is a vector. This information is defined
   * by the property `vector=true`
   *
   * @type {boolean} if the input is a vector
   */
  get isVector(){
    return this.property('vector') === true;
  }

  /**
   * Returns if the value of the input is required. This information is defined
   * by the property `required=true`
   *
   * @type {boolean} if the input is required
   */
  get isRequired(){
    return this.property('required') === true;
  }

  /**
   * Sets the input value by avoiding the overhead that may occur when the
   * same value is used across actions that have the input type, therefore
   * this method avoids the re-computation by copying the caches and value
   * associated with the source input to the current input.
   *
   * @param {Input} sourceInput - input used as source to setup the current input
   * @param {number} [at] - index used when the target input is defined as vector to
   * tell which value should be used
   * @param {boolean} [cache=true] - tells if the cache will be copied as well
   */
  setupFrom(sourceInput, at=null, cache=true){
    assert(TypeCheck.isSameType(sourceInput, this), 'Inputs are not the same type!');

    if (at !== null && !sourceInput.isVector){
      throw new Error(`Can't use at, since the source input is not a vector`);
    }
    else if (at !== null && this.isVector){
      throw new Error(`Can't use at, from a source vector input to a target vector input`);
    }
    else if (this.isVector && !sourceInput.isVector){
      throw new Error(`Source input is not a vector, can't setup to a vector target input`);
    }
    else if (at === null && sourceInput.isVector && !this.isVector){
      throw new Error(`Target input is not a vector, can't setup from a vector target input without supplying 'at'`);
    }

    // transferring the value
    if (at === null){
      this.value = sourceInput.value;
    }
    else{
      this.value = sourceInput.value[at];
    }

    // transferring the cache to the current input
    if (cache){
      assert(TypeCheck.isInstanceOf(sourceInput.cache, Util.ImmutableMap));

      if (at === null){
        for (const key of sourceInput.cache.keys){
          this.cache.set(key, sourceInput.cache.get(key));
        }
      }
      else{
        const indexToken = `(${at})`;
        for (const key of sourceInput.cache.keys){
          if (key.endsWith(indexToken)){
            this._setToCache(key.slice(0, -indexToken.length), sourceInput.cache.get(key));
          }
        }
      }
    }
  }

 /**
  * Returns the cache used by the input
  *
  * This method is called by ({@link setupFrom}) to setup the input based on an
  * already existing input
  *
  * @type {ImmutableMap}
  */
  get cache(){
    return this[_cache];
  }

  /**
   * Flushes the input cache {@link setupFrom}
   *
   */
  clearCache(){
    this.cache.clear();
  }

  /**
   * Executes the input validations ({@link _validation}), in case of a failed
   * validation then an exception of type {@link ValidationError} is raised
   *
   * @return {Promise<*>} Returns the value of the input
   */
  async validate(){
    // required check
    if (this.isEmpty){
      if (this.isRequired !== false){
        throw new ValidationError('Input is required, it cannot be empty!', Input.errorCodes[0]);
      }
    }

    // vector check
    else if (this.isVector && !TypeCheck.isList(this.value)){
      throw new ValidationError('Input needs to be a vector!', Input.errorCodes[1]);
    }

    // otherwise perform the asynchronous validations
    else{
      for (let i=0; i < (this.isVector ? this.value.length : 1); i++){
        // setting the context index
        const at = this.isVector ? i : null;

        // running generic validations
        await this._validation(at);

        // running extended validations
        if (TypeCheck.isCallback(this._extendedValidation)){
          await this._extendedValidation.bind(this)(at);
        }
      }
    }

    return true;
  }

  /**
   * Returns the property value for the input property name
   *
   * @param {string} name - name of the property
   * @param {*} [defaultValue] - default value returned in case the property
   * does not exist
   * @return {*} The value of the property (or the defaultValue in case of the
   * property does not exist)
   */
  property(name, defaultValue=null){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');

    if (this.hasProperty(name)){
      return this[_properties][name];
    }

    return defaultValue;
  }

  /**
   * Sets a property to the input, in case the property already exists then the value
   * is going to be overridden
   *
   * @param {string} name - name of the property
   * @param {*} value - value for the property
   */
  assignProperty(name, value){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');

    this[_properties][name] = value;

    this.clearCache();
  }

  /**
   * Returns a boolean telling if the input property name is assigned to the input
   *
   * @param {string} name - name of the property
   * @return {boolean}
   */
  hasProperty(name){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');

    return (name in this[_properties]);
  }

  /**
   * Returns a list containing the property names assigned to the input
   *
   * @type {Array<string>}
   */
  get propertyNames(){
    return Object.keys(this[_properties]);
  }

  /**
   * Sets the value of the input
   *
   * @param {*} inputValue - value that should be set to the input
   */
  set value(inputValue){
    // Due the overhead that may occur on going through recursively and freezing
    // the whole hierarchy of the value, it freezes only value itself. In case
    // this is not enough consider in changing it to perform a deep-freeze instead
    this._value = (!this.property('immutable') || TypeCheck.isNone(inputValue)) ? inputValue : Object.freeze(inputValue);

    // flushing the cache when a new value is set
    this.clearCache();
  }

  /**
   * Returns the value of the input
   *
   * @type {*}
   */
  get value(){
    return this._value;
  }

  /**
   * Returns the name of the input which is defined at construction time (inputs cannot
   * be renamed)
   *
   * @type {string}
   */
  get name(){
    return this[_name];
  }

  /**
   * Sets the value by casting it to the type that is compatible
   * with the input. In your input implementation you probably don't need to re-implement
   * this method, since all of the basic types are already taking care of that. This
   * method is called either by {@link RequestHandler} or when an action is created through
   * Json {@link Provider.createActionFromJson}. In case the input is defined as vector
   * the value can be defined using an array that is encoded in Json.
   *
   * @param {string} value - string containing the serialized value
   */
  parseValue(value){
    assert(TypeCheck.isString(value), 'value needs to be defined as string');

    if (value.length === 0){
      this.value = null;
    }
    else if (this.isVector){
      const decodedValue = [];
      const parsedValue = JSON.parse(value);

      assert(TypeCheck.isList(parsedValue), 'Unexpected data type');

      for (const parsedItem of parsedValue){
        // if the value is encoded as string
        if (TypeCheck.isString(parsedItem)){
          decodedValue.push(this.constructor._decode(parsedItem));
        }
        // otherwise just assign the value to the input
        else{
          decodedValue.push(parsedItem);
        }
      }

      this.value = decodedValue;
    }
    else{
      this.value = this.constructor._decode(value);
    }
  }

  /**
   * This method should return a string representation about the current value that
   * can be used later to set the load through {@link parseValue}.
   * If the value cannot be represented as string then an exception should be raised instead.
   *
   * @return {Promise<string>}
   */
  async serializeValue(){
    // making sure the value can be serialized without any issues
    await this.validate();

    // serializing the value
    let result;

    if (this.isEmpty){
      result = '';
    }
    else if (this.isVector){
      const encodedValue = [];

      for (const item of this.value){
        encodedValue.push(this.constructor._encode(item));
      }

      return JSON.stringify(encodedValue);
    }
    else{
      result = this.constructor._encode(this.value);
    }

    return String(result);
  }

  /**
   * Decodes the input value from the string representation ({@link _encode}) to the
   * data type of the input. This method is called internally during {@link parseValue}
   *
   * @param {string} value - encoded value
   * @return {*}
   * @protected
   */
  static _decode(value){
    assert(TypeCheck.isString(value), 'value needs to be defined as string');

    return value;
  }

  /**
   * Encodes the input value to a string representation that can be later decoded
   * through {@link _decode}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {*} value - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encode(value){
    return String(value);
  }

  /**
   * Register an {@link Input} type to the available inputs
   *
   * @param {Input} inputClass - input implementation that will be registered
   * @param {string} [name] - string containing the registration name for the
   * input. In case of an empty string, the registration is done by using the name
   * of the type (this information is stored in lowercase)
   */
  static registerInput(inputClass, name=''){
    assert(TypeCheck.isSubClassOf(inputClass, Input), 'Invalid input type!');
    assert(TypeCheck.isString(name), 'Invalid optional registration name!');

    const nameFinal = ((name === '') ? inputClass.name : name).toLowerCase();

    // validating name
    assert((/^([\w_\.\-])+$/gi).test(nameFinal), `Invalid input name: ${nameFinal}`); // eslint-disable-line no-useless-escape

    this._registeredInputs[nameFinal] = inputClass;
  }

  /**
   * Returns the input type based on the registration name
   *
   * @param {string} name - name of the registered input type
   * @return {Input|null}
   */
  static registeredInput(name){
    const normalizedName = name.toLowerCase();
    if (normalizedName in this._registeredInputs){
      return this._registeredInputs[normalizedName];
    }
    return null;
  }

  /**
   * Returns a list containing the names of the registered input types
   *
   * @type {Array<string>}
   */
  static get registeredInputNames(){
    return Object.keys(this._registeredInputs);
  }

  /**
   * Use this method to implement generic validations
   * for your input implementation. In case any validation fails this method
   * should return a {@link ValidationError} (This method is called when the
   * validations are perform through {@link validate})
   *
   * @param {number} [at] - index used when the input is defined as vector to
   * tell which value should be used
   * @return {Promise<*>} Returns the value of the input
   * @protected
   */
  async _validation(at=null){
    return this._valueAt(at);
  }

  /**
   * Auxiliary method used internally by input implementations to return the value
   * based on the current context
   *
   * @param {number} [index] - used when the input is set to a vector to tell the
   * index of the value
   * @return {*}
   * @protected
   */
  _valueAt(index=null){
    if (this.isVector){
      assert(index !== null, 'Could not determine the index of the vector');

      return this.value[index];
    }

    return this.value;
  }

  /**
   * Auxiliary method used internally by input implementations to check if the key
   * is under the cache
   *
   * @param {string} name - name of the key
   * @param {number} [at] - used when the input is set to a vector to tell the
   * index of the value
   * @return {boolean}
   * @protected
   */
  _isCached(name, at=null){
    return this.cache.has(this._cacheEntry(name, at));
  }

  /**
   * Auxiliary method used internally by input implementations to set a value to
   * the cache
   *
   * @param {string} name - name of the key
   * @param {*} value - value that should be set in the cache
   * @param {number} [at] - used when the input is set to a vector to tell the
   * index of the value
   * @protected
   */
  _setToCache(name, value, at=null){
    this.cache.set(this._cacheEntry(name, at), value);
  }

  /**
   * Auxiliary method used internally by the input implementations to get a value
   * from the cache
   *
   * @param {string} name - name of the key
   * @param {number} [at] - used when the input is set to a vector to tell the
   * index of the value
   * @return {*}
   * @protected
   */
  _getFromCache(name, at=null){
    return this.cache.get(this._cacheEntry(name, at));
  }

  /**
   * Returns the cache entry based on the name and index (at)
   *
   * @param {string} name - name of the key
   * @param {number} [at] - used when the input is set to a vector to tell the
   * @return {string}
   *
   * @private
   */
  _cacheEntry(name, at=null){
    if (this.isVector){
      assert(at !== null, 'Could not determine the index of the vector');
    }

    return (this.isVector) ? `${name}(${at})` : `${name}()`;
  }

  // codes used by error validations
  static errorCodes = [
    '28a03a60-a405-4737-b94d-2b695b6ce156',
    'e03709a0-6c31-4a33-9f63-fa751948a6cb',
  ];
  static _registeredInputs = {};
}

module.exports = Input;
