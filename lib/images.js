const fs = require('fs');
const path = require('path');
const env         = require('./env');
const {bakerxPrivateKey,vagrantPrivateKey} = env.vars();

const formats = {};

formats['box.ovf'] = {privateKey: vagrantPrivateKey, sshUser: 'vagrant', providers: ['vbox']};
formats['vbox.iso'] = {privateKey: bakerxPrivateKey, sshUser: 'root', providers: ['vbox','qemu'] };
formats['vmlinuz'] = {privateKey: bakerxPrivateKey, sshUser: 'root', providers: ['qemu'] };

function getSupportedFormat(provider, image)
{
    let kinds = Object.keys(formats);

    for( let kind of kinds )
    {
        if( fs.existsSync(path.join(image, kind)) && formats[kind].providers.includes(provider) )
        {
            let imagePath = path.join(image, kind);
            // vmlinuz providers expect image to points to the parent directory.
            if( kind == 'vmlinuz')
            {
                imagePath = image;
            }
           
            return {info: formats[kind], imagePath: imagePath };
        }
    }
    return null;
}

function getImagePath()
{

}

module.exports = getSupportedFormat;