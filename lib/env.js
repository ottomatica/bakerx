const os = require('os');
const path = require('path');

const bakerdir = path.join( os.homedir(), '.bakerx');
// Script directory
const scriptdir = path.dirname(require.main.filename);
// For storing local saved data
const persistdir = path.join(bakerdir, '.persist');

// TODO: make sure to use bakerx
const privateKey = path.join(os.homedir(), '.baker', 'baker_rsa')

class Env {
    constructor() {}

    vars()
    {
        return {
            bakerdir: bakerdir,
            scriptdir: scriptdir,
            env: this,
            persistdir: persistdir,
            privateKey: privateKey
        }
    }
}

module.exports = new Env();