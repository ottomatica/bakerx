const fs   = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const env    = require('../env');
const { registry } = env.vars();

const { providers } = require('../providers');


exports.command = 'delete <vm|image> <names...>';
exports.desc = 'Delete an image or vm';

exports.builder = yargs => {
    yargs.options({
        provider: {
            alias: 'p',
            describe: 'the provider to use (vbox | qemu)',
            default: 'vbox',
            type: 'string'
        },        
    });
};

exports.handler = async argv => {
    // both vm and image have the same value
    const { vm: command, provider } = argv;
    let { names } = argv;

    names = new Set(names);

    try {
        for (const name of names) {
            switch (command) {
                case 'vm':
                    await providers[provider].delete(name);
                    break;
                case 'image':
                    await fs.remove(path.resolve(registry, name));
                    break;
            }
            console.log(`${command} named ${name} ${chalk.red('deleted')}.`);
        }
    } catch (e) {
        console.log(`${e}`);
    }
};