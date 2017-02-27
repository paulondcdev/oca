const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Oca = require('../src');

const Session = Oca.Session;
const Tasks = Oca.Tasks;
const LruCache = Oca.Util.LruCache;


describe('Session:', () => {

  it('Should create a session with default options', () => {
    const session = new Session();

    assert(TypeCheck.isPlainObject(session.autofill));
    assert(session.wrapup instanceof Tasks);
    assert(session.resultCache instanceof LruCache);

    // arbitrary data should start empty
    assert.equal(session.keys.length, 0);
  });

  it('Should create a session with customized options', () => {
    const wrapup = new Oca.Tasks();
    wrapup.addWrappedPromise(() => {
      Promise.resolve(true);
    });

    const resultCache = new Oca.Util.LruCache(10 * 1024 * 1024, 60 * 1000);
    resultCache.set('test', 10);
    const session = new Session({test: 100}, wrapup, resultCache);

    assert.equal(session.autofill.test, 100);
    assert(!session.wrapup.isEmpty);
    assert.equal(session.resultCache.keys[0], 'test');
  });

  it('Should test setting the arbitrary data', () => {
    const session = new Session();
    session.set('value', 10);
    session.set('valueB', 20);

    assert.equal(session.get('value'), 10);
    assert.equal(session.get('valueB'), 20);
  });

  it('Should test the arbitrary data by returning a default value when the key is not found', () => {
    const session = new Session();
    assert.equal(session.get('doesNotExist', 10), 10);
    assert.equal(session.get('doesNotExist'), undefined);
  });

  it('Should test if a key exists under the arbitrary data', () => {
    const session = new Session();
    assert(!session.has('a'));

    session.set('a', 20);
    assert(session.has('a'));
  });

  it('Should return the keys that are defined under the arbitrary data', () => {
    const session = new Session();

    session.set('a', 10);
    session.set('b', 20);
    assert.equal(session.keys.length, 2);
    assert(session.keys.includes('a'));
    assert(session.keys.includes('b'));
  });
});
