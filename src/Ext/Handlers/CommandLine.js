const assert = require('assert');
const stream = require('stream');
const TypeCheck = require('js-typecheck');
const Action = require('../../Action');
const Input = require('../../Input');
const Handler = require('../../Handler');
const Settings = require('../../Settings');
const CommandLineArgs = require('../HandlerParsers/CommandLineArgs');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _args = Symbol('args');
const _description = Symbol('description');


/**
* Handles the command-line integration using docopt specification
*
* It enables the execution of actions that are triggered by command-line interfaces
* by parsing ({@link CommandLineArgs}) the information that is passed to the action
* ({@link CommandLine.loadToAction}) and taking care of the serialization of the output
* ({@link CommandLine.output}).
*
* Using a command line parser:
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
*   // creating an instance of the action
*   const action = Oca.createAction('MyAction');
*
*   // creating a command-line handler which is used to load the command-line
*   // arguments to the action and to output the result back to the command-line
*   const commandLine = Oca.createHandler('commandLine');
*   commandLine.description = "A description about my command";
*
*   // loading the parsed information to the action
*   commandLine.loadToAction(action).then(() => {
*
*     // executing action
*     return action.execute();
*
*   // success output
*   }).then((result) => {
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
* A description about my command.
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

    // default value
    this.args = process.argv;
    this.description = '';
  }

  /**
   * Sets a list of argument values used by the parser, it must follow
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
   * Returns a list of argument values used by the parser, by default it uses
   * `process.argv`.
   *
   * @type {Array<string>}
   */
  get args(){
    return this[_args];
  }

  /**
   * Sets the description displayed on the top when help is invoked
   *
   * @param {string} value - text that should be used for the description
   */
  set description(value){
    assert(TypeCheck.isString(value), 'value needs to be a string');
    this[_description] = value;
  }

  /**
   * Returns the description displayed on the top when help is invoked
   *
   * @type {string}
   */
  get description(){
    return this[_description];
  }

  /**
   * Returns the stdout stream used to output the success result
   * It looks for the value at `Settings.get('handler/commandLine/stdout')`
   * (default: `process.stdout`)
   *
   * @type {stream}
   */
  static get stdout(){
    return Settings.get('handler/commandLine/stdout');
  }

  /**
   * Returns the stderr stream used to output an error.
   * It looks for the value at `Settings.get('handler/commandLine/stderr')`
   * (default: `process.stderr`)
   *
   * @type {stream}
   */
  static get stderr(){
    return Settings.get('handler/commandLine/stderr');
  }

  /**
   * Collects the parsed information from the request and loads it to the action using
   * {@link Handler.loadToAction}
   *
   * By the default it uses the {@link CommandLineArgs} parser if none parser is specified.
   *
   * Options assigned to the parser:
   * - description - value of {@link CommandLine.description}
   * - parsingErrorStatusCode - value of {@link CommandLine._parsingErrorStatusCode}
   *
   * @param {Action} action - action that should be used
   * @param {HandlerParser} parser - parser that should be used to query the
   * information which will be loaded to the action.
   * @return {Promise<*>} returns the value of the action
   */
  loadToAction(action, parser=null){
    assert(action instanceof Action, 'Invalid action type!');

    // creating request parser if needed
    const useParser = parser || new CommandLineArgs(action, this.args);

    // setting the parsing options
    useParser.options.description = this.description;
    useParser.options.parsingErrorStatusCode = CommandLine._parsingErrorStatusCode;

    return super.loadToAction(action, useParser);
  }

  /**
   * Implements the response for an error value
   *
   * The error output gets automatically encoded using json. The only exception are
   * parsing error messages that are identified by the status
   * defined by {@link CommandLine._parsingErrorStatusCode} where they are outputted without
   * any encoding.
   *
   * @param {Error} err - exception that should be outputted as error response
   * @return {Promise<Object>} data that is going to be serialized
   * @protected
   */
  _errorOutput(err){

    process.exitCode = 1;

    if (err.status === CommandLine._parsingErrorStatusCode){
      this.constructor.stderr.write(`${err.message}\n`);
      return;
    }

    let output = super._errorOutput(err);

    output = JSON.stringify(output, null, ' ');
    output += '\n';

    this.constructor.stderr.write(output);

    return output;
  }

  /**
   * Implements the response for a success value
   *
   * Readable streams are piped to {@link CommandLine.stdout} where
   * Non-readable stream values get outputted using json encoding.
   *
   * @param {*} value - value to be outputted
   * @return {Object} Object that is going to be serialized
   * @protected
   */
  _successOutput(value){

    /* istanbul ignore next */
    if (value === undefined){
      return;
    }

    let output = super._successOutput(value);

    // readable stream
    if (output instanceof stream.Readable){
      output.pipe(this.constructor.stdout);
      return;
    }

    // json output
    output = JSON.stringify(output, null, ' ');
    output += '\n';

    this.constructor.stdout.write(output);

    return output;
  }

  /**
   * Custom error status (`700`) code used to identify when the command-line args
   * could not be parsed
   *
   * @type {number}
   * @protected
   */
  static _parsingErrorStatusCode = 700;
}

Handler.registerHandler(CommandLine);

// default settings
Settings.set('handler/commandLine/stdout', process.stdout);
Settings.set('handler/commandLine/stderr', process.stderr);

// registering properties
Input.registerProperty(Input, 'cliElementType', 'option');
Input.registerProperty(Input, 'cliShortOption');

module.exports = CommandLine;
