const assert = require('assert');
const TypeCheck = require('js-typecheck');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _executionOrder = Symbol('executionOrder');

/**
 * Queue used to trigger evaluations at specific events
 *
 * This object is used by the {@link Session.wrapup} to hold actions and
 * promises that are triggered when the {@link Session} is about
 * to be terminated ({@link Session.finalize}). It can be used to avoid
 * the execution of an action that may be triggered multiple times across
 * nested actions where ideally it should be executed only once at the end
 */
class ExecutionQueue{

  /**
   * Creates an ExecutionQueue
   */
  constructor(){
    this[_executionOrder] = [];
  }

  /**
   * Appends an action to the queue
   *
   * @param {Action} action - action instance that should be executed in the wrap up
   * @param {boolean} [runOnlyOnce=true] - tells if the action should be ignore in case
   * it has already been executed previously (it's done by matching the {@link Action.id})
   */
  appendAction(action, runOnlyOnce=true){
    assert(TypeCheck.isCallable(action.execute), 'Invalid Action');

    this[_executionOrder].push({type: 'action', item: action, onlyOnce: runOnlyOnce});
  }

  /**
   * Appends a wrapped promise to the queue
   *
   * @param {function} wrappedPromise - function that should return a promise, ex:
   * ```javascript
   * q.appendWrappedPromise(() => Promise.resolve(3))
   * ```
   */
  appendWrappedPromise(wrappedPromise){
    assert(TypeCheck.isCallable(wrappedPromise), 'Promise needs to wrapped into a function');

    this[_executionOrder].push({type: 'promise', item: wrappedPromise});
  }

  /**
   * Returns a list ordered by inclusion that contains the actions and
   * promises which are executed through {@link execute}
   *
   * @param {boolean} [actions=true] - tells if the result should return the actions
   * @param {boolean} [promises=true] - tells if the result should return the promises
   * @return {Promise<Array>}
   */
  async contents(actions=true, promises=true){
    const result = [];
    const actionIds = [];

    for (const queued of this[_executionOrder]){
      // actions
      if (actions && queued.type === 'action'){
        const actionId = await queued.item.id;
        if (!queued.onlyOnce || !actionIds.includes(actionId)){
          actionIds.push(actionId);
          result.push(queued.item);
        }
      }

      // promises
      else if (promises && queued.type === 'promise'){
        result.push(queued.item);
      }
    }

    return result;
  }

  /**
   * Tells if the queue is empty
   *
   * @type {boolean}
   */
  get isEmpty(){
    return this[_executionOrder].length === 0;
  }

  /**
   * Resets the queue by cleaning all actions and promises
   *
   */
  clear(){
    this[_executionOrder].length = 0;
  }

  /**
   * Executes the actions and promises inside of the queued (provided by {@link contents})
   *
   * @return {Promise<Array>} Returns an array containing each result of the queue
   */
  async execute(){
    const contents = await this.contents();

    return Promise.all(contents.map((x) => {
      // promise
      if (TypeCheck.isCallable(x)){
        return x();
      }
      // action
      return x.execute();
    }));
  }
}

module.exports = ExecutionQueue;
