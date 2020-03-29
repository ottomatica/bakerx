const path = require('path');
const os   = require('os');
const fs   = require('fs-extra');
const slash = require('slash');
const ora = require('ora');
const chalk = require('chalk');
const waitssh = require('waitssh');
const utils = require('../utils');                
const child_process = require('child_process');

const env         = require('../env');
const {registry} = env.vars();
const {providers} = require('../providers');
const getSupportedFormat = require('../images');

const Connector = require('infra.connectors');

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
        ip: {
            describe: 'create host-only network and assign static ip address in NIC2 of VM',
            type: 'string'
        },
        sync: {
            default: false,
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
    const { provider, image, cpus, memory, name, bridged, ip, sync, attach } = argv;

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

        // Sync folders.
        let syncs = [];
        let root = (os.platform() == "win32") ? `${process.cwd().split(path.sep)[0]}/` : "/";
        syncs = sync ? [`${process.cwd()};/bakerx`, `${root};/host`] : [];

        console.log(`Creating ${name} using ${provider}...`);
        await providers[provider].create(name, {
            image: imagePath,
            cpus: cpus || 1,
            mem: memory || 1024,
            bridged: bridged,
            ip: ip,
            syncs: syncs
        }).then(() => {
            env.setVMImage(name,image);
            // update(name); // update local storage of the last VM created
            // if (attach) {
            //     providers[provider].attach(name);
            // }
        }).catch(e => console.error(e));

        let sshInfo = await providers[provider].getSSHConfig(name);
        
        const throbber = ora('Waiting for VM network to initialize... (can take a few seconds or minutes on slower hosts).').start();

        try {
            await waitssh(sshInfo);
        } catch (error) {
            console.error(error);
            throbber.stop();
            process.exit(1);
        }
        throbber.stop();

        // POST-CONFIGURATION

        let conn = Connector.getConnector('ssh', `${sshInfo.user}@${sshInfo.hostname}:${sshInfo.port}`, {privateKey: sshInfo.private_key});
        // Set static ip address
        if( ip )
        {
            await exec(conn, `${info.sudo?"sudo ":""}ip addr flush dev enp0s8`);
            await exec(conn, `${info.sudo?"sudo ":""}ip addr add ${ip} dev enp0s8`);
            await exec(conn, `${info.sudo?"sudo ":""}ip link set enp0s8 up`);
            let gateway = ip.substring(0, ip.lastIndexOf('.'));
            await exec(conn, `${info.sudo?"sudo ":""}ip route add ${gateway}.0/24 dev enp0s8`);
            await exec(conn, `${info.sudo?"sudo ":""}ip route add ${ip} via ${gateway}.1`);
        }

        // mount
        if( sync )
        {
            providers[provider].mountShares( 
                syncs,
                // duck type the connector in order to call our error handler wrapper.
                {exec: async (cmd) => {await exec(conn, cmd)} },
                info.sshUser, info.sudo
            );

            // checking if symlink is enabled on windows
            if (process.platform === 'win32') {
                const hasSymlink = !child_process.spawnSync(`mklink ${path.join(require('os').tmpdir(), 'a')} b`, { shell: true }).stderr.toString().includes('You do not have sufficient privilege to perform this operation');
                if (!hasSymlink)
                    console.log(chalk.keyword('orange')('You do not have sufficient privilege to create symlinks. Please see https://github.com/ottomatica/bakerx/blob/master/doc/symlink.md for better compatibility of --sync option.'));
                try {
                    await fs.remove(path.join(require('os').tmpdir(), 'a'));
                } catch { }
            }
        }

        console.log(chalk.keyword('hotpink')('The VM is now ready. You can run this ssh command to connect to it.'));
        console.log(`ssh -i "${slash(sshInfo.private_key)}" ${sshInfo.user}@${sshInfo.hostname} -p ${sshInfo.port} -o StrictHostKeyChecking=no`);
        console.log(`You may also run 'bakerx ssh ${name}' to connect to the machine.`)

    })();

};

async function exec(conn, cmd ) 
{
    var response = await conn.exec(cmd)
    if( response.stderr )
    {
        console.log(`Error executing command: ${cmd}`);
        console.log( response );
    }
}
