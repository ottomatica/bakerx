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

// Local state about vms
const vms = path.join(persistdir, 'vms');

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
        if( !fs.existsSync( vms ))
        {
            fs.mkdirSync( vms );
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

    // Store simple association between vms and images.
    getVMImage(vm)
    {
        let mapping = path.join(vms,vm,'image.txt');
        if( !fs.existsSync(mapping) )
        {
            return null;
        }
        return fs.readFileSync(mapping).toString().trim();
    }

    setVMImage(vm, image)
    {
        fs.mkdirpSync(path.join(vms,vm));
        fs.writeFileSync(path.join(vms,vm,'image.txt'), image);
    }
}

module.exports = new Env();