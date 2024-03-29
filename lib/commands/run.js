const path = require('path');
const os   = require('os');
const fs   = require('fs-extra');
const slash = require('slash');
const ora = require('ora');
const chalk = require('chalk');
const waitssh = require('waitssh');
const yaml = require('js-yaml');
const utils = require('../utils');                
const child_process = require('child_process');

const env         = require('../env');
const {registry} = env.vars();
const {providers} = require('../providers');
const getSupportedFormat = require('../images');

const Connector = require('infra.connectors');

exports.command = 'run [name] [image]';
exports.desc = 'Provision a new micro VM';

exports.builder = yargs => {
    yargs.options({
        provider: {
            alias: 'p',
            describe: 'the provider to use (vbox | kvm)',
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
        up: {
            description: 'Script to execute inside virtual machine after provisioned.',
            type: 'string'
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

    let { provider, image, cpus, memory, name, bridged, ip, sync, up, attach } = argv;

    // If either missing name or image, then assume using bakerx format.
    if (!name || !image) {
        const bakerxfilePath = path.join(process.cwd(), 'bakerx.yml');
        if (await fs.exists(bakerxfilePath)) {
            let text = (await fs.readFile(bakerxfilePath)).toString();
            // Remove carriage returns which messes with parsing multi-line strings
            text = text.replace(/\r/g, '');
            const bakerxfile = yaml.safeLoad(text, 'utf8');

            // If multiple servers, provision each one:
            if( bakerxfile.servers && Array.isArray(bakerxfile.servers) )
            {
                for( var server of bakerxfile.servers )
                {
                    server.provider = server.provider === undefined ? provider : server.provider;
                    await provision(server);
                }
            }
            else
            {
                // Provision single server with arguments provided in bakerxfile.
                bakerxfile.provider = bakerxfile.provider === undefined ? provider : bakerxfile.provider;
                await provision(bakerxfile);
            }

        }
        else {
            console.error(`bakerx.yml not found in current working directoy.`);
            return;
        }
    }
    else
    {
        // Provision based on argv parameters
        await provision(argv);
    }


};


async function provision(argv)
{
    let { provider, image, cpus, memory, name, bridged, ip, sync, up, attach } = argv;

    return new Promise(async function(resolve,reject)
    {
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

        console.log(chalk.yellowBright(`Creating ${name} using ${provider}...`));
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
                    console.log(chalk.keyword('orange')('You do not have sufficient privilege to create symlinks. Please enable Developer mode in Windows 10 settings for better compatibility of --sync option.'));
                try {
                    await fs.remove(path.join(require('os').tmpdir(), 'a'));
                } catch { }
            }
        }

        // Up script
        if( up )
        {
            if( await fs.exists( up ) )
            {
                conn.scp(up, "~/bakerx_up.sh");
            }
            else {
                let file = tmpFile('sh');
                fs.writeFileSync(file, up);
                conn.scp(file, "~/bakerx_up.sh");
                fs.unlinkSync(file);
            }
            console.log(chalk.keyword('lightblue')('Running provisioning script.'));
            await exec(conn, `${info.sudo?"sudo ":""}chmod +x ~/bakerx_up.sh`);
            await conn.stream(`${info.sudo?"sudo ":""}~/bakerx_up.sh`);
        }


        console.log(chalk.keyword('hotpink')('The VM is now ready. You can run this ssh command to connect to it.'));
        console.log(`ssh -i "${slash(sshInfo.private_key)}" ${sshInfo.user}@${sshInfo.hostname} -p ${sshInfo.port} -o StrictHostKeyChecking=no`);
        console.log(`You may also run 'bakerx ssh ${name}' to connect to the machine.`)
    
        resolve();
    });


}


async function exec(conn, cmd ) 
{
    var response = await conn.exec(cmd );
    if( response.stderr )
    {
        console.log(`Error executing command: ${cmd}`);
        console.log( response );
    }
}

function tmpFile(ext) {
    const Crypto = require('crypto');
    return path.join(os.tmpdir(),`bakerx-up.${Crypto.randomBytes(6).readUIntLE(0,6).toString(36)}.${ext}`);
} 

