const Settings = require('../Settings');


/**
 * Exception raised when querying a resource that does not exist
 *
 * This error is provided by Oca to complement the rest support ({@link Web.restful}),
 * although the main purpose is to provide a status code which is used when reporting
 * it through requests, it can still be used when an action is executed
 * through a different handler since it defines a custom exception type that can be
 * used to identify the error
 *
 * @see {@link Handler._errorOutput}
 */
class NotFound extends Error{

  constructor(message){
    super(message);

    /**
     * Not found error is assigned with the status code found at
     * `Settings.get('error/notFound/status')`
     * (default: `404`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/notFound/status');
  }
}

// default settings
Settings.set('error/notFound/status', 404);

module.exports = NotFound;
