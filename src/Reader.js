const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Action = require('./Action');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _action = Symbol('action');
const _options = Symbol('options');
const _result = Symbol('result');


/**
 * A reader is used by the handler during the execution ({@link Handler.execute})
 * to query the input and session information that should be used by the action.
 *
 * In case of new implements the only method expected to be overridden is
 * {@link Reader._perform} by implementing that you can provide support for
 * custom options ({@link Reader.options}) which are passed by the handler
 * ({@link Handler.execute}) to the reader.
 *
 * When a value is found for an input it's decoded using {@link Input.parseValue}
 * where each input implementation has its own way of parsing the serialized data,
 * to find out about how a value is serialized for an specific input type you could simply
 * set an arbitrary value to an input then query it back through
 * {@link Input.serializeValue}. The reference bellow shows the basic serialization
 * for the inputs blundled with Oca:
 *
 * Input Type | Scalar Serialization | Vector Serialization (compatible with JSON)
 * --- | --- | ---
 * {@link Text} | `'value'` | `'["valueA","valueB"]'`
 * {@link FilePath} | `'/tmp/a.txt'` | `'["/tmp/a.txt","/tmp/b.txt"]'`
 * {@link Bool} | `'true`' or `'1'` | `'[true,false]'` or `'[1,0]'`
 * {@link Numeric} | `'20'` | `'[20,30]'`
 * {@link Email} | `'test@email.com'` | `'["test@email.com","test2@email.com"]'`
 * {@link Ip} | `'192.168.0.1'` | `'["192.168.0.1","192.168.0.2"]'`
 * {@link Timestamp} | `'2017-02-02T22:26:30.431Z'` | \
 * `'["2017-02-02T22:26:30.431Z","2017-02-02T22:27:19.066Z"]'`
 * {@link UUID} | `'075054e0-810a-11e6-8c1d-e5fb28c699ca'` | \
 * `'["075054e0-810a-11e6-8c1d-e5fb28c699ca","98e631d3-6255-402a-88bd-66056e1ca9df"]'`
 * {@link Url} | `'#http#://www.google.com'` | \
 * `'["#http#://www.google.com","#http#://www.wikipedia.com"]'`
 * {@link Version} | `'10.1.1'` | `'["10.1.1","10.2"]'`
 * {@link Buf} | `'aGVsbG8='` | `'["aGVsbG8=","d29ybGQ="]'`
 *
 * <br/>**Hidding inputs from readers:**
 * A reader only sees inputs that are capable of serialization
 * ({@link Input.isSerializable}) or visible inputs. Therefore, any input assigned
 * with the property `hidden` is not visible by readers, for instance:
 *
 * ```
 * class Example extends Oca.Action{
 *   constructor(){
 *     super();
 *     this.createInput('readerCantSeeMe: numeric', {hidden: true});
 *     this.createInput('readerSeeMe: numeric');
 *   }
 * ```
 */
class Reader{

  /**
   * Creates a reader.
   *
   * @param {Action} action - action used for the querying of the value
   */
  constructor(action){
    assert(action instanceof Action, 'Invalid action instance');

    this[_action] = action;
    this[_result] = null;
    this[_options] = {};
  }

  /**
   * Returns the action that is associated with the reader.
   *
   * @type {Action}
   */
  get action(){
    return this[_action];
  }

  /**
   * Returns a plain object that contains reader options.
   *
   * @type {Object}
   */
  get options(){
    return this[_options];
  }

  /**
   * Returns a list of valid input names that should be used for the parsing.
   * This avoids hidden inputs to get exposed in the parsing.
   *
   * @type {Array<string>}
   */
  get validInputNames(){
    const inputs = [];
    for (const inputName of this[_action].inputNames){
      const input = this[_action].input(inputName);

      if (input.isSerializable && !input.property('hidden')){
        inputs.push(input);
      }
    }

    return inputs;
  }

  /**
   * Reads the input values and returns it through a plain object.
   *
   * @return {Promise<object>}
   */
  async inputValues(){

    if (!this[_result]){
      await this._parse();
    }

    return this[_result];
  }

  /**
   * Reads the autofill information and returns it through a plain object.
   *
   * If the autofill information is already assigned under autofill ({@link Action.session})
   * then that information is skipped otherwise it adds the parsed information the result.
   *
   * @return {Promise<Object>}
   */
  async autofillValues(){
    if (!this[_result]){
      await this._parse();
    }

    const result = Object.create(null);
    for (const inputName in this[_result]){

      const autofillName = this[_action].input(inputName).property('autofill');

      if (autofillName){

        // if the input name is already under autofill (assigned previously
        // then not overriding them)
        if (this[_action].session && autofillName in this[_action].session.autofill){
          continue;
        }
        result[autofillName] = this[_result][inputName];
      }
    }

    return result;
  }

  /**
   * This method should be re-implemented by derived classes to perform the handler parsing.
   *
   * It should return a plain object containing the input name and the value for that.
   * Where any input value from either String or Array types are considered valid values that
   * are later ({@link Reader.inputValues}, {@link Reader.autofillValues})
   * used to parse the value of the input ({@link Input.parseValue}), otherwise the value
   * is ignored.
   *
   * Only return the ones that were found by the parsing. Also, in case of any error
   * during the parsing then an exception should be raised.
   *
   * @param {Array<Input>} inputList - Valid list of inputs that should be used for
   * the parsing
   * @return {Promise<Object>}
   *
   * @protected
   */
  _perform(inputList){
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Auxiliary method that triggers the parsing if needed (in case it has not been
   * triggered yet).
   *
   * @return {Promise}
   * @private
   */
  async _parse(){
    if (!this._parsed){
      this[_result] = await this._perform(this.validInputNames);

      // decoding the values if needed
      for (const inputName in this[_result]){
        const input = this[_action].input(inputName);
        const value = this[_result][inputName];

        if (TypeCheck.isString(value)){
          this[_result][inputName] = input.parseValue(value, false);
        }
        else if (TypeCheck.isList(value)){
          // currently it's converting any array to a JSON string which is supported
          // by the input parsing. Lets keep an eye on this for now, since it may cause
          // an overhead
          this[_result][inputName] = input.parseValue(JSON.stringify(value), false);
        }
      }
    }

    return this[_result];
  }
}

module.exports = Reader;
