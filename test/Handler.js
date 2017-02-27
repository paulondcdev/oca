const assert = require('assert');
const minimatch = require('minimatch');
const EventEmitter = require('events');
const Oca = require('../src');
const testutils = require('../testutils');

const Handler = Oca.Handler;
const HandlerParser = Oca.HandlerParser;
const Session = Oca.Session;


describe('Handler:', () => {

  class CustomParser extends HandlerParser{
    async _perform(inputList){
      const result = {};

      for (const input of inputList){
        result[input.name] = input.value;
      }

      return result;
    }
  }

  // dummy handler used by the tests bellow
  class CustomHandler extends Handler{
    constructor(...args){
      super(...args);

      this.inputData = {};
      this.renderSuccessOutput = null;
      this.renderErrorOutput = null;
    }

    async loadToAction(action){

      // calling super class that sets the session to the action
      await Handler.prototype.loadToAction.call(this, action, new CustomParser(action));

      for (const inputName in this.inputData){
        action.input(inputName).value = this.inputData[inputName];
      }
    }

    _successOutput(value){
      this.renderSuccessOutput = super._successOutput(value);
      return this.renderSuccessOutput;
    }

    _errorOutput(err){
      this.renderErrorOutput = super._errorOutput(err);
      return this.renderErrorOutput;
    }
  }
  Handler.registerHandler(CustomHandler);

  it('Should check if the handler has been registered', () => {
    assert(Oca.createHandler('CustomHandler') instanceof CustomHandler);
  });

  it('Should fail when trying to create an invalid handler', () => {
    let error = null;

    try{
      Oca.createHandler('invalid');
    }
    catch(err){
      error = err;
    }

    if (!(error && minimatch(error.message, 'Execution Handler: *, is not registered!'))){
      throw error || new Error('Unexpected result');
    }
  });

  it('Should register an handler with a custom name', () => {
    class CustomHandlerB extends CustomHandler{}
    Handler.registerHandler(CustomHandlerB, 'CustomHandlerBName');

    assert(Handler.registeredHandler('CustomHandlerBName'));
    assert(Oca.createHandler('CustomHandlerBName') instanceof CustomHandlerB);
  });

  it('Should check the registered handler names', () => {
    const beforeRegistratorNames = Handler.registeredHandlerNames;
    assert(!beforeRegistratorNames.includes('test'));
    Handler.registerHandler(CustomHandler, 'test');

    // the second registration should override the previous one (instead of adding a new one)
    Handler.registerHandler(CustomHandler, 'test');

    const afterRegistratorNames = Handler.registeredHandlerNames;
    assert(Handler.registeredHandlerNames.includes('test'));
    assert.equal(beforeRegistratorNames.length + 1, afterRegistratorNames.length);
  });

  it('Should check the registered handler masks', () => {

    class CustomHandlerMasksA extends CustomHandler{}
    Handler.registerHandler(CustomHandlerMasksA, 'customHandlerMasks');

    let registeredHandleNames = Handler.registeredHandlerMasks('CustomHandlerMasks');
    assert.equal(registeredHandleNames.length, 1);
    assert.equal(registeredHandleNames[0], '*');

    // registering a handler for using a custom mask
    class CustomHandlerMasksB extends CustomHandler{}
    Handler.registerHandler(CustomHandlerMasksB, 'customHandlerMasks', 'a.b.*');
    registeredHandleNames = Handler.registeredHandlerMasks('CustomHandlerMasks');
    assert.equal(registeredHandleNames.length, 2);
    assert.equal(registeredHandleNames[0], 'a.b.*');
    assert.equal(registeredHandleNames[1], '*');

    // registering a handler for using a custom mask (2)
    class CustomHandlerMasksC extends CustomHandler{}
    Handler.registerHandler(CustomHandlerMasksC, 'customHandlerMasks', 'a.b.c.*');
    registeredHandleNames = Handler.registeredHandlerMasks('CustomHandlerMasks');
    assert.equal(registeredHandleNames.length, 3);
    assert.equal(registeredHandleNames[0], 'a.b.c.*');
    assert.equal(registeredHandleNames[1], 'a.b.*');
    assert.equal(registeredHandleNames[2], '*');

    // querying the handlers through the mask
    assert(Handler.create('customHandlerMasks', 'a.b.c.d').constructor === CustomHandlerMasksC);
    assert(Handler.create('customHandlerMasks', 'a.b.d').constructor === CustomHandlerMasksB);
    assert(Handler.create('customHandlerMasks', 'a.d').constructor === CustomHandlerMasksA);
    assert(Handler.create('customHandlerMasks').constructor === CustomHandlerMasksA);
  });

  it('Should create an handler with a custom session', () => {

    const session = new Session({myValue: 100});
    const handler = Oca.createHandler('CustomHandler', '*', session);
    assert.equal(session.autofill.myValue, handler.session.autofill.myValue);
  });

  it('Should perform an action through the handler', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Oca.createHandler('CustomHandler');

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.input('a').value = 'text';
      action.input('b').value = 20;

      await handler.loadToAction(action);
      const result = await action.execute();

      // testing the result of the action
      assert.equal(result.a, action.input('a').value);
      assert.equal(result.b, action.input('b').value);

    })();
  });

  it('Should perform and render an action through the handler', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Oca.createHandler('CustomHandler');

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.input('a').value = 'A value';
      action.input('b').value = 30;

      await handler.loadToAction(action);
      const result = await action.execute();
      handler.output(result);

      // testing the result of the action
      assert.equal(result.a, action.input('a').value);
      assert.equal(result.b, action.input('b').value);

      // testing what was rendered
      assert.equal(handler.renderSuccessOutput.data.a, action.input('a').value);
      assert.equal(handler.renderSuccessOutput.data.b, action.input('b').value);

    })();
  });

  it('Should throw an exception when trying to finalize the session with a broken task inside of the handler output', (done) => {

    class CustomSessionEventHandler extends CustomHandler{
      static _sessionEvent = new EventEmitter();
    }

    Handler.registerHandler(CustomSessionEventHandler);
    CustomSessionEventHandler.onFinalizeError((err) => {
      if (err.message === 'Should fail'){
        done();
      }
      else{
        done(err);
      }
    });

    (async () => {
      const handler = Oca.createHandler('CustomSessionEventHandler');
      handler.session.wrapup.addWrappedPromise(() => Promise.reject(new Error('Should fail')));

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.input('a').value = 'A value';
      action.input('b').value = 30;

      await handler.loadToAction(action);
      const result = await action.execute();
      handler.output(result);

    })().then().catch(done);
  });

  it('Should not finalize the session when finalizeSession disabled inside of the handler output', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Oca.createHandler('CustomHandler');
      handler.session.wrapup.addWrappedPromise(() => Promise.reject(new Error('Should fail')));

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.input('a').value = 'A value';
      action.input('b').value = 30;

      await handler.loadToAction(action);
      const result = await action.execute();
      handler.output(result, false);
    })();
  });

  it('Should test if the exception is being rendered by the handler', () => {
    return (async () => {
      Handler.registerHandler(CustomHandler);
      const handler = Oca.createHandler('CustomHandler');

      const action = new testutils.Actions.Shared.PlainObjectResult();

      // leaving the value empty on purpose
      action.input('a').value = null;
      let failed = true;
      try{
        await handler.loadToAction(action);
        await action.execute();
        failed = false;
      }
      catch(err){
        if (!(err instanceof Oca.Error.ValidationFail)){
          throw err;
        }
        else{
          handler.output(err);
        }
      }

      if (!failed){
        throw new Error('Expected exception');
      }

      assert.equal(handler.renderErrorOutput.error.code, Oca.Settings.get('error/validationFail/status'));
    })();
  });
});
