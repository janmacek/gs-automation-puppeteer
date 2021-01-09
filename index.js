gsAutomationLib = require('./GsAutomationLib.js')

if(process.argv.length != 4) {
    console.error('This scripts requires 2 arguments: login and password !')
}

automation = new gsAutomationLib.GsAutomationClass(process.argv[2], process.argv[3])

automation.run().then(_ => {
    console.log('OK: Automation finished successfully');
}).catch(err => {
    console.error(err)
});    