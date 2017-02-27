const Settings = require('../Settings');

/**
 * Exception raised when the required resource that should be updated does not exist
 *
 * This error is provided by Oca to complement the rest support ({@link Web.restful}),
 * although the main purpose is to provide a status code which is used when reporting
 * it through requests, it can still be used when an action is executed
 * through a different handler since it defines a custom exception type that can be
 * used to identify the error
 *
 * @see {@link Handler._errorOutput}
 */
class NoContent extends Error{

  constructor(message){
    super(message);

    /**
     * No content error is assigned with the status code found at
     * `Settings.get('error/noContent/status')`
     * (default: `204`)
     *
     * @type {number}
     */
    this.status = Settings.get('error/noContent/status');
  }
}

// default settings
Settings.set('error/noContent/status', 204);

module.exports = NoContent;
