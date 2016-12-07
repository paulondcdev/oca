const assert = require('assert');
const Oca = require('../src');

const ValidationError = Oca.ValidationError;


describe('ValidationError:', () => {

  it('Should create an instance with only a message', () => {
    const error = new ValidationError('Some Message');
    assert.equal(error.message, 'Some Message');
  });

  it('Validation error should have 550 as status code', () => {
    const error = new ValidationError('Some Message');
    assert.equal(error.status, 550);
  });

  it('Should create an instance with an input name', () => {
    const error = new ValidationError('Some Message', null, 'someInput');
    assert.equal(error.inputName, 'someInput');
  });

  it('Should create an instance with an error code', () => {
    const error = new ValidationError('Some Message', '96c45e1f-cd2f-417f-9977-cf96101366ef', 'someInput');
    assert.equal(error.code, '96c45e1f-cd2f-417f-9977-cf96101366ef');
  });

  it('Should test the json support', () => {
    const errorA = new ValidationError('Some Message', '96c45e1f-cd2f-417f-9977-cf96101366ef', 'someInput');
    const errorB = ValidationError.fromJson(errorA.toJson());

    assert.equal(errorA.message, errorB.message);
    assert.equal(errorA.code, errorB.code);
    assert.equal(errorA.inputName, errorB.inputName);
  });
});
