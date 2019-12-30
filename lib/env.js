const os = require('os');
const fs = require('fs-extra');
const path = require('path');

const bakerdir = path.join( os.homedir(), '.bakerx');
// Script directory
const scriptdir = path.dirname(require.main.filename);
// For storing local saved data
const persistdir = path.join(bakerdir, '.persist');
// Local registry
const registry = path.join(persistdir, 'images');

// TODO: make sure to use bakerx. Actually, can download from release in setup.
const privateKey = path.join(os.homedir(), '.baker', 'baker_rsa')

const storage     = require('node-persist');

class Env {
    constructor() {
    }

    async setup()
    {
        // Ensure baker keys are installed.
        if (!await fs.exists(privateKey)) {
            await fs.copyFile(path.resolve(__dirname, 'config/baker_rsa'), privateKey);
            await fs.chmod(privateKey, '400');
        }

        await storage.init({dir: persistdir});
        if( !fs.existsSync( registry ))
        {
            fs.mkdirSync( registry );
        }
    }

    vars()
    {
        return {
            bakerdir: bakerdir,
            scriptdir: scriptdir,
            env: this,
            persistdir: persistdir,
            registry: registry,
            privateKey: privateKey
        }
    }
}

module.exports = new Env();