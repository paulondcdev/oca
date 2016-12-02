const Provider = require('../../Provider');
const FileOperationActions = require('../Actions/FileOperation');


/**
 * File Operations Provider
 * @todo make it as an external dependency
 */
class FileOperation extends Provider{
}

// registering provider
Provider.registerProvider(FileOperation);

// registering actions
Provider.registerAction('FileOperation', FileOperationActions.Checksum);
Provider.registerAction('FileOperation', FileOperationActions.Copy);
Provider.registerAction('FileOperation', FileOperationActions.Delete);
Provider.registerAction('FileOperation', FileOperationActions.Download);
Provider.registerAction('FileOperation', FileOperationActions.Move);

module.exports = FileOperation;
