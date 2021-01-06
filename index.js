gsAutomationLib = require('./GsAutomationLib.js')

automation = new gsAutomationLib.GsAutomationClass('sfsf', 'sdfsf')

automation.run().then(_ => {
    console.log('OK: Automation finished successfully');
}).catch(err => {
    console.log('Failure');
});    