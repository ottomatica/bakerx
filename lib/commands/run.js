const os = require('os');
const path = require('path');
const fs   = require('fs');
const delay = require('delay');

const env         = require('../env');
const {vagrantPrivateKey,bakerxPrivateKey,persistdir} = env.vars();

// const { error } = require('../logger');

// const images = require('../images');
// const { update } = require('./attach');
// const { providers } = require('../providers');
//const { providerArg } = require('../args');


exports.command = 'run <name> <image>';
exports.desc = 'Provision a new micro kernel';

exports.builder = yargs => {
    yargs.options({
        provider: {
            alias: 'p',
            describe: 'the provider to use (vbox | qemu)',
            default: 'vbox',
            type: 'string'
        },
        cpus: {
            alias: 'c',
            describe: 'number of cpus (default 1)',
            type: 'number'
        },
        memory: {
            alias: 'm',
            describe: 'choose memory size in MB (default 1024)',
            type: 'number'
        },
        bridged: {
            alias: 'b',
            describe: 'enable bridged networking (DHCP IP)',
            type: 'boolean'
        },
        //provider: providerArg,
        sync: {
            default: true,
            description: 'whether to mount share the cwd and root with the vm',
            type: 'boolean'
        },
        attach: {
            default: false,
            alias: 'a',
            description: 'whether to auto-attach via SSH to the VM once built',
            type: 'boolean'
        }
    });
};

exports.handler = async argv => {
    const { provider, image, cpus, memory, name, bridged, sync, attach } = argv;


    const imageDir = path.join(persistdir, 'images', image);

    if (!fs.existsSync(imageDir)) {
         console.error(`${image} image not found`);
         return;
    }

    // let info = await images.info(image).catch(e => error(e));
    // if (info.providers.indexOf(provider) == -1) {
    //     error(`Please rebuild ${image} for ${provider}`);
    //     return;
    // }

    const virtcrud = require('virtcrud');
    
    (async () => {
    
        let options = {};
        if( memory )
        {
            options.mem = memory;
            options.cpus = cpus;
        }

        if (provider === 'qemu' && process.platform === 'linux')
        {
            
            let qemu = await virtcrud.getProvider('qemu');
            
            options.image = imageDir; 
            options.privateKey = privateKey;
            
            if( !await qemu.requirements() )
            {
                return;
            }
            
            await qemu.create(name, options);
            
        }
        else if( provider === 'vbox' )
        {
            let vbox = await virtcrud.getProvider('vbox');
            if( !await vbox.requirements() )
            {
                return;
            }
            options.bridged = true;

            if( fs.existsSync(path.join(imageDir, 'vbox.iso')) )
            {
                options.iso = path.join(imageDir, 'vbox.iso');
                vbox.privateKey = bakerxPrivateKey;
            }
            else if( fs.existsSync(path.join(imageDir, 'box.ovf')) )
            {
                options.ovf = path.join(imageDir, 'box.ovf')
                vbox.privateKey = vagrantPrivateKey;
                vbox.sshUser = 'vagrant';
            }
            else
            {
                console.log(`Could not find supported image in ${imageDir}`);
                return;
            }
        
            await vbox.create(name, options);   

            // waiting for the vm to boot
            console.log('Waiting for VM network to initialize... (can take a few seconds or minutes on slower hosts).');
            while(! await vbox.driver.waitForBoot(name)) { await delay(200); }
            console.log('The VM is now ready. You can run the ssh command above to connect to it.');
        } 
        else {
            console.error(`provider ${provider} is not suppported on ${process.platform}.`);
        }



    })();
    

    // let root = (os.platform() == "win32") ? `${process.cwd().split(path.sep)[0]}/` : "/";
    // let syncs = sync ? [`${process.cwd()};/slim`, `${root};/host`] : [];

    // await providers[provider].create(name, {
    //     image: image,
    //     cpus: cpus || info.cpus,
    //     mem: memory || info.memory,
    //     bridged,
    //     syncs,
    // }).then(() => {
    //     update(name); // update local storage of the last VM created
    //     if (attach) {
    //         providers[provider].attach(name);
    //     }
    // }).catch(e => error(e));
};
