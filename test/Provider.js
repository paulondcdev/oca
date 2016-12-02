const assert = require('assert');
const TypeCheck = require('js-typecheck');
const minimatch = require('minimatch'); // eslint-disable-line
const Oca = require('../src');

const Action = Oca.Action;
const Provider = Oca.Provider;
const Session = Oca.Session;


describe('Provider:', () => {

  // initializing oca
  Oca.initialize();

  // providers used by the tests
  class CustomProviderA extends Provider{}
  class CustomProviderB extends CustomProviderA{}
  class CustomProviderC extends CustomProviderB{}

  // actions used by the tests
  class CustomActionA extends Action{}
  class CustomActionB extends CustomActionA{}

  before(() => {
    // registrations
    Oca.registerProvider(CustomProviderA);
    Oca.registerProvider(CustomProviderB);
    Oca.registerProvider(CustomProviderC);

    Oca.registerAction('CustomProviderA', CustomActionA);
    Oca.registerAction('CustomProviderA', CustomActionB);
  });

  // tests
  it('Should register a provider with a valid name', () => {
    class CustomProviderName extends CustomProviderA{}
    Oca.registerProvider(CustomProviderName, 'CustomProviderName_.-1');
  });

  it('Should raise an exception when creating a provider from a name that does not exist', () => {
    let success = false;

    try{
      Provider.create('DoesNotExist', new Session());
    }
    catch(err){
      success = minimatch(err.message, 'Provider: *, is not registered!');
    }

    assert(success);
  });

  it('Should raise an exception when registering the same provider type twice (with a different name)', () => {

    class NewProviderType extends Provider{}
    Oca.registerProvider(NewProviderType);

    let success = false;

    try{
      Oca.registerProvider(NewProviderType, 'NowWithADifferentName');
    }
    catch(err){
      success = minimatch(err.message, 'Cannot register type, it is already registered as: *');
    }

    assert(success);
  });

  it('Should test the registered provider names', () => {
    const total = Provider.registeredProviderNames.length;

    class NewProvider extends CustomProviderA{}
    Provider.registerProvider(NewProvider);

    // overriding the existing provider name
    class NewProvider2 extends CustomProviderA{}
    Provider.registerProvider(NewProvider2, 'NewProvider');

    assert.equal(Provider.registeredProviderNames.indexOf('NewProvider'), total);
  });

  it('Should webfy a provider overriding an existing route', () => {
    class NewProvider extends CustomProviderA{}
    Provider.registerProvider(NewProvider);
    Provider.webfyProvider(NewProvider);

    // overriding the existing provider name
    class NewProvider2 extends CustomProviderA{}
    Provider.registerProvider(NewProvider2, 'NewProvider');
    Provider.webfyProvider('NewProvider', {restRoute: 'NewProvider'});

    assert.equal(Provider.registeredProvider('NewProvider'), NewProvider2);
  });

  it('Should fail to register a provider with invalid name', () => {
    class CustomProviderInvalidName extends CustomProviderA{}

    let error = null;
    try{
      Oca.registerProvider(CustomProviderInvalidName, 'CustomProviderName$');
    }
    catch(err){
      error = err;
    }

    if (!(error && minimatch(error.message, 'Invalid provider name: *'))){
      throw error || new Error('Unexpected result');
    }
  });

  it('Should not be able to register an action for a non existing provider', () => {

    let error = null;
    try{
      Oca.registerAction('InvalidProviderName', CustomActionA);
    }
    catch(err){
      error = err;
    }

    if (!(error && minimatch(error.message, 'provider not found, is it registered?'))){
      throw error || new Error('Unexpected result');
    }
  });

  it('Should register an action for an specific provider', () => {
    Oca.registerAction('CustomProviderA', CustomActionA, 'customAction');
    const providerA = Provider.create('CustomProviderA', new Session());

    assert(providerA.actionNames.includes('customAction'));
  });

  it('Derived Providers should also derive the registered actions', () => {
    const providerB = Provider.create('CustomProviderB', new Session());
    const providerC = Provider.create('CustomProviderC', new Session());

    assert(providerB.actionNames.includes('customAction'));
    assert(providerC.actionNames.includes('customAction'));
  });

  it('Should factory an action based on the registered action name', () => {
    const providerA = Provider.create('CustomProviderA', new Session());
    const providerB = Provider.create('CustomProviderB', new Session());
    const providerC = Provider.create('CustomProviderC', new Session());

    assert(TypeCheck.isInstanceOf(providerA.createAction('customAction'), CustomActionA));
    assert(TypeCheck.isInstanceOf(providerB.createAction('customAction'), CustomActionA));
    assert(TypeCheck.isInstanceOf(providerC.createAction('customAction'), CustomActionA));
  });

  it('Derived Providers should be able to override derived actions', () => {
    const providerA = Provider.create('CustomProviderA', new Session());
    const providerB = Provider.create('CustomProviderB', new Session());
    const providerC = Provider.create('CustomProviderC', new Session());
    Oca.registerAction('CustomProviderB', CustomActionB, 'customAction');

    assert.notEqual(TypeCheck.isInstanceOf(providerA.createAction('customAction'), CustomActionB));
    assert(TypeCheck.isInstanceOf(providerB.createAction('customAction'), CustomActionB));
    assert(TypeCheck.isInstanceOf(providerC.createAction('customAction'), CustomActionB));
  });

  it('When creating an action from a name that does not exist it should return null', () => {
    const providerA = Provider.create('CustomProviderA', new Session());
    assert.equal(providerA.createAction('customActionB'), null);
  });

  it('Should be able to factory a provider directly from the main module (Oca.provider)', () => {
    const providerA1 = Provider.create('CustomProviderA', new Session());
    const providerA2 = Oca.createProvider('CustomProviderA', new Session());

    assert.notEqual(providerA1, null);
    assert.notEqual(providerA2, null);

    assert.equal(providerA1.constructor.name, providerA2.constructor.name);
  });

  it('Should register a listener for a provider event', (done) => {

    Provider.on('registerProvider', (providerName) => {
      if (providerName === 'CustomProviderName'){
        done();
      }
    });

    class NewProvider extends Provider{}
    Oca.registerProvider(NewProvider, 'CustomProviderName');
  });
});
