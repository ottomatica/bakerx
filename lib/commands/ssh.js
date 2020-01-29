const chalk = require('chalk');
const child_process = require('child_process');

const path = require('path');
const { providers } = require('../providers');
const env    = require('../env');
const { registry, vagrantPrivateKey } = env.vars();

const getSupportedFormat = require('../images');

exports.command = 'ssh <name>';
exports.desc = 'Provide interactive ssh session for named VM';

exports.builder = yargs => {
    yargs.options({
        provider: {
            alias: 'p',
            describe: 'the provider to use (vbox | qemu)',
            default: 'vbox',
            type: 'string'
        },        
        user: {
            alias: 'u',
            describe: 'Override default user.',
            type: 'string'
        },        
        identity: {
            alias: 'i',
            describe: 'Override default identify file.',
            type: 'string'
        },
    });
};

exports.handler = async argv => {
    // both vm and image have the same value
    const { name, provider, user, identity } = argv;

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
        sshConfig.privateKey = identity || keyInfo.privateKey ||  vagrantPrivateKey;
        sshConfig.sshUser = user || keyInfo.sshUser || 'vagrant';

        nativeSSH( sshConfig );
    } catch (e) {
        console.log(`${e}`);
    }
};

function nativeSSH( sshConfig )
{
    let sshCmd = `ssh -q -i "${sshConfig.privateKey}" -p ${sshConfig.port} -o StrictHostKeyChecking=no ${sshConfig.sshUser}@${sshConfig.hostname}`;
    console.log(`Connecting with ${sshCmd}`);
    return child_process.execSync(sshCmd, {stdio: ['inherit', 'inherit', 'inherit']});
}