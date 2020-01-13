const virtcrud = require('virtcrud');

const providers = {};

providers['qemu'] = virtcrud.getProvider('qemu');
providers['vbox'] = virtcrud.getProvider('vbox');

module.exports = {providers};