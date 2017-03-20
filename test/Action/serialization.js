const assert = require('assert');
const Oca = require('../../src');
const testutils = require('../../testutils');

const Action = Oca.Action;
const Session = Oca.Session;

describe('Action Serialization:', () => {

  before(() => {
    // registrations
    Oca.registerAction(testutils.Actions.Shared.Multiply, 'multiplyAction');
  });

  // tests
  it('Should serialize the action into json', () => {

    return (async () => {
      const actionA = Oca.createAction('multiplyAction');
      actionA.input('a').value = 3;
      actionA.input('b').value = 4;

      const actionB = Action.createActionFromJson(await actionA.toJson());

      assert.equal(actionA.metadata.action.name, actionB.metadata.action.name);
      assert.equal(actionA.input('a').value, actionB.input('a').value);
      assert.equal(actionA.input('b').value, actionB.input('b').value);
      assert.equal(await actionA.id(), await actionB.id());

    })();
  });

  it('Should fail to serialize the action that contains a non-serializable input', () => {

    class NonSerializable extends testutils.Actions.Shared.Multiply{
      constructor(){
        super();
        this.createInput('nonSerializable: any');
      }
    }
    Oca.registerAction(NonSerializable);

    return (async () => {
      const action = Oca.createAction('NonSerializable');
      action.input('a').value = 3;
      action.input('b').value = 4;
      action.input('nonSerializable').value = {a: 1};

      let success = false;
      try{
        await action.toJson();
      }
      catch(err){
        if (err.message === 'serialization not supported!'){
          success = true;
        }
        else{
          throw err;
        }
      }

      if (!success){
        throw new Error("Can't serialize an action that contains non-serializable inputs");
      }
    })();
  });

  it('Should serialize the action into json with autofill values', () => {

    return (async () => {
      const actionA = Oca.createAction('multiplyAction', new Session({test: 10, test2: 1}));
      actionA.input('a').value = 4;
      actionA.input('b').value = 4;

      const actionB = Action.createActionFromJson(await actionA.toJson());

      assert.equal(actionA.session.autofill.test, actionB.session.autofill.test);
      assert.equal(actionA.session.autofill.test2, actionB.session.autofill.test2);
    })();
  });

  it('Should serialize the action contents into json testing the input values', () => {

    return (async () => {
      const actionA = new testutils.Actions.Shared.Multiply();
      actionA.input('a').value = 3;
      actionA.input('b').value = 4;

      const actionB = new testutils.Actions.Shared.Multiply();
      actionB.fromJson(await actionA.toJson(false));

      assert.equal(actionA.input('a').value, actionB.input('a').value);
      assert.equal(actionA.input('b').value, actionB.input('b').value);
      assert.equal(await actionA.id(), await actionB.id());
    })();
  });

  it('Should serialize the action contents into json testing the autofill', () => {

    return (async () => {
      const actionA = new testutils.Actions.Shared.Multiply();
      actionA.session = new Session({customValue: 'test', customValue2: 'test2'});
      actionA.input('a').value = 3;
      actionA.input('b').value = 4;

      const actionB = new testutils.Actions.Shared.Multiply();
      actionB.session = new Session();
      actionB.fromJson(await actionA.toJson());

      assert.equal(actionA.session.autofill.customValue, actionB.session.autofill.customValue);
      assert.equal(actionA.session.autofill.customValue2, actionB.session.autofill.customValue2);
    })();
  });

  it('Should serialize the action into json without autofill values (disabled during serialization)', () => {

    return (async () => {
      const actionA = Oca.createAction('multiplyAction', new Session({test: 10, test2: 1}));
      actionA.input('a').value = 4;
      actionA.input('b').value = 4;

      const actionB = Action.createActionFromJson(await actionA.toJson(false));

      assert.equal(actionB.session.autofill.test, undefined);
      assert.equal(actionB.session.autofill.test2, undefined);
    })();
  });
});
