const path = require('path');
const os   = require('os');
const fs   = require('fs-extra');
const slash = require('slash');
const ora = require('ora');
const chalk = require('chalk');
const utils = require('../utils');                

const env         = require('../env');
const {registry} = env.vars();
const {providers} = require('../providers');
const getSupportedFormat = require('../images');

const Connector = require('connectors');

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

        // We will wait until we can verify a connection to ssh server.
        let connected = false;
        do { 
            connected = await connect(sshInfo.port, sshInfo.hostname).catch( (error) =>
            {
                // terminate due to fatal exception.
                throbber.stop();
                console.log( error );
                process.exit(1);
            });
            // We have either timed out or received a ECONNRESET.
            if( !connected )
            {
                // Let's back-off a few seconds and retry again.
                await utils.timeout(5000);
            }
        } while( !connected );
        throbber.stop();

        // POST-CONFIGURATION

        let conn = Connector.getConnector('ssh', `${sshInfo.user}@${sshInfo.hostname}:${sshInfo.port}`, {privateKey: sshInfo.private_key});
        // Set static ip address
        if( ip )
        {
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

async function connect(port, host) {
    const s = new require('net').Socket();
    return new Promise((resolve, reject) => {
        try {
            // terminate connection after 10s so we can try again.
            s.setTimeout(10000, function () {
                //console.log('timeout')
                s.destroy();
                resolve(false);                
            });
            // We finally heard something from the ssh server, which should be the version string!
            s.on('data', (d) => {
                console.log('\nreceived from ssh server: ', d.toString())
                if (d.toString().includes("SSH-2")) {
                    s.destroy();
                    resolve(true)
                } 
                // We are talking to something else that isn't a ssh server. bail.
                else (reject(d));
            })
            // This is a good sign, this means the VM has booted up and networking is up.
            // However, the ssh server is not quite ready yet.
            s.on('error', function (e) {
                //console.log('ECONNRESET');
                s.destroy();
                resolve(false);
            });
            // Make our connection to server than write something and hope to hear something back in one of our handlers.
            s.connect(port, host, function(){
                //console.log('connected');
                s.write('check\r\n', function(){
                    //console.log('written');
                });
            });
        }
        // We received some other exception, terminate.
        catch (e) {
            reject(e);
        }
    });
}
