# bakerx

Bakerx is a front-end for creating and managing (micro) virtual environments. With bakerx you can quickly create a development environments to run you code. 

See a running demo below: 

[![asciicast](https://asciinema.org/a/RD2sHPfpgC1aH0uCyiTtyEAoV.svg)](https://asciinema.org/a/RD2sHPfpgC1aH0uCyiTtyEAoV)


## Installations

```
git clone https://github.com/ottomatica/bakerx
cd bakerx
npm install
npm link
```

## Using bakerx

### Pulling images

First, you need to pull an existing virtual machine image from a registry. Registries are basically the assets in a GitHub repository releases. Then you can pull an image by running the following commands:

```
bakerx pull ottomatica/slim#images alpine3.9-simple
```

See [slim](https://github.com/ottomatica/slim) for instructions on how to create and publish an image. 

### Creating VMs

After pulling images, you can create VMs that run those images. Simply run the command below:

```
bakerx run example_alpine_vm alpine3.9-simple --memory 2048
```

> The `--memory | -m` flag is optional, and can be used to set the amount of shared memory with your virtual machine.