const Settings = require('../Settings');


/**
 * Exception raised when a resource already exists.
 *
 * This error is provided by Oca to complement the rest support ({@link Web.restful}),
 * although the main purpose is to provide a status code which is used when reporting
 * it through requests, it can still be used when an action is executed
 * through a different handler since it defines a custom exception type that can be
 * used to identify the error.
 *
 * @see {@link Handler._errorOutput}
 */
class Conflict extends Error{

  constructor(message='Conflict'){
    super(message);

    /**
     * Status code used by the {@link Handler} when this error is raised from inside of a top
     * level action (an action that has not been created from another action).
     *
     * Value driven by:
     * `Settings.get('error/conflict/status')`
     * (default: `409`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/conflict/status');

    /**
     * Status code used by the {@link Handler} when this error is raised inside of an action
     * that has been created from another action ({@link Action.createAction}).
     *
     * Value driven by:
     * `Settings.get('error/conflict/nestedStatus')`
     * (default: `409`)
     *
     * @type {number}
     */
    this.nestedStatus = Settings.get('error/conflict/nestedStatus');
  }
}

// default settings
Settings.set('error/conflict/status', 409);
Settings.set('error/conflict/nestedStatus', 409);

module.exports = Conflict;
