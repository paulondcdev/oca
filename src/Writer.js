const stream = require('stream');
const TypeCheck = require('js-typecheck');
const debug = require('debug')('Oca');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _options = Symbol('options');
const _value = Symbol('value');


/**
 * A writer is used to output a value through the {@link Handler}.
 *
 * In case the value is an exception then it's treated as error output
 * ({@link Writer._errorOutput}) otherwise the value is treated as success output
 * ({@link Writer._successOutput}).
 *
 * Custom options can be used to change the behavior of a writer, they can be passed
 * to the handler during the output process ({@link Handler.output}).
 *
 * ```
 * const myHandler = Oca.createHandler('someHandler');
 *
 * // setting output options during the output
 * myHandler.output(value, {
 *  someOption: 10,
 * });
 * ```
 *
 * When executing the handler output you can use the action's result metadata to drive the
 * writer options:
 *
 * ```
 * class MyAction extends Oca.Action{
 *    _perform(data){
 *
 *      // defining a custom output option
 *      this.metadata.handler.name = {
 *        writeOptions: {
 *          someOption: 10,
 *        },
 *      };
 *
 *      // ...
 *    }
 * }
 * Oca.registerAction(MyAction);
 *
 * // ...
 * myHandler.execute('myAction').then((result) => {
 *    myHandler.output(result);
 * }).catch((err) => {
 *    myHandler.output(err);
 * });
 * ```
 */
class Writer{

  /**
   * Creates a writer
   *
   * @param {*} value - arbitrary value passed to the writer
   */
  constructor(value){
    this[_value] = value;
    this[_options] = {};
  }

  /**
   * Returns a plain object that contains writer options.
   *
   * @type {Object}
   */
  get options(){
    return this[_options];
  }

  /**
   * Returns the value that should be serialized ({@link Writer.serialize}) by the writer
   *
   * @type {*}
   */
  get value(){
    return this[_value];
  }

  /**
   * Serializes a writer value ({@link Writer.value}) in case the value is an
   * exception it's serialize as {@link Writer._errorOutput} otherwise it's serialized
   * as {@link Writer._successOutput}.
   */
  serialize(){

    if (this.value instanceof Error){
      this._errorOutput();
    }
    else{
      this._successOutput();
    }
  }

  /**
   * Translates an {@link Error} to a data structure that is later serialized by a writer
   * implementation as output. This method gets triggered when an exception is passed
   * as value by the {@link Handler.output}.
   *
   * By default the contents of the error output are driven by the `err.message`,
   * however if an error contains `err.toJson` method ({@link ValidationFail.toJson})
   * then that's used instead of the message.
   *
   * Also, you can avoid specific errors to be handled via output process by defining the member
   * `output` assigned with `false` to the error (for instance ```err.output = false;```). If
   * that is in place the error gets thrown which triggers the event {@link Handler.onErrorDuringOutput}.
   *
   * **Tip:** You can set the env variable `NODE_ENV=development` to get the traceback information
   * included in the error output
   *
   * @return {Object}
   * @protected
   */
  _errorOutput(){

    const err = this.value;

    // checking if the error can be handled by the writer
    if (err.output === false){
      throw err;
    }

    const result = (TypeCheck.isCallable(err.toJson)) ? err.toJson() : err.message;

    // printing the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development'){
      process.stderr.write(`${err.stack}\n`);
      debug(err.stack);
    }

    return result;
  }

  /**
   * Translates the success value to a data structure that is later serialized
   * by a handler implementation as output.
   *
   * All writers shipped with Oca have support for streams where in case of
   * any readable stream or buffer value are piped to the output,
   * otherwise the result is encoded using Json (defined per writer bases).
   *
   * Note: any Buffer value passed to this method gets automatically converted to
   * a readable stream.
   *
   * This method is called by {@link Handler.output}.
   *
   * @return {Object|Stream}
   * @protected
   */
  _successOutput(){

    // stream output
    if (this.value instanceof Buffer){
      const bufferStream = new stream.PassThrough();
      bufferStream.end(this.value);

      return bufferStream;
    }

    return this.value;
  }
}

module.exports = Writer;
