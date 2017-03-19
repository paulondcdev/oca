const assert = require('assert');
const stream = require('stream');
const TypeCheck = require('js-typecheck');
const Input = require('../../Input');
const Handler = require('../../Handler');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _args = Symbol('args');
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');


/**
* Handles the command-line integration using docopt specification.
*
* It enables the execution of actions that are triggered by command-line interfaces
* by reading ({@link CommandLineArgs}) the information that is passed to the action
* ({@link CommandLine.execute}) and taking care of the output by
* ({@link CommandLine.output}).
*
* Using the command-line handler:
*
* **Creating an action that is going be executed through the command-line**
* ```
* class MyAction extends Oca.Action{
*   constructor(){
*     super();
*     this.createInput('myArgument: text', {cliElementType: 'argument', description: 'my argument'});
*     this.createInput('myOption: bool', {description: 'my option'});
*   }
*
*   _perform(data){
*     const result = {
*       myArgument: data.myArgument,
*       myOption: data.myOption,
*     };
*     return Promise.resolve(result);
*   }
* }
*
* // registering the action
* Oca.registerAction(MyAction);
* ```
*
* **Executing the action through command-line**
* ```
* // making sure the script is called directly
* if (require.main === module) {
*
*   // creating a command-line handler which is used to load the command-line
*   // arguments to the action and to output the result back to the command-line
*   const commandLine = Oca.createHandler('commandLine');
*
*   // loading the parsed information to the action
*   commandLine.execute('myAction', {description: 'Welcome'}).then((result) => {
*
*     // success output
*     commandLine.output(result);
*
*   // error output
*   }).catch((err) => {
*     commandLine.output(err);
*   });
* }
* ```
* You can list the command help by invoking `-h` or `--help` where a help interface
* is generated automatically for the action, for instance:
*
* `node mycommand.js --help`
* ```
* Welcome.
*
* Usage: mycommand.js [options] <my-argument>
*
* Arguments:
*   my-argument  my argument (text type).
*
* Options:
*   --api=<value>  version used to make sure that the api is still compatible (version type).
*   --my-option    my option (bool type).
* ```
*
* @see http://docopt.org
*/
class CommandLine extends Handler{

  /**
   * Creates a command line handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    super(session);
    this.args = process.argv;
    this.stdout = process.stdout;
    this.stderr = process.stderr;
  }

  /**
   * Sets a list of argument values used by the reader, it must follow
   * the same pattern found at `process.argv`
   *
   * @param {Array<string>} value - argument list
   */
  set args(value){
    assert(TypeCheck.isList(value), 'value needs to be a list');
    assert(value.length >= 2, 'missing first argument process.execPath and second argument javaScript file being executed');

    this[_args] = value.slice(0);
  }

  /**
   * Returns a list of argument values used by the reader, by default it uses
   * `process.argv`.
   *
   * @type {Array<string>}
   */
  get args(){
    return this[_args];
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
   * Creates an instance of a reader for the current handler.
   * This passes the {@link CommandLine.args} to the reader.
   *
   * @param {Action} action - action instance used by the reader to parse the values
   * @param {Object} options - plain object containing the options passed to the reader
   * @return {Reader}
   * @protected
   */
  _createReader(action, options){
    const reader = super._createReader(action, options);

    // setting args to the reader
    reader.args = this.args;

    return reader;
  }

  /**
   * Creates an instance of a writer for the current handler
   *
   * This passes the {@link CommandLine.stdout} and {@link CommandLine.stderr}
   * to the writer.
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {Object} options - plain object containing the options passed to the writer
   * @return {Writer}
   * @protected
   */
  _createWriter(value, options){
    const writer = super._createWriter(value, options);

    // setting stdout & stderr to the writer
    writer.stdout = this.stdout;
    writer.stderr = this.stderr;

    return writer;
  }
}

Handler.registerHandler(CommandLine);

// registering properties
Input.registerProperty(Input, 'cliElementType', 'option');
Input.registerProperty(Input, 'cliShortOption');

module.exports = CommandLine;
