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

const bakerxPrivateKey = path.join(os.homedir(), '.bakerx', 'baker_rsa')
const vagrantPrivateKey = path.join(os.homedir(), '.bakerx', 'insecure_private_key')

const storage     = require('node-persist');

class Env {
    constructor() {
    }

    async setup()
    {
        await storage.init({dir: persistdir});
        if( !fs.existsSync( registry ))
        {
            fs.mkdirSync( registry );
        }

        // Ensure ssh keys are installed.
        if (!await fs.exists(bakerxPrivateKey)) {
            await fs.copyFile(path.resolve(__dirname, 'config/baker_rsa'), bakerxPrivateKey);
            await fs.chmod(bakerxPrivateKey, '400');
        }
        if (!await fs.exists(vagrantPrivateKey)) {
            await fs.copyFile(path.resolve(__dirname, 'config/insecure_private_key'), vagrantPrivateKey);
            await fs.chmod(vagrantPrivateKey, '400');
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
            bakerxPrivateKey: bakerxPrivateKey,
            vagrantPrivateKey: vagrantPrivateKey
        }
    }
}

module.exports = new Env();