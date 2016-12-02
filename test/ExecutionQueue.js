const assert = require('assert');
const Oca = require('../src');

const ExecutionQueue = Oca.ExecutionQueue;
const Provider = Oca.Provider;
const Action = Oca.Action;
const Session = Oca.Session;


describe('ExecutionQueue:', () => {

  // initializing oca
  Oca.initialize();

  // provider used by the tests
  class ExecutionQueueProvider extends Provider{}

  // actions used by the tests
  class ExecutionQueueActionA extends Action{
    constructor(){
      super();

      this.createInput('a: numeric');
      this.createInput('b: numeric');
    }

    _perform(){
      return Promise.resolve(this.input('a').value + this.input('b').value);
    }
  }

  class ExecutionQueueActionB extends ExecutionQueueActionA{
    constructor(){
      super();
      this.createInput('c: numeric');
    }

    _perform(){
      return Promise.resolve(this.input('a').value + this.input('b').value + this.input('c').value);
    }
  }

  before(() => {
    // registrations
    Oca.registerProvider(ExecutionQueueProvider);
    Oca.registerAction('ExecutionQueueProvider', ExecutionQueueActionA);
    Oca.registerAction('ExecutionQueueProvider', ExecutionQueueActionB);
  });

  // tests
  it('Should avoid to add the same action id twice to the queue', (done) => {

    (async () => {
      const queueProvider = Provider.create('ExecutionQueueProvider', new Session());
      const actionA1 = queueProvider.createAction('ExecutionQueueActionA');
      actionA1.input('a').value = 10;
      actionA1.input('b').value = 10;

      const executionQueue = new ExecutionQueue();
      executionQueue.appendAction(actionA1);
      executionQueue.appendAction(actionA1);

      const actionA2 = queueProvider.createAction('ExecutionQueueActionA');
      actionA2.input('a').value = 12;
      actionA2.input('b').value = 13;

      executionQueue.appendAction(actionA2);
      executionQueue.appendAction(actionA2);

      assert.equal((await executionQueue.contents()).length, 2);

      const actionB = queueProvider.createAction('ExecutionQueueActionB');
      actionB.input('a').value = 12;
      actionB.input('b').value = 10;
      actionB.input('c').value = 10;

      executionQueue.appendAction(actionB);
      executionQueue.appendAction(actionB);

      assert.equal((await executionQueue.contents()).length, 3);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should allow to add the same action id twice to the queue', (done) => {

    (async () => {
      const queueProvider = Provider.create('ExecutionQueueProvider', new Session());
      const actionA1 = queueProvider.createAction('ExecutionQueueActionA');
      actionA1.input('a').value = 10;
      actionA1.input('b').value = 10;

      const executionQueue = new ExecutionQueue();
      executionQueue.appendAction(actionA1);
      executionQueue.appendAction(actionA1, false);

      assert.equal((await executionQueue.contents()).length, 2);
    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should let arbitrary promises to be added to the queue', (done) => {

    (async () => {
      const executionQueue = new ExecutionQueue();
      executionQueue.appendWrappedPromise(() => {
        return Promise.resolve(true);
      });
      assert.equal((await executionQueue.contents()).length, 1);

      executionQueue.appendWrappedPromise(() => {
        return Promise.resolve(true);
      });
      assert.equal((await executionQueue.contents()).length, 2);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should clear the queue', (done) => {

    (async () => {
      const executionQueue = new ExecutionQueue();
      executionQueue.appendWrappedPromise(() => {
        return Promise.resolve(true);
      });

      const queueProvider = Provider.create('ExecutionQueueProvider', new Session());
      const actionA = queueProvider.createAction('ExecutionQueueActionA');
      actionA.input('a').value = 12;
      actionA.input('b').value = 13;

      executionQueue.appendAction(actionA);
      assert.equal((await executionQueue.contents()).length, 2);

      executionQueue.clear();
      assert.equal((await executionQueue.contents()).length, 0);
      assert(executionQueue.isEmpty);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should return the contents of the queue', (done) => {

    (async () => {
      const executionQueue = new ExecutionQueue();
      const wrappedPromise = () => {
        return Promise.resolve(true);
      };
      executionQueue.appendWrappedPromise(wrappedPromise);

      const queueProvider = Provider.create('ExecutionQueueProvider', new Session());
      const actionA = queueProvider.createAction('ExecutionQueueActionA');
      actionA.input('a').value = 12;
      actionA.input('b').value = 13;
      executionQueue.appendAction(actionA);

      assert.equal((await executionQueue.contents()).length, 2);

      assert.equal((await executionQueue.contents(false)).length, 1);
      assert.equal((await executionQueue.contents(false))[0], wrappedPromise);

      assert.equal((await executionQueue.contents(true, false)).length, 1);
      assert.equal((await executionQueue.contents(true, false))[0], actionA);
    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });


  it('Should execute the queue', (done) => {

    (async () => {

      const executionQueue = new ExecutionQueue();
      executionQueue.appendWrappedPromise(() => {
        return Promise.resolve(20);
      });

      const queueProvider = Provider.create('ExecutionQueueProvider', new Session());
      const actionA = queueProvider.createAction('ExecutionQueueActionA');
      actionA.input('a').value = 12;
      actionA.input('b').value = 13;
      executionQueue.appendAction(actionA);

      const result = await executionQueue.execute();

      assert.equal(result[0], 20);
      assert.equal(result[1], 25);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
