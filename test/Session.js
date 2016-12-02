const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Oca = require('../src');

const Session = Oca.Session;
const ExecutionQueue = Oca.ExecutionQueue;
const LruCache = Oca.Util.LruCache;


describe('Session:', () => {

  it('Should create a session with default options', () => {
    const session = new Session();

    assert.equal(session.request, null);
    assert(TypeCheck.isPlainObject(session.autofill));
    assert(TypeCheck.isInstanceOf(session.wrapup, ExecutionQueue));
    assert(TypeCheck.isInstanceOf(session.resultCache, LruCache));
  });

  it('Should create a session with customized options', () => {
    const wrapup = new Oca.ExecutionQueue();
    wrapup.appendWrappedPromise(() => {
      Promise.resolve(true);
    });

    const resultCache = new Oca.Util.LruCache(10 * 1024 * 1024, 60 * 1000);
    resultCache.set('test', 10);
    const session = new Session(null, {test: 100}, wrapup, resultCache);

    assert.equal(session.request, null);
    assert.equal(session.autofill.test, 100);
    assert(!session.wrapup.isEmpty);
    assert.equal(session.resultCache.keys[0], 'test');
  });
});
