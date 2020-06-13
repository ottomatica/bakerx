# bakerx | ![Bakerx CI](https://github.com/ottomatica/bakerx/workflows/Bakerx%20CI/badge.svg)

Bakerx is a front-end for creating and managing (micro) virtual environments. With bakerx you can quickly create a development environments to run you code. 

See a running demo below: 

<p align="center">
  <img src="./doc/img/demo.gif">
</p>

## Installation

```bash
$ npm install ottomatica/bakerx -g
```

Or, for local dev:

```bash
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

#### `bakerx run` arguments (optional)
  - `--memory | -m <AMOUNT>`: set the amount of shared memory with your virtual machine.
  - `--ip <IP_ADDRESS>`: configure a host-only interface for the virtual machine, with the specified IP address
  - `--sync`: mount a shared folder from your _current working directory_ in `/bakerx` inside the virtual machine
  - `--up <PATH_TO_SCRIPT>`: execute specified shell script inside the virtual machine after provisioned

> _Note: you can run `bakerx run --help` to see all CLI arguments and their description._

### Connecting to VMs

Finally, after creating the VM, you can ssh to it by running the command below:
```
bakerx ssh example_alpine_vm
```

### Using bakerx.yml file

Instead of specifying CLI arguments when creating a VM, you can specify the details in a file called `bakerx.yml`, which is useful for storing in SCM:

```yaml
name: example_alpine_vm
image: alpine3.9-simple
up: |                      # <--- optional
  apk update
  apk add ansible
```
Then from same directory you can run `bakerx run` to create you VM.

You can also add multiple Bakerx VMs in `bakerx.yml` file, and running `bakerx run` will create them for you:
```yaml
servers:
  - name: vm1
    image: alpine3.9-simple
  - name: vm2
    image: alpine3.9-simple
```
