const stream = require('stream');
const Settings = require('../../Settings');
const Handler = require('../../Handler');
const Writer = require('../../Writer');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _response = Symbol('response');


/**
 * Writer used by the output of the web handler ({@link Web.output}).
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
 * headerOnly | if enabled ends the response without any data | ::false::
 * context | it can be used by clients to pass a value that echos in the data \
 * of the response | ::none::
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
      context: null,
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
   * The error response gets automatically encoded using json, following the basics
   * of google's json style guide. In case of an error status `500` the standard
   * result is ignored and a message `Internal Server Error` is used instead.
   *
   * Further information can be found at base class documentation
   * {@link Writer._errorOutput}.
   *
   * @return {Promise<Object>} data that is going to be serialized
   * @protected
   */
  _errorOutput(){

    let result = super._errorOutput();
    const status = result.error.code;

    // setting the status code for the response
    this.response.status(status);

    // should not leak any error message for the status code 500
    if (status === 500){
      result = 'Internal Server Error';
    }
    else{
      this._addTopLevelProperties(result);
    }

    this._genericOutput(result);

    return result;
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
   * @return {Object} Object that is going to be serialized
   * @see https://google.github.io/styleguide/jsoncstyleguide.xml
   * @protected
   */
  _successOutput(){

    const result = super._successOutput();

    // setting the status code for the response
    this.response.status(this.options.successStatus);

    // setting header
    this._setResponseHeaders();

    // readable stream
    if (result instanceof stream.Readable){

      // setting a default content-type for readable stream in case
      // it has not been set previously
      if (!(this.options.header && this.options.header.contentType)){
        this.response.setHeader('Content-Type', 'application/octet-stream');
      }

      result.pipe(this.response);
      return;
    }

    this._addTopLevelProperties(result);
    this._genericOutput(result);

    return result;
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

    // json output
    this.response.json(data);
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

  /**
  * Appends common properties to the output
  *
  * @param {Object} result - input result object
  * @see https://google.github.io/styleguide/jsoncstyleguide.xml
  * @private
  */
  _addTopLevelProperties(result){

    // api version
    result.apiVersion = Settings.get('apiVersion');

    // context
    if (this.options.context){
      result.context = this.options.context;
    }
  }
}

// registering writer
Handler.registerWriter(WebResponse, 'web');

module.exports = WebResponse;
