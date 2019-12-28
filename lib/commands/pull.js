const os = require('os');
const path = require('path');
const fs   = require('fs');

const env         = require('../env');
const {persistdir} = env.vars();

const download = require('download');
const ProgressBar = require('progress');

exports.command = 'pull <registry> <image>';
exports.desc = 'Download micro kernel';

exports.builder = yargs => {
    yargs.options({
    });
};

exports.handler = async argv => {
    const { registry, image } = argv;

    const [owner, repo, release] = registry.split(/[\/#]/g);
    const imageDir = path.join(persistdir, 'images', image);

    await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vmlinuz`, imageDir, 'vmlinuz' )
    await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-initrd`, imageDir, 'initrd' )
    await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-slim.iso`, imageDir, 'vbox.iso' )
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
              .catch( function(err) {
                
                console.log(`${name} not found: ${err}`);

              });
              //.then(() => console.log('downloaded!'));


    }
}