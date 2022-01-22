const virtcrud = require('virtcrud');

const providers = {};

providers['kvm'] = virtcrud.getProvider('kvm');
providers['vbox'] = virtcrud.getProvider('vbox');

module.exports = {providers};