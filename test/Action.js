const assert = require('assert');
const TypeCheck = require('js-typecheck');
const minimatch = require('minimatch'); // eslint-disable-line
const Oca = require('../src');

const Action = Oca.Action;
const Provider = Oca.Provider;
const Session = Oca.Session;
const ValidationError = Oca.ValidationError;


describe('Action:', () => {

  // initializing oca
  Oca.initialize();

  // provider used by the tests
  class BasicProvider extends Provider{}

  // actions used by the tests
  class MultiplyAction extends Action{
    constructor(){
      super();

      this.createInput('inputA: numeric', {defaultValue: 2});
      this.createInput('inputB: numeric', {defaultValue: 5});
      this.createInput('inputC: text', {required: false});
    }

    _perform(){
      // used by the tests
      this.wasCalled = true;

      return Promise.resolve(this.input('inputA').value * this.input('inputB').value);
    }
  }

  class CacheableAction extends MultiplyAction{

    constructor(){
      super();
      this.counter = 0;
    }

    _perform(){
      this.counter += 1;
      return super._perform();
    }

    _cacheable(){
      return true;
    }
  }

  before(() => {
    // registrations
    Oca.registerProvider(BasicProvider);
    Oca.registerAction(BasicProvider, MultiplyAction);
    Oca.registerAction(BasicProvider, CacheableAction);
  });

  // tests
  it('Should register an action with a valid name', () => {
    Provider.registerAction('BasicProvider', MultiplyAction, 'CustomActionName_.-1');
  });

  it('Should fail to register an action with invalid name', () => {

    let error = null;
    try{
      Provider.registerAction('BasicProvider', MultiplyAction, 'CustomActionName$');
    }
    catch(err){
      error = err;
    }

    if (!(error && minimatch(error.message, 'Invalid action name: *'))){
      throw error || new Error('Unexpected result');
    }
  });

  // input
  it('When querying an input that does not exist it should return defaultValue instead', () => {
    const basicProvider = Provider.create('BasicProvider', new Session());
    const multiplyAction = basicProvider.createAction('MultiplyAction');
    assert.equal(multiplyAction.input('FooNotInAction', 'someDefaultValue'), 'someDefaultValue');
  });

  it('When querying an input that exists it should return the input object (not defaultValue)', () => {
    const basicProvider = Provider.create('BasicProvider', new Session());
    const multiplyAction = basicProvider.createAction('MultiplyAction');
    assert.equal(multiplyAction.input('inputA', 'someDefaultValue').value, 2);
  });

  // input names
  it('When querying the input names it should return all inputs added to the action', () => {
    const basicProvider = Provider.create('BasicProvider', new Session());
    const multiplyAction = basicProvider.createAction('MultiplyAction');
    assert.equal(multiplyAction.inputNames.filter(x => (['inputA', 'inputB'].includes(x))).length, 2);
  });

  // execute
  it('Value received in resultCallback should match the one returned by _perform method', (done) => {

    const basicProvider = Provider.create('BasicProvider', new Session());
    const multiplyAction = basicProvider.createAction('MultiplyAction');
    multiplyAction.execute().then((value) => {

      let error = null;

      try{
        assert.equal(value, 10);
      }
      catch(err){
        error = err;
      }

      done(error);

    }).catch((err) => {
      done(err);
    });
  });

  it("LRU cache: should return the value from the cache when it's called multiple times with the same input configuration", (done) => {
    const basicProvider = Provider.create('BasicProvider', new Session());

    (async () => {
      const cacheableAction = basicProvider.createAction('CacheableAction');

      cacheableAction.input('inputA').value = 2;
      cacheableAction.input('inputB').value = 2;

      await cacheableAction.execute();
      await cacheableAction.execute();
      await cacheableAction.execute();

      assert.equal(cacheableAction.counter, 1);
    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('LRU cache: Should return a different id when the input is set with a different value', (done) => {

    const basicProvider = Provider.create('BasicProvider', new Session());

    (async () => {
      const cacheableAction = basicProvider.createAction('CacheableAction');
      const cacheIdA = await cacheableAction.id;

      cacheableAction.input('inputA').value = 1;

      assert.notEqual(cacheIdA, await cacheableAction.id);
    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('LRU cache: Test the value returned from the cache', (done) => {

    (async () => {
      const basicProvider = Provider.create('BasicProvider', new Session());
      const cacheableAction = basicProvider.createAction('CacheableAction');
      cacheableAction.input('inputA').value = 2;

      // asking twice for the same value (the second one returns from the cache)
      let result = await cacheableAction.execute();
      assert.equal(result, 10);

      let cacheResult = await cacheableAction.execute();
      assert.equal(result, cacheResult);

      // same test with a different value
      cacheableAction.input('inputA').value = 1;

      result = await cacheableAction.execute();
      cacheResult = await cacheableAction.execute();

      assert.equal(result, cacheResult);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail when trying to add the same input name twice', () => {
    const multiplyActionAction = new MultiplyAction();
    multiplyActionAction.createInput('newInput: bool');

    let failed = false;
    try{
      multiplyActionAction.createInput('newInput: text');
    }
    catch(err){
      failed = true;
    }

    assert(failed);
  });

  it('Should not be able to query an action id without creating it through the provider', (done) => {

    (async () => {
      const multiplyActionAction = new MultiplyAction();

      let failed = false;
      try{
        await multiplyActionAction.id;
      }
      catch(err){
        failed = true;
      }

      assert(failed, 'Should fail when querying the id from an action that was not created through a provider');

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should raise an exception when _perform has not being implemented', (done) => {
    const action = new Action();

    action._perform().then((value) => {
      done(new Error('Should fail when _perform is not implemented!'));
    }).catch((err) => {
      done();
    });
  });

  it('Wrap up actions: Should testing if they are being triggered by the finalize', (done) => {

    (async () => {

      const session = new Session();
      const basicProvider = Provider.create('BasicProvider', new Session());
      const wrapUpAction = basicProvider.createAction('MultiplyAction');

      wrapUpAction.input('inputA').value = 2;
      wrapUpAction.input('inputB').value = 2;
      session.wrapup.appendAction(wrapUpAction);

      let wrapupPromiseWasCalled = false;

      session.wrapup.appendWrappedPromise(() => {
        return new Promise((resolve, reject) => {
          wrapupPromiseWasCalled = true;
          resolve(true);
        });
      });

      await session.finalize();
      assert(wrapUpAction.wasCalled);
      assert(wrapupPromiseWasCalled);

      // it should raise an exception when trying to finalize the session again
      let failed = false;
      try{
        await session.finalize();
      }
      catch(err){
        failed = true;
      }

      if (!failed){
        throw new Error('It should have failed when finalize is triggered multiple times');
      }

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  // execute: error being carried to the result callback
  const multiplyActionResult = new MultiplyAction();
  multiplyActionResult.createInput('customInput: bool', {defaultValue: false}, function customValidation(){
    return new Promise((resolve, reject) => {
      reject(new ValidationError(this.name, 'foo error'));
    });
  });

  it('When an input has an invalid value (validation has failed), it should carry the error exception through resultCallback', (done) => {
    multiplyActionResult.execute().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done(TypeCheck.isInstanceOf(err, Error) ? null : new Error('Invalid Instance Type'));
    });
  });
});
