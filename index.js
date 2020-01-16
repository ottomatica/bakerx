#!/usr/bin/env node
const yargs       = require('yargs');
const env = require('./lib/env');
const isWsl = require('is-wsl');
const chalk = require('chalk');
const child_process = require('child_process')
const version = require('./package.json').version;
const virtcrudVersion = JSON.parse(child_process.execSync(`cd ${__dirname} && npm list virtcrud --json`).toString()).dependencies.virtcrud.version;

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files
(async () => {

    if( isWsl )
    {
        console.log(chalk.red(`Running virtualization software inside Windows Subsystem for Linux is not supported.`))
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