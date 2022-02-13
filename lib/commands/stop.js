const chalk = require('chalk');
const { providers } = require('../providers');

exports.command = 'stop <names...>';
exports.desc = 'Delete an image or vm';

exports.builder = yargs => {
    yargs.options({
        provider: {
            alias: 'p',
            describe: 'the provider to use (vbox | kvm)',
            default: 'vbox',
            type: 'string'
        },        
    });
};

exports.handler = async argv => {
    let { names, provider } = argv;

    names = new Set(names);

    try {
        for (const name of names) {
            await providers[provider].stop(name, true);
            console.log(`${name} virtual machine is ${chalk.red('stopped')}.`);
        }
    } catch (e) {
        console.log(`${e}`);
    }
};
