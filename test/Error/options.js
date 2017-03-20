const assert = require('assert');
const Oca = require('../../src');

const ValidationFail = Oca.Error.ValidationFail;
const Conflict = Oca.Error.Conflict;
const NoContent = Oca.Error.NoContent;
const NotFound = Oca.Error.NotFound;


describe('Error options:', () => {

  it('ValidationFail should have the status code defined by the settings', () => {
    const error = new ValidationFail('Some Message');
    assert.equal(error.status, 400);
    assert.equal(error.status, Oca.Settings.get('error/validationFail/status'));
  });

  it('Conflict should have the status code defined by the settings', () => {
    const error = new Conflict('Some Message');
    assert.equal(error.status, 409);
    assert.equal(error.status, Oca.Settings.get('error/conflict/status'));
  });

  it('NoContent should have the status code defined by the settings', () => {
    const error = new NoContent('Some Message');
    assert.equal(error.status, 204);
    assert.equal(error.status, Oca.Settings.get('error/noContent/status'));
  });

  it('NotFound should have the status code defined by the settings', () => {
    const error = new NotFound('Some Message');
    assert.equal(error.status, 404);
    assert.equal(error.status, Oca.Settings.get('error/notFound/status'));
  });

  it('ValidationFail should not be allowed as output inside of nested actions', () => {
    const error = new ValidationFail('Some Message');
    assert.equal(error.disableOutputAsNested, true);
    assert.equal(error.disableOutputAsNested, Oca.Settings.get('error/validationFail/disableOutputAsNested'));
  });

  it('Conflict should be allowed as output inside of nested actions', () => {
    const error = new Conflict('Some Message');
    assert.equal(error.disableOutputAsNested, false);
    assert.equal(error.disableOutputAsNested, Oca.Settings.get('error/conflict/disableOutputAsNested'));
  });

  it('NotFound should be allowed as output inside of nested actions', () => {
    const error = new NotFound('Some Message');
    assert.equal(error.disableOutputAsNested, false);
    assert.equal(error.disableOutputAsNested, Oca.Settings.get('error/notFound/disableOutputAsNested'));
  });

  it('NoContent should be allowed as output inside of nested actions', () => {
    const error = new NoContent('Some Message');
    assert.equal(error.disableOutputAsNested, false);
    assert.equal(error.disableOutputAsNested, Oca.Settings.get('error/noContent/disableOutputAsNested'));
  });

  it('Conflict should have a default message', () => {
    const error = new Conflict();
    assert.equal(error.message, 'Conflict');
  });

  it('NoContent should have a default message', () => {
    const error = new NoContent();
    assert.equal(error.message, 'No Content');
  });

  it('NotFound should have a default message', () => {
    const error = new NotFound();
    assert.equal(error.message, 'Not Found');
  });
});
