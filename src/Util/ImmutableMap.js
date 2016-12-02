const assert = require('assert');
const TypeCheck = require('js-typecheck');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _data = Symbol('data');

/**
 * Map implementation designed to hold immutable data
 *
 * This object makes sure that values held by the map cannot have their data
 * modified.
 */
class ImmutableMap{

  /**
   * Creates an ImmutableMap
   */
  constructor(){
    this[_data] = {};
  }

  /**
   * Sets a key and value to the map
   *
   * @param {string} key - key associated with the value
   * @param {*} value - value that will be stored immutable
   */
  set(key, value){
    assert(TypeCheck.isString(key), 'key needs to defined as string');

    this[_data][key] = this._deepFreeze(value);
  }

  /**
   * Returns the immutable value for the input key
   *
   * @param {string} key - key name
   * @return {*}
   */
  get(key){
    return this[_data][key];
  }

  /**
   * Returns a boolean telling if the input key is under the map
   *
   * @param {string} key - key name
   * @return {boolean}
   */
  has(key){
    return (key in this[_data]);
  }

  /**
   * Removes key & value from the map
   *
   * @param {string} key - key name
   */
  remove(key){
    delete this[_data][key];
  }

  /**
   * Returns if the map is empty
   *
   * @type {boolean}
   */
  get isEmpty(){
    return this.keys.length === 0;
  }

  /**
   * Returns the keys included in the map
   *
   * @type {Array<string>}
   */
  get keys(){
    return Object.keys(this[_data]);
  }

  /**
   * Returns the size of the map
   *
   * @type {number}
   */
  get length(){
    return this.keys.length;
  }

  /**
   * Resets the map
   */
  clear(){
    this[_data] = {};
  }

  /**
   * Auxiliary method that recursively makes the input object immutable
   *
   * @param {object} value - object that should become immutable
   * @return {object}
   * @private
   */
  _deepFreeze(value){

    if (TypeCheck.isNone(value)){
      return value;
    }

    // retrieve the property names defined on obj
    const propNames = Object.getOwnPropertyNames(value);

    // freeze properties before freezing self
    propNames.forEach((name) => {
      const prop = value[name];

      // freeze prop if it is an object
      if (TypeCheck.isObject(prop)){
        this._deepFreeze(prop);
      }
    });

    // freeze self (no-op if already frozen)
    return Object.freeze(value);
  }
}

module.exports = ImmutableMap;
