const Oca = require('../../../src');


class UploadAction extends Oca.Action{
  constructor(){
    super();
    this.createInput('a: text');
    this.createInput('file: filePath', {allowedExtensions: ['bin']});
  }

  async _perform(data){
    const checksum = this.createAction('file.checksum');
    checksum.input('file').setupFrom(this.input('file'));

    return {
      a: data.a,
      fileHash: await checksum.execute(),
      fileName: this.input('file').basename(),
    };
  }

  async _finalize(err, value){
    // deleting the file
    const deleteAction = this.createAction('file.delete');
    deleteAction.input('file').setupFrom(this.input('file'));
    await deleteAction.execute();

    return Oca.Action.prototype._finalize.call(this, err, value);
  }
}

module.exports = UploadAction;
