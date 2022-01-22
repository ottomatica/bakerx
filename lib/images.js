const fs = require('fs-extra');
const path = require('path');
const env         = require('./env');
const {bakerxPrivateKey,vagrantPrivateKey} = env.vars();

const formats = {};

formats['box.ovf'] = {privateKey: vagrantPrivateKey, sshUser: 'vagrant', sudo: true, providers: ['vbox']};
formats['vbox.iso'] = {privateKey: bakerxPrivateKey, sshUser: 'root', providers: ['vbox','kvm'] };
formats['vmlinuz'] = {privateKey: bakerxPrivateKey, sshUser: 'root', providers: ['kvm'] };

async function getSupportedFormat(provider, image)
{
    let kinds = Object.keys(formats);

    for( let kind of kinds )
    {
        if( await fs.exists(path.join(image, kind)) && formats[kind].providers.includes(provider) )
        {
            let imagePath = path.join(image, kind);
            // vmlinuz providers expect image to points to the parent directory.
            if( kind == 'vmlinuz')
            {
                imagePath = image;
            }
           
            return {info: formats[kind], imagePath: imagePath, kind: kind };
        }
    }
    return {info: undefined, imagePath: undefined, kind: undefined};
}

module.exports = getSupportedFormat;