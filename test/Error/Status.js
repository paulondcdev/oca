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
  });

  it('Conflict should have the status code defined by the settings', () => {
    const error = new Conflict('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/conflict/status'));
  });

  it('NoContent should have the status code defined by the settings', () => {
    const error = new NoContent('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/noContent/status'));
  });

  it('NotFound should have the status code defined by the settings', () => {
    const error = new NotFound('Some Message');
    assert.equal(error.status, Oca.Settings.get('error/notFound/status'));
  });
});
