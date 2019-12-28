#!/usr/bin/env node
const yargs       = require('yargs');
const env = require('./lib/env');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files
(async () => {

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