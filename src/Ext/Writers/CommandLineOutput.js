const assert = require('assert');
const stream = require('stream');
const Handler = require('../../Handler');
const Writer = require('../../Writer');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');


/**
 * Command-line output writer.
 *
 * This writer is used by the output of the command-line handler
 * ({@link CommandLine.output}).
 *
 * In case the value is an exception then it's treated as
 * {@link CommandLineOutput._errorOutput} otherwise the value is treated as
 * {@link CommandLineOutput._successOutput}.
 *
 * <h2>Options Summary</h2>
 *
 * Option Name | Description | Default Value
 * --- | --- | :---:
 * parsingErrorStatusCode | Custom error status code used to identify when the \
 * command-line args could not be parsed | `700`
 */
class CommandLineOutput extends Writer{
  constructor(value){
    super(value);

    this[_stdout] = null;
    this[_stderr] = null;

    // options
    this.options.parsingErrorStatusCode = 700;
  }

  /**
   * Sets the stdout stream
   *
   * @param {stream} value - stream used as stdout
   */
  set stdout(value){
    assert(value instanceof stream, 'Invalid stream type');

    this[_stdout] = value;
  }

  /**
   * Returns the stream used as stdout
   *
   * @type {stream}
   */
  get stdout(){
    return this[_stdout];
  }

  /**
   * Sets the stderr stream
   *
   * @param {stream} value - stream used as stderr
   */
  set stderr(value){
    assert(value instanceof stream, 'Invalid stream type');

    this[_stderr] = value;
  }

  /**
   * Returns the stream used as stderr
   *
   * @type {stream}
   */
  get stderr(){
    return this[_stderr];
  }

  /**
   * Implements the response for an error value.
   *
   * The error output gets automatically encoded using json. The only exception are
   * parsing error messages that are identified by the status
   * defined by {@link CommandLine._parsingErrorStatusCode} where they are outputted without
   * any encoding.
   *
   * @return {Promise<Object>} data that is going to be serialized
   * @protected
   */
  _errorOutput(){

    process.exitCode = 1;

    if (this.value.status === this.options.parsingErrorStatusCode){
      this.stderr.write(`${this.value.message}\n`);
      return;
    }

    let output = super._errorOutput();

    output = JSON.stringify(output, null, ' ');
    output += '\n';

    this.stderr.write(output);

    return output;
  }

  /**
   * Implements the response for a success value.
   *
   * Readable streams are piped to {@link CommandLine.stdout} where
   * Non-readable stream values get outputted using json encoding.
   *
   * @return {Object} Object that is going to be serialized
   * @protected
   */
  _successOutput(){

    /* istanbul ignore next */
    if (this.value === undefined){
      return;
    }

    let output = super._successOutput();

    // readable stream
    if (output instanceof stream.Readable){
      output.pipe(this.stdout);
      return;
    }

    // json output
    output = JSON.stringify(output, null, ' ');
    output += '\n';

    this.stdout.write(output);

    return output;
  }
}

// registering writer
Handler.registerWriter(CommandLineOutput, 'commandLine');

module.exports = CommandLineOutput;
