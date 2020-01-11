const os = require('os');
const path = require('path');
const fs   = require('fs-extra');
const got = require('got');
const chalk = require('chalk');

const env         = require('../env');
const {persistdir} = env.vars();

const download = require('download');
const ProgressBar = require('progress');
const tar = require('tar');

exports.command = 'pull <registry> <image>';
exports.desc = 'Download an image from a registry';

exports.builder = yargs => {
    yargs.options({
    });
};

exports.handler = async argv => {
    const { registry, image } = argv;

    // Check type of registry
    if( registry.indexOf('#') >= 0 )
    {
        await githubRelease(registry, image);
    }
    else if( registry.indexOf("cloud-images.ubuntu.com") >= 0)
    {
        let url = `http://cloud-images.ubuntu.com/${image}/current/${image}-server-cloudimg-amd64-vagrant.box`;
        await downloadVagrantBox(url, image);
    }
    else
    {
        console.log(chalk.red(`Registry ${registry} not recognized.`));
    }

};

async function downloadVagrantBox(url, image)
{
    const imageDir = path.join(persistdir, 'images', image);

    // download files if not available locally
    if (!(fs.existsSync(path.join(imageDir, 'box.ovf')))) {

        await fetch(url, imageDir, 'vagrant.box' );
        await tar.x(
        {
            file: path.join(imageDir, 'vagrant.box'),
            C: imageDir
        });

        // Remove .box file
        fs.unlinkSync(path.join(imageDir, 'vagrant.box' ));
    }
    return path.join(imageDir, 'box.ovf');
}


async function githubRelease(registry, image)
{
    const [owner, repo, release] = registry.split(/[\/#]/g);
    const imageDir = path.join(persistdir, 'images', image);

    // checking if there is a newer version of an existing image
    const releaseAssets = (await got(`https://api.github.com/repos/${owner}/${repo}/releases`, { responseType: 'json' })).body.filter(r => r.tag_name == release)[0].assets;
    for (let asset of releaseAssets) {
        const existingImagePath = path.resolve(imageDir, asset.name.replace(`${image}-`, ''));
        const existingImageName = path.basename(existingImagePath);
        if (await fs.exists(existingImagePath)) {
            const mtime = (await fs.stat(existingImagePath)).mtime;
            if (new Date(asset.updated_at) > mtime) await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-${existingImageName}`, imageDir, existingImageName, true );
            else console.log(`${existingImagePath} is up to date.`);
        }
    }
    
    await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vmlinuz`, imageDir, 'vmlinuz' );
    await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-initrd`, imageDir, 'initrd' );
    await fetch(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vbox.iso`, imageDir, 'vbox.iso' );
}

async function fetch(isoUrl, outputDir, name, force = false) {
    if (!fs.existsSync(path.join(outputDir, name)) || force) {

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