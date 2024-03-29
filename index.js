#!/usr/bin/env node
const yargs       = require('yargs');
const env = require('./lib/env');
const isWsl = require('is-wsl');
const chalk = require('chalk');
const child_process = require('child_process')
const version = require('./package.json').version;

let virtcrudVersion;
try {

    const packages = require('./package-lock.json').packages;
    let dep = packages["node_modules/virtcrud"];    
    virtcrudVersion = `${dep.version} ${dep.resolved.split('#')[1].substring(0,7)}`;
    
} catch (err) {
    virtcrudVersion = 'UNKNOWN';
}

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