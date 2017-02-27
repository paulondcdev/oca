const assert = require('assert');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const Oca = require('../../../../src');

const Action = Oca.Action;
const Settings = Oca.Settings;


describe('CommandLine Generic:', () => {

  class WriteStream extends stream.Writable{
    constructor(){
      super();
      this.data = [];
    }

    _write(chunk, enc, next){
      this.data.push(chunk);
      next();
    }
  }

  // action shared by the tests
  class FullSpec extends Action{
    constructor(){
      super();
      this.createInput('argumentA: text', {cliElementType: 'argument', description: 'argumentA help'});
      this.createInput('argumentB: text', {cliElementType: 'argument', description: 'argumentB help'});
      this.createInput('argumentOptionalA: text[]', {cliElementType: 'argument', description: 'argumentOptionalA help', defaultValue: ['a', 'b']});
      this.createInput('optionA: filePath[]', {cliElementType: 'option'});
      this.createInput('optionB: numeric', {cliShortOption: 'b', defaultValue: 90});
      this.createInput('optionC: numeric', {cliShortOption: 'c'});
      this.createInput('optionD: bool', {defaultValue: true, cliShortOption: 'd'});
      this.createInput('optionE: bool[]', {defaultValue: [false, true], cliShortOption: 'e'});
      this.createInput('optionF: bool');
      this.createInput('optionG: text[]', {defaultValue: ['text1', 'text2', 'text3']});
    }

    _perform(data){
      return Promise.resolve(data);
    }
  }

  class MultipleArgs extends Action{
    constructor(){
      super();
      this.createInput('a: text[]', {cliElementType: 'argument'});
    }

    _perform(data){
      return Promise.resolve(data.a);
    }
  }

  beforeEach(() => {
    Settings.set('handler/commandLine/stdout', new WriteStream());
    Settings.set('handler/commandLine/stderr', new WriteStream());
  });

  afterEach(() => {
    Settings.set('handler/commandLine/stdout', process.stdout);
    Settings.set('handler/commandLine/stderr', process.stderr);
  });

  it('Should list the help about the command', () => {
    return (async () => {

      const commandLine = Oca.createHandler('commandLine');
      commandLine.description = 'A command';
      commandLine.args = ['node', 'file', '-h'];
      const action = new FullSpec();

      try{
        await commandLine.loadToAction(action);
        await action.execute();
        throw new Error('Should have failed');
      }
      catch(err){
        assert.equal(`${err.message}\n`, fs.readFileSync(path.join(__dirname, 'usageHelp.txt'), 'utf8'));
      }
    })();
  });

  it('Should fail when the arguments do not conform to the requirements', () => {

    return (async () => {

      const commandLine = Oca.createHandler('commandLine');
      const action = new FullSpec();
      commandLine.args = [
        'node',
        'file',
        '--option-a',
        'test.txt',
        '--no-option-d',
        '-b',
        '10',
        '--option-c',
        '20',
      ];

      try{
        await commandLine.loadToAction(action);
        await action.execute();
        throw new Error('Should have failed');
      }
      catch(err){
        assert.equal(`${err.message}\n`, fs.readFileSync(path.join(__dirname, 'missingArg.txt'), 'utf8'));
      }
    })();
  });

  it('Should execute the command specified by the default usage method', () => {

    return (async () => {

      const commandLine = Oca.createHandler('commandLine');
      commandLine.args = [
        'node',
        'file',
        '--option-a',
        'test.txt',
        '--no-option-d',
        '--option-b',
        '10',
        '--option-c',
        '20',
        'argumentValueA',
        'argumentValueB',
        'argumentOptionalA1',
        'argumentOptionalA2',
      ];

      const action = new FullSpec();
      await commandLine.loadToAction(action);
      const result = await action.execute();

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'argumentOptionalA1');
      assert.equal(result.argumentOptionalA[1], 'argumentOptionalA2');
      assert.equal(result.optionA[0], 'test.txt');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, false);
      assert.equal(result.optionE[0], false);
      assert.equal(result.optionE[1], true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionG[0], 'text1');
      assert.equal(result.optionG[1], 'text2');
      assert.equal(result.optionG[2], 'text3');

    })();
  });

  it('Should execute the command specified by multiple values in --option-a', () => {

    return (async () => {

      const commandLine = Oca.createHandler('commandLine');
      commandLine.args = [
        'node',
        'file',
        'argumentValueA',
        'argumentValueB',
        '--option-b',
        '10',
        '--option-c',
        '20',
        '-e',
        '1',
        '--option-a',
        'test1.txt',
        'test2.txt',
      ];

      const action = new FullSpec();
      await commandLine.loadToAction(action);
      const result = await action.execute();

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'a');
      assert.equal(result.argumentOptionalA[1], 'b');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, true);
      assert.equal(result.optionE[0], true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionG[0], 'text1');
      assert.equal(result.optionG[1], 'text2');
      assert.equal(result.optionG[2], 'text3');
      assert.equal(result.optionA[0], 'test1.txt');
      assert.equal(result.optionA[1], 'test2.txt');

    })();
  });

  it('Should execute the command specified by multiple values in --option-e', () => {

    return (async () => {

      const commandLine = Oca.createHandler('commandLine');
      commandLine.args = [
        'node',
        'file',
        'argumentValueA',
        'argumentValueB',
        '--option-b',
        '10',
        '--option-c',
        '20',
        '--option-a',
        'test.txt',
        '--option-g',
        'test2.txt',
        '--option-e',
        '1',
        '0',
        '1',
      ];

      const action = new FullSpec();
      await commandLine.loadToAction(action);
      const result = await action.execute();

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'a');
      assert.equal(result.argumentOptionalA[1], 'b');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionA[0], 'test.txt');
      assert.equal(result.optionG[0], 'test2.txt');
      assert.equal(result.optionE[0], '1');
      assert.equal(result.optionE[1], '0');
      assert.equal(result.optionE[2], '1');
    })();
  });

  it('Should execute the command specified by multiple values in --option-g', () => {

    return (async () => {

      const commandLine = Oca.createHandler('commandLine');
      commandLine.args = [
        'node',
        'file',
        'argumentValueA',
        'argumentValueB',
        '--option-b',
        '10',
        '--option-c',
        '20',
        '--option-a',
        'test.txt',
        '--option-g',
        'g1',
        'g2',
        'g3',
      ];

      const action = new FullSpec();
      await commandLine.loadToAction(action);
      const result = await action.execute();

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'a');
      assert.equal(result.argumentOptionalA[1], 'b');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, true);
      assert.equal(result.optionE[0], false);
      assert.equal(result.optionE[1], true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionA[0], 'test.txt');
      assert.equal(result.optionG[0], 'g1');
      assert.equal(result.optionG[1], 'g2');
      assert.equal(result.optionG[2], 'g3');

    })();
  });

  it('Should test the command-line success render output', () => {

    let result;
    const commandLine = Oca.createHandler('commandLine');
    commandLine.args = [
      'node',
      'file',
      'argumentValueA',
      'argumentValueB',
      '--option-b',
      '10',
      '--option-c',
      '20',
      '--option-a',
      'test.txt',
      '--option-g',
      'g1',
      'g2',
      'g3',
    ];

    return (async () => {
      const action = new FullSpec();
      await commandLine.loadToAction(action);
      result = await action.execute();
      commandLine.output(result);

      const stderr = Buffer.concat(Settings.get('handler/commandLine/stderr').data).toString('ascii');
      const stdout = Buffer.concat(Settings.get('handler/commandLine/stdout').data).toString('ascii');

      assert.equal(stderr, '');
      const parsedResult = JSON.parse(stdout);

      assert.equal(result.argumentA, parsedResult.data.argumentA);
      assert.equal(result.argumentB, parsedResult.data.argumentB);
      assert.equal(result.argumentOptionalA[0], parsedResult.data.argumentOptionalA[0]);
      assert.equal(result.argumentOptionalA[1], parsedResult.data.argumentOptionalA[1]);
      assert.equal(result.optionA[0], parsedResult.data.optionA[0]);
      assert.equal(result.optionB, parsedResult.data.optionB);
      assert.equal(result.optionC, parsedResult.data.optionC);
      assert.equal(result.optionD, parsedResult.data.optionD);
      assert.equal(result.optionE[0], parsedResult.data.optionE[0]);
      assert.equal(result.optionE[1], parsedResult.data.optionE[1]);
      assert.equal(result.optionF, parsedResult.data.optionF);
      assert.equal(result.optionG[0], parsedResult.data.optionG[0]);
      assert.equal(result.optionG[1], parsedResult.data.optionG[1]);
      assert.equal(result.optionG[2], parsedResult.data.optionG[2]);

    })();
  });

  it('Should test the command-line fail render output (usage)', () => {

    const commandLine = Oca.createHandler('commandLine');
    commandLine.args = [
      'node',
      'file',
    ];

    return (async () => {
      let error;

      try{
        const action = new FullSpec();
        await commandLine.loadToAction(action);
        await action.execute();
      }
      catch(err){
        commandLine.output(err);
        error = err;
      }

      const stderr = Buffer.concat(Settings.get('handler/commandLine/stderr').data).toString('ascii');
      const stdout = Buffer.concat(Settings.get('handler/commandLine/stdout').data).toString('ascii');

      assert(error);
      assert.equal(stdout, '');
      assert.equal(stderr, `${error.message}\n`);

    })();
  });

  it('Should test the command-line fail render output (validation fail)', () => {

    const commandLine = Oca.createHandler('commandLine');
    commandLine.args = [
      'node',
      'file',
      'argumentValueA',
      'argumentValueB',
      '--option-b',
      'INVALID',
      '--option-c',
      '20',
      '--option-a',
      'test.txt',
      '--option-g',
      'g1',
      'g2',
      'g3',
    ];

    return (async () => {
      let error;

      try{
        const action = new FullSpec();
        await commandLine.loadToAction(action);
        await action.execute();
      }
      catch(err){
        commandLine.output(err);
        error = err;
      }

      const stderr = Buffer.concat(Settings.get('handler/commandLine/stderr').data).toString('ascii');
      const stdout = Buffer.concat(Settings.get('handler/commandLine/stdout').data).toString('ascii');

      assert(error);
      assert.equal(stdout, '');
      assert.equal(JSON.parse(stderr).error.message, error.toJson());

    })();
  });

  it('Should test passing an argument that receives multiple values', () => {

    const commandLine = Oca.createHandler('commandLine');
    commandLine.args = [
      'node',
      'file',
      'a',
      'b',
      'c',
    ];

    return (async () => {
      const action = new MultipleArgs();
      await commandLine.loadToAction(action);
      const result = await action.execute();

      assert.equal(result[0], 'a');
      assert.equal(result[1], 'b');
      assert.equal(result[2], 'c');
    })();
  });
});
