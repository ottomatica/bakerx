const path = require('path');
const fs   = require('fs-extra');
const got = require('got');
const chalk = require('chalk');
const tar = require('tar');

const utils = require('../utils');
const env = require('../env');
const {persistdir} = env.vars();

exports.command = 'pull <registry> <image>';
exports.desc = 'Download an image from a registry';

exports.builder = yargs => {
    yargs.options({
        force: {
            alias: 'f',
            describe: 'force downloading the image, even if it already exists',
            default: false,
            type: 'boolean'
        }
    });
};

exports.handler = async argv => {
    const { registry, image, force } = argv;

    // Check type of registry
    if( registry.indexOf('#') >= 0 )
    {
        await githubRelease(registry, image, force);
    }
    else if( registry.indexOf("cloud-images.ubuntu.com") >= 0)
    {
        let url = `https://cloud-images.ubuntu.com/${image}/current/${image}-server-cloudimg-amd64-vagrant.box`;
        await downloadVagrantBox(url, image, force);
    }
    else
    {
        console.log(chalk.red(`Registry ${registry} not recognized.`));
    }

};

async function downloadVagrantBox(url, image, force)
{
    const imageDir = path.join(persistdir, 'images', image);

    // download files if not available locally
    if (!(fs.existsSync(path.join(imageDir, 'box.ovf'))) || force) {

        if( !fs.existsSync(imageDir) ) { fs.mkdirSync(imageDir) }
        //require('child_process').execSync(`cd ${imageDir} && wget ${url} -O vagrant.box`)
        //require('child_process').execSync(`cd ${imageDir} && tar -zxvf ${path.join(imageDir, 'vagrant.box')}`);

        await utils.download(url, imageDir, 'vagrant.box', force);

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


async function githubRelease(registry, image, force)
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
            if (new Date(asset.updated_at) > mtime) await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-${existingImageName}`, imageDir, existingImageName, true);
            else console.log(`${existingImagePath} is up to date.`);
        }
    }
    
    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vmlinuz`, imageDir, 'vmlinuz', force );
    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-initrd`, imageDir, 'initrd', force );
    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vbox.iso`, imageDir, 'vbox.iso', force );
}
