const assert = require('assert');
const stream = require('stream');
const TypeCheck = require('js-typecheck');
const Util = require('../../Util');
const Settings = require('../../Settings');
const Handler = require('../../Handler');
const Writer = require('../../Writer');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _response = Symbol('response');


/**
 * WebResponse output writer.
 *
 * This writer is used by the output of the web handler ({@link Web.output}).
 *
 * In case the value is an exception then it's treated as
 * {@link WebResponse._errorOutput} otherwise the value is treated as
 * {@link WebResponse._successOutput}.
 *
 * <h2>Options Summary</h2>
 *
 * Option Name | Description | Default Value
 * --- | --- | :---:
 * successStatus | success status code (error status code is driven by the \
 * status defined as a member of the exception) | `200`
 * header | plain object containing the header names (in camel case convention) \
 * that should be used by the response | `{}`
 * extendOutput | plain object that gets deep merged with the \
 * final output | `{}`
 * headerOnly | if enabled ends the response without any data | ::false::
 * resultLabel | custom label used to hold the result under data. In case of \
 * undefined (default) it uses a fallback label based on the value type: \
 * <br><br>- primitive values are held under 'value' \
 * <br>- array value is held under 'items' \
 * <br>- object is assigned with `null` \
 * <br>* when a `null` label is used, the value is merged to the \
 * result.data | ::none::
 *
 * <br/>Example of defining the `header` option from inside of an action through
 * the metadata support:
 *
 * ```
 * // defining 'Content-Type' header
 * class MyAction extends Oca.Action{
 *    _perform(data){
 *
 *      // 'Content-Type' header
 *      this.metadata.handler.web = {
 *        writeOptions: {
 *          header: {
 *            contentType: 'application/octet-stream',
 *          },
 *        },
 *      };
 *
 *      // ...
 *    }
 * }
 * ```
 *
 * Also, headers can be defined through 'before action middlewares'
 * ({@link Web.addBeforeAction} and {@link Web.addBeforeAuthAction})
 */
class WebResponse extends Writer{

  constructor(value){
    super(value);
    this[_response] = null;

    // options
    Object.assign(this.options, {
      successStatus: 200,
      headerOnly: false,
      header: {},
      extendOutput: {
        apiVersion: Settings.get('apiVersion'),
      },
      resultLabel: undefined,
    });
  }

  /**
   * Sets the response object created by express
   *
   * @param {Object} value - res object
   * @see http://expressjs.com/en/api.html#res
   */
  set response(value){
    this[_response] = value;
  }

  /**
   * Returns the response object created by express
   *
   * @type {Object}
   * @see http://expressjs.com/en/api.html#res
   */
  get response(){
    return this[_response];
  }

  /**
   * Implements the response for an error value.
   *
   * Any error can carry a HTTP status code. It is done by defining `status` to any error
   * (for instance ```err.status = 501;```).
   * This practice can be found in all errors shipped with oca ({@link Conflict}, {@link NoContent},
   * {@link NotFound} and {@link ValidationFail}). In case none status is found in the error then `500`
   * is used automatically.
   *
   * The error response gets automatically encoded using json, following the basics
   * of google's json style guide. In case of an error status `500` the standard
   * result is ignored and a message `Internal Server Error` is used instead.
   *
   * Further information can be found at base class documentation
   * {@link Writer._errorOutput}.
   *
   * @protected
   */
  _errorOutput(){

    const status = this.value.status || 500;

    // setting the status code for the response
    this.response.status(status);

    const result = {
      error: {
        code: status,
        message: super._errorOutput(),
      },
    };

    // adding the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development'){
      result.error.stacktrace = this.value.stack.split('\n');
    }

    // should not leak any error message for the status code 500
    if (status === 500){
      result.error.message = 'Internal Server Error';
    }

    this._genericOutput(result);
  }

  /**
   * Implements the response for a success value.
   *
   * A readable stream value is piped using 'application/octet-stream' by default
   * (if it has not been defined), otherwise for non-readable stream value it's
   * automatically encoded using json, following the basics of google's json
   * style guide.
   *
   * Further information can be found at base class documentation
   * {@link Writer._successOutput}.
   *
   * @see https://google.github.io/styleguide/jsoncstyleguide.xml
   * @protected
   */
  _successOutput(){

    const value = super._successOutput();

    // setting the status code for the response
    this.response.status(this.options.successStatus);

    // setting header
    this._setResponseHeaders();

    // readable stream
    if (value instanceof stream.Readable){
      this._successStreamOutput(value);
      return;
    }

    this._successJsonOutput(value);
  }

  /**
   * Results a stream through the success output
   *
   * @param {stream} value - output value
   * @private
   */
  _successStreamOutput(value){
    // setting a default content-type for readable stream in case
    // it has not been set previously
    if (!(this.options.header && this.options.header.contentType)){
      this.response.setHeader('Content-Type', 'application/octet-stream');
    }

    value.pipe(this.response);
  }

  /**
   * Results the default success output through google's json style guide
   *
   * @param {*} value - output value
   * @private
   */
  _successJsonOutput(value){
    const result = {
      data: {},
    };

    // resolving the result label
    const resultLabel = this._resultLabel(value);
    if (resultLabel){
      result.data[resultLabel] = value;
    }
    else{
      assert(!TypeCheck.isPrimitive(value), "Can't output a primitive value without 'resultLabel'");
      Object.assign(result.data, value);
    }

    this._genericOutput(result);
  }

  /**
   * Generic output routine shared by both success and error outputs
   *
   * @param {*} data - arbitrary data used as output
   * @private
   */
  _genericOutput(data){

    // ending response without any data
    if (this.options.headerOnly){
      this.response.end();
      return;
    }

    // extending output
    const result = Util.deepMerge(data, this.options.extendOutput);

    // json output
    this.response.json(result);
  }

  /**
   * Returns the label used to hold the result under data. In case of undefined
   * (default) it uses a fallback label based on the value type:
   *
   * - primitive values are held under 'value'
   * - array value is held under 'items'
   * - object is assigned with `null`
   * * when a `null` label is used, the value is merged to the result.data
   *
   * @param {*} value - value that should be used by the result entry
   * @return {string|null}
   * @private
   */
  _resultLabel(value){
    let resultLabel = this.options.resultLabel;
    if (resultLabel === undefined){
      if (TypeCheck.isPrimitive(value)){
        resultLabel = 'value';
      }
      else if (TypeCheck.isList(value)){
        resultLabel = 'items';
      }
      else{
        resultLabel = null;
      }
    }

    return resultLabel;
  }

  /**
   * Looks for any header member defined as part of the options and sets them
   * to the response header. It expects a camelCase name convention for the header name
   *  where it gets translated to the header name convention, for instance:
   * 'options.header.contentType' translates to 'Content-Type'.
   *
   * @param {*} options - options passed to the output
   * @private
   */
  _setResponseHeaders(){

    if (this.options.header){
      for (const headerName in this.options.header){
        const convertedHeaderName = headerName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

        // assigning a header value to the response
        this.response.setHeader(convertedHeaderName, this.options.header[headerName]);
      }
    }
  }
}

// registering writer
Handler.registerWriter(WebResponse, 'web');

module.exports = WebResponse;
