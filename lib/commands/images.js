
const fs = require('fs');

const env         = require('../env');
const {registry} = env.vars();

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

    for (let name of fs.readdirSync(registry)) {
        try {

            images.push({
                image: name
            });
        } catch (e) { undefined }
    }

    return images;
}