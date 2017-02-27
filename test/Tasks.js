const assert = require('assert');
const Oca = require('../src');
const testutils = require('../testutils');

const Tasks = Oca.Tasks;


describe('Tasks:', () => {

  class TasksActionB extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.createInput('c: numeric');
    }

    _perform(data){
      return Promise.resolve(data.a + data.b + data.c);
    }
  }

  before(() => {
    // registrations
    Oca.registerAction(testutils.Actions.Shared.Sum, 'tasksActionA');
    Oca.registerAction(TasksActionB);
  });

  // tests
  it('Should avoid to add the same action id twice to the tasks', () => {

    return (async () => {
      const actionA1 = Oca.createAction('tasksActionA');
      actionA1.input('a').value = 10;
      actionA1.input('b').value = 10;

      const tasks = new Tasks();
      tasks.addAction(actionA1);
      tasks.addAction(actionA1);

      const actionA2 = Oca.createAction('tasksActionA');
      actionA2.input('a').value = 12;
      actionA2.input('b').value = 13;

      tasks.addAction(actionA2);
      tasks.addAction(actionA2);

      assert.equal((await tasks.contents()).length, 2);

      const actionB = Oca.createAction('tasksActionB');
      actionB.input('a').value = 12;
      actionB.input('b').value = 10;
      actionB.input('c').value = 10;

      tasks.addAction(actionB);
      tasks.addAction(actionB);

      assert.equal((await tasks.contents()).length, 3);

    })();
  });

  it('Should allow to add the same action id twice to the tasks', () => {

    return (async () => {
      const actionA1 = Oca.createAction('tasksActionA');
      actionA1.input('a').value = 10;
      actionA1.input('b').value = 10;

      const tasks = new Tasks();
      tasks.addAction(actionA1);
      tasks.addAction(actionA1, false);

      assert.equal((await tasks.contents()).length, 2);
    })();
  });

  it('Should let arbitrary promises to be added to the tasks', () => {

    return (async () => {
      const tasks = new Tasks();
      tasks.addWrappedPromise(() => {
        return Promise.resolve(true);
      });
      assert.equal((await tasks.contents()).length, 1);

      tasks.addWrappedPromise(() => {
        return Promise.resolve(true);
      });
      assert.equal((await tasks.contents()).length, 2);

    })();
  });

  it('Should clear the tasks', () => {

    return (async () => {
      const tasks = new Tasks();
      tasks.addWrappedPromise(() => {
        return Promise.resolve(true);
      });

      const actionA = Oca.createAction('tasksActionA');
      actionA.input('a').value = 12;
      actionA.input('b').value = 13;

      tasks.addAction(actionA);
      assert.equal((await tasks.contents()).length, 2);

      tasks.clear();
      assert.equal((await tasks.contents()).length, 0);
      assert(tasks.isEmpty);

    })();
  });

  it('Should return the contents of the tasks', () => {

    return (async () => {
      const tasks = new Tasks();
      const wrappedPromise = () => {
        return Promise.resolve(true);
      };
      tasks.addWrappedPromise(wrappedPromise);

      const actionA = Oca.createAction('tasksActionA');
      actionA.input('a').value = 12;
      actionA.input('b').value = 13;
      tasks.addAction(actionA);

      assert.equal((await tasks.contents()).length, 2);

      assert.equal((await tasks.contents(false)).length, 1);
      assert.equal((await tasks.contents(false))[0], wrappedPromise);

      assert.equal((await tasks.contents(true, false)).length, 1);
      assert.equal((await tasks.contents(true, false))[0], actionA);
    })();
  });

  it('Should execute the tasks', () => {

    return (async () => {

      const tasks = new Tasks();
      tasks.addWrappedPromise(() => {
        return Promise.resolve(20);
      });

      const actionA = Oca.createAction('tasksActionA');
      actionA.input('a').value = 12;
      actionA.input('b').value = 13;
      tasks.addAction(actionA);

      const result = await tasks.execute();

      assert.equal(result[0], 20);
      assert.equal(result[1], 25);

    })();
  });
});
