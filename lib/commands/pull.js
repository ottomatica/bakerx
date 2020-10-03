const path = require('path');
const fs   = require('fs-extra');
const got = require('got');
const chalk = require('chalk');
const tar = require('tar');

const utils = require('../utils');
const env = require('../env');
const {persistdir} = env.vars();

exports.command = 'pull <image> [registry]';
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

    if( registry && image )
    {
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
    }
    else
    {
        console.log(chalk.green(`Searching vagrant for ${image}.`));

        let options = {
            headers: {"Authorization": "Bearer "}
        }
        let response;
        try {
            response = await got(`https://app.vagrantup.com/api/v1/box/${image}`, options);
        } catch (e) {
            console.log(chalk.red(`Vagrant cloud: ${e.message}`));
            return;
        }
        if( response.body )
        {
            let obj = JSON.parse(response.body);
            let providers = obj.current_version.providers;
            let version = providers.filter( p => p.name == "virtualbox");
            if( version.length > 0 )
            {
                let url = version[0].download_url;
                console.log( `Found ${url}`); 
                await downloadVagrantBox(url, image.split("/")[1] , force);
            } else {
                console.log(chalk.red(`No virtualbox image available.`));
            }
        }

    }

};

async function downloadVagrantBox(url, image, force)
{
    const imageDir = path.join(persistdir, 'images', image);

    // download files if not available locally
    if (!(await fs.exists(path.join(imageDir, 'box.ovf'))) || force) {

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
        await fs.remove(path.join(imageDir, 'vagrant.box' ));
    }
    return path.join(imageDir, 'box.ovf');
}


async function githubRelease(registry, image, force)
{
    const [owner, repo, release] = registry.split(/[\/#]/g);
    const imageDir = path.join(persistdir, 'images', image);

    // checking if there is a newer version of an existing image
    // if failed to check (ex. GitHub API rate limit exceeded), try to download and replace old files
    try {
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
    } catch (err) { force = true; }
    
    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vmlinuz`, imageDir, 'vmlinuz', force );
    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-initrd`, imageDir, 'initrd', force );
    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}-vbox.iso`, imageDir, 'vbox.iso', force );

    await utils.download(`https://github.com/${owner}/${repo}/releases/download/${release}/${image}.box`, imageDir, `${image}.box`, force);
    const boxPath = path.join(imageDir, `${image}.box`);
    // if downloaded, try to untar
    if (await fs.exists(boxPath)) {

        await tar.x(
            {
                file: boxPath,
                C: imageDir
            });

        await fs.remove(boxPath);
    }

}
