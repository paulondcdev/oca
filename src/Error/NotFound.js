const Settings = require('../Settings');


/**
 * Exception raised when querying a resource that does not exist.
 *
 * This error is provided by Oca to complement the rest support ({@link Web.restful}),
 * although the main purpose is to provide a status code which is used when reporting
 * it through requests, it can still be used when an action is executed
 * through a different handler since it defines a custom exception type that can be
 * used to identify the error.
 *
 * @see {@link Handler._errorOutput}
 */
class NotFound extends Error{

  constructor(message='Not Found'){
    super(message);

    /**
     * Status code used by the {@link Handler} when this error is raised from inside of a top
     * level action (an action that has not been created from another action).
     *
     * Value driven by:
     * `Settings.get('error/notFound/status')`
     * (default: `404`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/notFound/status');

    /**
     * Status code used by the {@link Handler} when this error is raised inside of an action
     * that has been created from another action ({@link Action.createAction}).
     *
     * Value driven by:
     * `Settings.get('error/notFound/nestedStatus')`
     * (default: `404`)
     *
     * @type {number}
     */
    this.nestedStatus = Settings.get('error/notFound/nestedStatus');
  }
}

// default settings
Settings.set('error/notFound/status', 404);
Settings.set('error/notFound/nestedStatus', 404);

module.exports = NotFound;
