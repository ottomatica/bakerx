const os = require('os');
const path = require('path');
const fs   = require('fs');

const env         = require('../env');
const {persistdir} = env.vars();

const download = require('download');
const ProgressBar = require('progress');


exports.command = 'pull <image>';
exports.desc = 'Download micro kernel';

exports.builder = yargs => {
    yargs.options({
    });
};

exports.handler = async argv => {
    const { image } = argv;


    const imageDir = path.join(persistdir, 'images', 'alpine-baker');

    await fetch('https://github.com/ottomatica/baker-release/releases/download/latest-dev/kernel', imageDir, 'vmlinuz' )
    await fetch('https://github.com/ottomatica/baker-release/releases/download/latest-dev/file.img.gz', imageDir, 'initrd' )

};

    
async function fetch(isoUrl, outputDir, name)
{
    if (! fs.existsSync(path.join(outputDir, name)) ) {

        console.log(`Downloading image ${isoUrl}`);
        const bar = new ProgressBar('[:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: 0
        });

        await download(isoUrl, outputDir, {filename: name})
              .on('response', res => {
                // console.log(`Size: ${res.headers['content-length']}`);
                bar.total = res.headers['content-length'];
                res.on('data', data => bar.tick(data.length));
              })
              //.then(() => console.log('downloaded!'));


    }
}