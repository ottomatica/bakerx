const chalk = require('chalk');
const slash = require('slash');
const path = require('path');
const { providers } = require('../providers');
const env    = require('../env');
const { registry, vagrantPrivateKey } = env.vars();

const getSupportedFormat = require('../images');

exports.command = 'ssh-info <name>';
exports.desc = 'Provide ssh information for named VM';

exports.builder = yargs => {
    yargs.options({ 
        provider: {
            alias: 'p',
            describe: 'the provider to use (vbox | qemu)',
            default: 'vbox',
            type: 'string'
        },
        format: {
            describe: 'format of output to terminal (cmd | table | json)',
            default: 'cmd',
            type: 'string'
        }
    });
};

exports.handler = async argv => {
    // both vm and image have the same value
    const { name, provider, format } = argv;

    try {
        let sshConfig = await providers[provider].getSSHConfig(name);
        if( sshConfig.port == null )
        {
            console.log(chalk.red(`Could not locate VM called '${name}'`));
            return;
        }

        // Need to look up image specific connections (user, key)
        let image = env.getVMImage(name);
        let keyInfo = {};
        if( image )
        {
            const imageDir = path.join(registry, image);
            let {info,imagePath} = await getSupportedFormat(provider, imageDir);
            if( info == null )
            {
                console.log(`Could not find supported image in ${imageDir}`);
                // Instead of bailing, we'll let the possibility of user/key provided in options to do the work.
                // return;
                info = {};
            }
            keyInfo = info;
        }
        // console.log(`keyInfo: ${JSON.stringify(keyInfo)}`)
        sshConfig.privateKey = keyInfo.privateKey ||  vagrantPrivateKey;
        sshConfig.sshUser = keyInfo.sshUser || 'vagrant';

        switch (format) {
            case 'cmd': 
                console.log(`ssh -i "${slash(sshConfig.privateKey)}" ${sshConfig.user}@${sshConfig.hostname} -p ${sshConfig.port} -o StrictHostKeyChecking=no`);
                break;
            case 'table':
                console.table(sshConfig);
                break;
            case 'json':
                console.log(JSON.stringify(sshConfig, null, '  '));
                break;
            case 'config':
                let config = 
                ``;
                console.log(config);
                break;
        }
    } catch (e) {
        console.log(`${e}`);
    }
};
