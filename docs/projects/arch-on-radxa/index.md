---
title: Arch Linux on Radxa Zero
description: Installing mainline Arch Linux on the Radxa Zero single board computer
---

![](https://wiki.radxa.com/mw/images/b/b6/Zero-800px.png)

# Arch Linux on Radxa Zero

The [Radxa Zero](https://wiki.radxa.com/Zero) is a cheap and small SBC in the form factor of
the [Raspberry Pi Zero 2 W](https://www.raspberrypi.com/products/raspberry-pi-zero-2-w). It uses the Amlogic S905Y2 SoC
paired with configurable amounts of LPDDR4 RAM and eMMC storage. The goal of this project is to sucessfully run Arch
Linux ARM on it and stick as close to mainline as possible. This article was made possible by the great mainline support
in the [U-Boot](https://source.denx.de/u-boot/u-boot) bootloader and the Linux kernel; As well as
the [Radxa Zero WiKi](https://wiki.radxa.com/Zero) guides and information about the board.

## Available configurations

### Specifications

|             | Specifications                   | Details                                 |
|-------------|----------------------------------|-----------------------------------------|
| **CPU**     | Amlogic S905Y2                   | Cortex-A53 @ 1.8GHz                     |
| **GPU**     | Mali G31 MP2                     | OpenGL 3.2, Vulkan 1.0, OpenCL 2.0      |
| **RAM**     | LPDDR4                           | 0.5GB / 1GB / 2GB / 4GB                 |
| **SD**      | microSD slot                     | up to 128GB                             |
| **eMMC**    | on board eMMC                    | 8GB / 16GB / 32GB / 64GB / 128GB        |
| **Display** | Micro HDMI                       | 4k@60Hz                                 |
| **USB**     | USB-C 2.0 OTG and 3.0 5Gbps Host | The port closest to the edge is the OTG |
| **WiFi**    | AP6212 / AP6256                  | WiFi 4/5 and BT 4/5 BLE                 |
| **Power**   | USB-C 5V @ ~3W                   |                                         |

### Pricing <Badge type="warning" text="as of Janurary 2023" />

| RAM   | eMMC   | WiFi chip | Header  | Antenna | Price  |
|-------|--------|-----------|---------|---------|--------|
| 500MB | _None_ | AP6212    | Colored | Onboard | 18.75€ |
| 1GB   | _None_ | AP6212    | Colored | Onboard | 24.49€ |
| 2GB   | 8GB    | AP6256    | Colored | Onboard | 36.74€ |
| 2GB   | 8GB    | AP6256    | _None_  | U.FL    | 36.74€ |
| 4GB   | 16GB   | AP6256    | Colored | Onboard | 51.81€ |
| 4GB   | 16GB   | AP6256    | _None_  | U.FL    | 51.81€ |
| 4GB   | 32GB   | AP6256    | Colored | Onboard | 61.23€ |
| 4GB   | 32GB   | AP6256    | _None_  | U.FL    | 61.23€ |
| 4GB   | 64GB   | AP6256    | Colored | Onboard | 74.42€ |
| 4GB   | 64GB   | AP6256    | _None_  | U.FL    | 74.42€ |
| 4GB   | 128GB  | AP6256    | Colored | Onboard | 97.97€ |
| 4GB   | 128GB  | AP6256    | _None_  | U.FL    | 97.97€ |

Note that the above combinations are not very strict. The unit I ordered is a 2GB version with onboard antenna without
headers. Just send an e-mail to the store and ask.

## Bootloader

The bootloader used in the Radxa Zero is [U-Boot](https://source.denx.de/u-boot/u-boot). Mainline support has been added
as of 2023, except, eMMC support. If the eMMC is absent or no bootloader is installed on it, the mainline U-Boot can be
used with a micro SD card to boot into an OS. For eMMC support, Radxa has provided a fork of U-Boot
located [here](https://github.com/radxa/u-boot.git). Later in the installation, just replace the URL of the mainline
repo with the one provided by Radxa.

### Building U-Boot

To build U-Boot, `git`, `make` and the AArch64 version of `gcc` is needed as dependencies of the build process. These
can be installed in Arch Linux using the command:

```shell
pacman -S git make aarch64-none-elf-gcc-bin
```

Now clone the repository, set the environment variables needed for cross compilation, and compile U-Boot:

```shell
# clone the u-boot repo
git clone https://source.denx.de/u-boot/u-boot
# change to u-boot directory
cd u-boot
# set compiler and architecture
export CROSS_COMPILE=aarch64-none-elf-
export ARCH=arm
# set target board
make radxa-zero_defconfig
# run the interactive configurator
make menuconfig
# compile u-boot using all cpu cores
make -j$(nproc)
```

### Packing with FIP

After compilation is finished, the file `u-boot.bin` is created in the project directory. This is not the final binary,
as the Amlogic <abbr title="Firmware In Package">FIP</abbr> is required to pack U-Boot into the final bootloader binary
that can be flashed. To do this, Radxa has provided a repo with the tools and binaries needed to create the final
bootloader [here](https://github.com/radxa/fip). The steps needed are as follows:

```shell
# go back to parent directory
cd ..
# clone the fip repo
git clone https://github.com/radxa/fip
# copy u-boot binary to fip directory
cp u-boot/u-boot.bin fip/radxa-zero/bl33.bin
# move into the fip directory
cd fip/radxa-zero
# create final binary
make
```

### Flashing U-Boot

The final binary should be a file named `u-boot.bin.sd.bin` in the current directory. This can be flashed to a micro SD
card or to the eMMC later by issuing the following commands:

```shell
# replace /dev/sdX with name of micro SD or eMMC
sudo dd if=u-boot.bin.sd.bin of=/dev/sdX conv=fsync,notrunc bs=1 count=444
sudo dd if=u-boot.bin.sd.bin of=/dev/sdX conv=fsync,notrunc bs=512 skip=1 seek=1
```

::: tip

It is preferred to flash the bootloader after partitioning, as the partitioning tools may overwrite part of the
bootloader by mistake.
:::

## Partitioning

The partition tables available to use are restricted by the bootloader packing process. The generated image is designed
for <abbr title="Master Boot Record">MBR</abbr> partition tables only. Extended MBR
or <abbr title="GUID Partition Table">GPT</abbr> entries will either be overwritten by or corrupt the bootloader. The
final image layout is as follows:

| Offset                  | Description        |
|-------------------------|--------------------|
| 0x00000000 - 0x000001BB | U-Boot             |
| 0x000001BC - 0x000001BD | _Empty_            |
| 0x000001BE - 0x000001FF | Master Boot Record |
| 0x00000200 - 0x01FD5FFF | U-Boot and padding |
| 0x01FD6000 - *          | User partitions    |

### Creating partitions

To create the partition, any partitioning tool can be used that supports MBR. The only important thing is that the first
partition must be readable by U-Boot, i.e. enabled in the supported filesystems in the configuration options. For
simplicity, a 200MiB FAT32 partition will be used as the boot partition and mounted at `/boot`, and the rest of the
space will be a BTRFS root partition. BTRFS is used here for its resilience to sudden power losses and built-in
compression. The CPU is more than powerful enough to compensate for the slow and space limited eMMC or micro SD card by
using the Z-Standard compression algorithm to compress the filesystem on the fly. A sample partitioning and formatting
using the `fdisk` tool is shown below:

```shell
# replace /dev/sdX with name of micro SD or eMMC
# partition disk
sudo fdisk /dev/sdX << EOF
o
n


62500
+200M
n


473088

t
1
c
EOL
```

```shell
# create filesystems
sudo mkfs.vfat -F 32 /dev/sdX1
sudo mkfs.btrfs /dev/sdX2
```

To explain the above actions, first a new MBR partition table is created. After that, the first partition is created at
an offset of 62500 blocks or 32MB and gives enough space for U-Boot or any other bootloader. After that, the rest of the
space is used by the second partition. The first partition is marked as type `0C` or W95 FAT32 (LBA). The second one is
marked (by default) as `83` meaning Linux root partition. After the partitioning, the boot partition is formatted using
FAT32 and the second using BTRFS.

### Mounting

To be able to install Arch Linux ARM later, the partitions are mounted under `/mnt`:

```shell
# replace /dev/sdX with name of micro SD or eMMC
# mount rootfs using compression
sudo mount -o compress-force=zstd /dev/sdX2 /mnt
# mount boot
sudo mount -m /dev/sdX1 /mnt/boot
```

At this point, Arch Linux ARM can be installed.

::: tip

You can alter the compression level and cpu cores that BTRFS will use. As an example:

```shell
# variable compression level and cpu cores used
sudo mount -o compress-force=zstd:6,thread_pool=2 /dev/sdX2 /mnt
```

uses compression level six and two threads instead of all four.
:::

## Installing Arch Linux ARM

### Image install

To flash Arch Linux ARM, follow the generic guide on the Arch Linux ARM wiki. An example is given bellow:

```shell
# download latest image
wget https://os.archlinuxarm.org/os/ArchLinuxARM-aarch64-latest.tar.gz
# extract files
sudo bsdtar -xpf ArchLinuxARM-aarch64-latest.tar.gz -C /mnt
sudo sync
# unmount
sudo umount -R /mnt
```

At this point the bootloader can be flashed if it hasn't been and the micro SD card or eMMC is almost ready to boot.

### Custom install

If the pre-made Arch Linux ARM image is not fitting or customization is priority, there is the option of booting the
Arch Linux ARM image and installing onto another one via USB (or the eMMC) using the standard Arch Linux install guide.
Assuming the bootloader binary is ready and the filesystems are mounted, below is a generic guide to install onto the
eMMC:

```shell
# run as root
sudo -i
# initialize the keyring as per the arch linux arm guide
pacman-key --init
pacman-key --populate archlinuxarm
# install arch linux install scripts
pacman -S arch-install-scripts
# install basic packages
pacstrap -K /mnt base linux-aarch64 linux-firmware btrfs-progs \
	archlinuxarm-keyring archlinux-keyring bash bash-completion \
	sudo nano wget man openssh
# generate fstab
genfstab -U /mnt >> /mnt/etc/fstab
# chroot into the new system
arch-chroot /mnt
# set timezone
ln -sf /usr/share/zoneinfo/Region/City /etc/localtime
# edit /etc/locale.gen and select language
nano /etc/locale.gen
# generate locales
locale-gen
# set language. example: LANG=en_US.UTF-8
nano /etc/locale.cong
# set hostname
nano /etc/hostname
# set root password
passw
# uncomment the line: %wheel ALL=(ALL) ALL
nano /etc/sudoers
# create new user
useradd -m -G wheel myuser
# set user password
passwd myuser
# enable system services
systemctl enable sshd
systemctl enable systemd-networkd
# enable NTP
timedatectl set-ntp true
# ensure initramfs is built
mkinitcpio -P
# exit chroot
exit
# unmount
umount -R /mnt
```

## Connecting to the bootloader

Radxa has built multiple scripts in U-Boot that run on startup and scan any device for any configuration that the user
might have. The easiest way to configure it would be the `extlinux` way. In the boot partition, a file must be created,
named `extlinux/extlinux.conf`. Inside should look similar to this:

```text
label Arch Linux ARM
        kernel /Image
        initrd /initramfs-linux.img
        fdt /dtbs/amlogic/meson-g12a-radxa-zero.dtb
        append root=UUID=7d2bc539-72cd-41b6-a917-d1b8f6b127cb rw console=ttyAML0,115200n8 console=tty0 loglevel=3
```

At this point, the micro SD card or eMMC is ready to boot.

## Drivers

Some parts of the board seem to work incorrectly or be missing drivers. Bellow is a collection of common problems and
possible fixes:

### Wi-Fi driver

The Wi-Fi chips on the Radxa Zero need a driver that is not compiled to the kernel or available on the standard repos. A
PKGBUILD can be found <a href="https://github.com/paralin/ap6256-firmware">here</a> for the AP6256 Wi-Fi chip drivers
from 2020.

### GPU driver

The Mali GPU on the SoC has mainline kernel and mesa support as of March 2023, with Vulkan support along the way.

### Power LED

The gpio controlling the power LED has changed from `GPIOAO_8` on board revision 1.4, to `GPIOAO_10` for revisions 1.5
and up. The `led` entry on the mainline dtb file is missing and thus doesn't show up as a configurable LED
under `/sys/class/leds/`. While in the talks with Radxa developers to include both variants in the kernel, meantime it
can be manually controlled with `libgpiod`.

### USB driver

Currently, the USB 3.0 switch has no Linux drivers and requires to flip the USB-C cable the correct way to show up
correctly. The OTG support also doesn't seem to work but is also in the talks with Radxa developers.

::: warning UPDATE: 07/03/2023

An overlay can be used to set the USB 2.0 OTG port in peripheral mode. Simply edit the configuration
file `/boot/extlinux/extlinux.conf` and add the following line:

```text
...
fdtoverlay /dtbo/meson-usb-peripheral.dtbo
...
```

The overlay can be downloaded [here](https://file.dionisis.xyz/meson-usb-peripheral.dtbo) and needs to be placed in the
directory `/boot/dtbo`.
:::
