const path = require('path');
const fs   = require('fs-extra');
const slash = require('slash');
const virtcrud = require('virtcrud');
const ora = require('ora');
const chalk = require('chalk');

const env         = require('../env');
const {registry} = env.vars();
const Utils = require('../utils');
const {providers} = require('../providers');
const getSupportedFormat = require('../images');


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
            default: true,
            type: 'boolean'
        },
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

    const imageDir = path.join(registry, image);

    if (! await fs.exists(imageDir)) {
         console.error(`${image} image not found`);
         return;
    }
    if( !providers.hasOwnProperty(provider) )
    {
        console.error(`provider ${provider} is unknown or not suppported.`);
        return;
    }
    (async () => {
    
        if( !await providers[provider].requirements() )
        {
            return;
        }

        let {info,imagePath} = await getSupportedFormat(provider, imageDir);
        if( info == null )
        {
            console.log(`Could not find supported image in ${imageDir}`);
            return;
        }

        providers[provider].privateKey = info.privateKey;
        providers[provider].sshUser = info.sshUser;

        console.log(`Creating ${name} using ${provider}...`);
        await providers[provider].create(name, {
            image: imagePath,
            cpus: cpus || 1,
            mem: memory || 1024,
            bridged
        }).then(() => {
            // update(name); // update local storage of the last VM created
            // if (attach) {
            //     providers[provider].attach(name);
            // }
        }).catch(e => error(e));

        const throbber = ora('Waiting for VM network to initialize... (can take a few seconds or minutes on slower hosts).').start();
        while(! await providers[provider].driver.waitForBoot(name)) { Utils.timeout(200); }
        throbber.stop();
        console.log(chalk.keyword('hotpink')('The VM is now ready. You can run this ssh command to connect to it.'));

        let sshInfo = await providers[provider].getSSHConfig(name);
        console.log(`ssh -i ${slash(sshInfo.private_key)} ${sshInfo.user}@${sshInfo.hostname} -p ${sshInfo.port} -o StrictHostKeyChecking=no`);

    })();

};
