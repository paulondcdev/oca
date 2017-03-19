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
 * Custom options can be used to change the behavior of a writer, they are passed
 * by the handler during the output process ({@link Handler.output}).
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
 *
 * @param {*} value - raw value that should be resulted by the handler
 * @param {Object} outputOptions - plain object containing custom options that should be used
 * by the output where each handler implementation contains their own set of options.
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
   * Translates an {@link Error} to a data structure that is later serialized by a handler implementation
   * as output. The handler implementations are recommended to serialize the output using json. This method is
   * called by the {@link Handler.output} when an exception is passed as output.
   *
   * Any error can carry a status code. It helps to identify the kind of error, by default it
   * follows the HTTP status code, however you can assign any value you want that may help client to be
   * aware about type of error.
   *
   * There are two kinds of status codes that can be assigned for any error:
   *
   * - status: used when an error is raised from inside of a top level action
   * (an action that has not been created from another action).
   *
   * - nestedStatus: used when an error is raised inside of an action that has been
   * created from another action ({@link Action.createAction}), in case nestedStatus is not defined
   * then `status` code is going to be used instead.
   *
   * The `status` and `nestedStatus` can be done by adding them to any error (for instance ```err.status = 501;```).
   * This practice can be found in all errors shipped with oca ({@link Conflict}, {@link NoContent},
   * {@link NotFound} and {@link ValidationFail}). In case none status is found in the error then `500`
   * is used automatically.
   *
   * By default the contents of the error output are driven by the `err.message`, however if an error
   * contains `err.toJson` method ({@link ValidationFail.toJson}) then that's used instead of the message.
   *
   * **Tip:** You can set the env variable `NODE_ENV=development` to get the traceback information
   * included in the error output
   *
   * @return {Object}
   * @protected
   */
  _errorOutput(){

    const err = this.value;
    let status = err.status || 500;

    // checking if the error has been raised from inside of another action, if so
    // it uses the nestedStatus code defined as a member of the error
    if (err.origin === 'nested' && err.nestedStatus){
      status = err.nestedStatus;
    }

    const result = {
      error: {
        code: status,
        message: (TypeCheck.isCallable(err.toJson)) ? err.toJson() : err.message,
      },
    };

    // adding the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development'){
      process.stderr.write(`${err.stack}\n`);
      result.error.stacktrace = err.stack.split('\n');
      debug(err.stack);
    }

    return result;
  }

  /**
   * Translates the success value to a data structure that is later serialized
   * by a handler implementation as output.
   * The handler implementations are recommended to serialize the output using json
   * for a non readable stream or buffer value, otherwise to stream them as output
   * (if supported by the handler).
   *
   * Note: any Buffer value passed to this method gets automatically converted to a
   * readable stream.
   *
   * This method is called by {@link Handler.output}.
   *
   * @return {Object}
   * @protected
   */
  _successOutput(){

    // stream output
    if (this.value instanceof Buffer){
      const bufferStream = new stream.PassThrough();
      bufferStream.end(this.value);

      return bufferStream;
    }
    else if (this.value instanceof stream.Readable){
      return this.value;
    }

    // default result
    const result = Object.create(null);
    result.data = this.value;

    return result;
  }

}

module.exports = Writer;
