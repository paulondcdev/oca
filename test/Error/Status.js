const assert = require('assert');
const Oca = require('../../src');

const ValidationFail = Oca.Error.ValidationFail;
const Conflict = Oca.Error.Conflict;
const NoContent = Oca.Error.NoContent;
const NotFound = Oca.Error.NotFound;


describe('Error status:', () => {

  it('ValidationFail should have the status code defined by the settings', () => {
    const error = new ValidationFail('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/validationFail/status'));
    assert.equal(error.nestedStatus, Oca.Settings.get('error/validationFail/nestedStatus'));
  });

  it('Conflict should have the status code defined by the settings', () => {
    const error = new Conflict('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/conflict/status'));
    assert.equal(error.nestedStatus, Oca.Settings.get('error/conflict/nestedStatus'));
  });

  it('NoContent should have the status code defined by the settings', () => {
    const error = new NoContent('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/noContent/status'));
    assert.equal(error.nestedStatus, Oca.Settings.get('error/noContent/nestedStatus'));
  });

  it('NotFound should have the status code defined by the settings', () => {
    const error = new NotFound('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/notFound/status'));
    assert.equal(error.nestedStatus, Oca.Settings.get('error/notFound/nestedStatus'));
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
