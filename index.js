#!/usr/bin/env node
const yargs       = require('yargs');
const env = require('./lib/env');
const isWsl = require('is-wsl');
const chalk = require('chalk');
const child_process = require('child_process')
const version = require('./package.json').version;
const virtcrudVersion = JSON.parse(child_process.execSync(`npm list virtcrud --json`, {cwd: __dirname}).toString()).dependencies.virtcrud.resolved.split('#')[1].substring(0, 7);
const connector = require('infra.connectors').getConnector('local');
const os = require('os');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files
(async () => {

    if( isWsl )
    {
        console.log(chalk.red(`Error: Running virtualization software inside Windows Subsystem for Linux is not supported.`))
        return;
    }

    if (!connector.checkVirt()) {
        if (os.platform() === 'win32' && connector.checkHyperV())
            console.log(chalk.red(`Error: VirtualBox VMs cannot run when Hyper-V is enabled.`));
        
        else
            console.log(chalk.red(`Error: Virtualization support is required for running VMs, but it is disabled on this machine.`));

        return;
    }

    await env.setup();

    yargs
    //    .middleware(check)
        .commandDir('./lib/commands')
        .version(`bakerx@${version}\nvirtcrud@${virtcrudVersion}`)
        .demandCommand(1, 'Did you forget to specify a command?')
        .recommendCommands()
        .showHelpOnFail(true, 'Specify --help for available options')
        .strict(true)
        .help()
        .wrap(yargs.terminalWidth())
        .argv
})();