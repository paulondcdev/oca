const assert = require('assert');
const Oca = require('../src');

const Action = Oca.Action;
const Provider = Oca.Provider;
const Session = Oca.Session;


describe('Serialized Action:', () => {

  // provider used by the tests
  class BasicProvider extends Provider{}

  // actions used by the tests
  class MultiplyAction extends Action{
    constructor(){
      super();

      this.createInput('inputA: numeric');
      this.createInput('inputB: numeric');
    }

    _perform(){
      // used by the tests
      this.wasCalled = true;
      return Promise.resolve(this.input('inputA').value * this.input('inputB').value);
    }
  }

  before(() => {
    // registrations
    Oca.registerProvider(BasicProvider);
    Oca.registerAction(BasicProvider, MultiplyAction);
  });

  // tests
  it('Should serialize the action into json', (done) => {

    (async () => {
      const basicProvider = Provider.create('BasicProvider', new Session());
      const actionA = basicProvider.createAction('MultiplyAction');
      actionA.input('inputA').value = 3;
      actionA.input('inputB').value = 4;

      const actionB = Provider.createActionFromJson(await actionA.toJson());

      assert.equal(actionA.info.providerName, actionB.info.providerName);
      assert.equal(actionA.input('inputA').value, actionB.input('inputA').value);
      assert.equal(actionA.input('inputB').value, actionB.input('inputB').value);
      assert.equal(await actionA.id, await actionB.id);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail to serialize the action that contains a non-serializable input', (done) => {

    class NonSerializable extends MultiplyAction{
      constructor(){
        super();
        this.createInput('nonSerializable: any');
      }
    }
    Provider.registerAction(BasicProvider, NonSerializable);

    (async () => {
      const basicProvider = Provider.create('BasicProvider', new Session());
      const action = basicProvider.createAction('NonSerializable');
      action.input('inputA').value = 3;
      action.input('inputB').value = 4;
      action.input('nonSerializable').value = {a: 1};

      let success = false;
      try{
        await action.toJson();
      }
      catch(err){
        if (err.message === 'Cannot be serialized!'){
          success = true;
        }
        else{
          throw err;
        }
      }

      if (!success){
        throw new Error("Can't serialize an action that contains non-serializable inputs");
      }

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should serialize the action into json with autofill values', (done) => {

    (async () => {
      const basicProvider = Provider.create('BasicProvider', new Session(null, {test: 10, test2: 1}));
      const actionA = basicProvider.createAction('MultiplyAction');
      actionA.input('inputA').value = 4;
      actionA.input('inputB').value = 4;

      const actionB = Provider.createActionFromJson(await actionA.toJson());

      assert.equal(actionA.session.autofill.test, actionB.session.autofill.test);
      assert.equal(actionA.session.autofill.test2, actionB.session.autofill.test2);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should serialize the action into json without autofill values (disabled during serialization)', (done) => {

    (async () => {
      const basicProvider = Provider.create('BasicProvider', new Session(null, {test: 10, test2: 1}));
      const actionA = basicProvider.createAction('MultiplyAction');
      actionA.input('inputA').value = 4;
      actionA.input('inputB').value = 4;

      const actionB = Provider.createActionFromJson(await actionA.toJson(false));

      assert.equal(actionB.session.autofill.test, undefined);
      assert.equal(actionB.session.autofill.test2, undefined);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
