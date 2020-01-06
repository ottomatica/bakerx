#!/usr/bin/env node
const yargs       = require('yargs');
const env = require('./lib/env');
const isWsl = require('is-wsl');
const chalk = require('chalk');

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
        .version()
        .demandCommand(1, 'Did you forget to specify a command?')
        .recommendCommands()
        .showHelpOnFail(true, 'Specify --help for available options')
        .strict(true)
        .help()
        .wrap(yargs.terminalWidth())
        .argv
})();