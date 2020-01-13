
const fs = require('fs-extra');
const path = require('path');

const env         = require('../env');
const {registry} = env.vars();

const {providers} = require('../providers');
const getSupportedFormat = require('../images');

exports.command = 'images';
exports.desc = 'List available images in local registry';

exports.builder = () => {};

exports.handler = async () => {

    let table = await list();

    if (table.length === 0) {
        console.log('No images');
        return;
    }

    console.table(table);
};

function sizeToHumanSize(size) {
    if( size == 0 ) return 0;
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

async function list()
{
    let images = [];

    for (let name of await fs.readdir(registry)) {
        try {

            let formats = {};
            let supportedProviders = {};
            for( let provider of Object.keys(providers) )
            {
                let {kind} = await getSupportedFormat(provider, path.join(registry, name) );
                if( kind )
                {
                    formats[ kind ] = kind;
                    supportedProviders[provider] = provider;
                }
            }

            images.push({
                image: name,
                format: Object.keys(formats).join(','),
                providers: Object.keys(supportedProviders).join(',')
            });
        } catch (e) { console.log(e); }
    }

    return images;
}