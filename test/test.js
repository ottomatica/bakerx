
const execSync = require('child_process').execSync;

describe('Run an Ubuntu VM with host-only networking', () => {
    test('Pull `bionic` Image', () => {
        execSync('node index.js pull cloud-images.ubuntu.com bionic', { stdio: 'inherit' });
    });

    test('Run a VM with host-only networking, 2GB memory, and sync folder', () => {
        execSync('node index.js run bakerx-test-vm bionic --ip 192.168.33.10 --memory 2048 --sync', { stdio: 'inherit' });
    });

    test('Run ssh command on the VM', () => {
        const sshCmd = execSync(`node index.js ssh-info bakerx-test-vm | tr -d '"'`).toString().trim().replace('-i', '-qi');
        const whoami = execSync(`${sshCmd} whoami`).toString().trim();
        expect(whoami).toBe('vagrant');
    });

    test('Delete the test VM', () => {
        execSync('node index.js delete vm bakerx-test-vm', { stdio: 'inherit' });
    });
})

describe('Run an Alpine 3.9 VM', () => {
    test('Pull `alpine3.9-simple` Image', () => {
        execSync('node index.js pull ottomatica/slim#images alpine3.9-simple', { stdio: 'inherit' });
    });

    test('Run a VM with host-only networking, 1GB memory, and sync folder', () => {
        execSync('node index.js run bakerx-test-vm alpine3.9-simple --memory 1024', { stdio: 'inherit' });
    });

    test('Run ssh command on the VM', () => {
        const sshCmd = execSync(`node index.js ssh-info bakerx-test-vm | tr -d '"'`).toString().trim().replace('-i', '-qi');
        const whoami = execSync(`${sshCmd} whoami`).toString().trim();
        expect(whoami).toBe('root');
    });

    test('Delete the test VM', () => {
        execSync('node index.js delete vm bakerx-test-vm', { stdio: 'inherit' });
    });
})
