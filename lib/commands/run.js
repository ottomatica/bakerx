const os = require('os');
const path = require('path');
const fs   = require('fs');

const env         = require('../env');
const {privateKey,persistdir} = env.vars();

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

            options.iso = path.join(imageDir, 'vbox.iso');

            if( !await vbox.requirements() )
            {
                return;
            }
        
            vbox.privateKey = privateKey;
            await vbox.create(name, options);            
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
