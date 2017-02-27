const Settings = require('../Settings');


/**
 * Exception raised when a resource already exists
 *
 * This error is provided by Oca to complement the rest support ({@link Web.restful}),
 * although the main purpose is to provide a status code which is used when reporting
 * it through requests, it can still be used when an action is executed
 * through a different handler since it defines a custom exception type that can be
 * used to identify the error
 *
 * @see {@link Handler._errorOutput}
 */
class Conflict extends Error{

  constructor(message){
    super(message);

    /**
     * Conflict error is assigned with the status code found at
     * `Settings.get('error/conflict/status')`
     * (default: `409`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/conflict/status');
  }
}

// default settings
Settings.set('error/conflict/status', 409);

module.exports = Conflict;
