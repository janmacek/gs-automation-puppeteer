const gsAutomationLib = require('./GsAutomationLib.js')

/**
 * Responds to any HTTP request by one tun of automation of all challenges. This export is used by GCP Cloud Fuctions
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.runGsAutomation = (req, res) => {

    const assert = require('assert');
    assert(req.query.loginName && req.query.loginPwd, 'Login name and password for GS webpage are mandatory.')
    
    automation = new gsAutomationLib.GsAutomationClass(req.query.loginName, req.query.loginPwd, false)

    automation.run().then(_ => {
        res.status(200).send('OK: Automation finished successfully');
    }).catch(err => {
        console.error(err);
        res.status(500).send('ERROR: Automation was interrupted -> ' + err);
    });
}