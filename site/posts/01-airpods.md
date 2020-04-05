---
title: "Connecting to your AirPods with a shell script (and keyboard shortcut)"
description: How you can connect to your AirPods programmatically, using a few shell commands and optionally a keyboard shortcut
permalink: /posts/shell-script-airpods/
date: 2020-03-08
tags:
  - airpods
  - macos
  - shell
  - scripting
  - terminal
  - cli
  - shortcut
  - bluetooth
layout: layouts/post.njk
---

Swapping between devices while using AirPods still isn't quite as seamless as it could be, especially when swapping from an iPhone to a Mac, where at the very least you'll be clicking around the menu bar in the sound options, and sometimes even be navigating the bluetooth menu.

Being able to connect to your AirPods, and then switch your Mac's audio device over programmatically, can save you a lot of clicks if you spend a lot of time in your terminal, and opens up many more opportunities for automation.

Connecting to your AirPods requires two distinct steps:
- Making sure your AirPods are connected to your Mac via bluetooth
- Once connected, making sure your AirPods are selected as your audio output device
- Optionally: setting a keyboard shortcut to be able to swap devices at any time

## The Requirements

You'll need to install two packages to be able to connect to your AirPods in a shell script:
- [bluetoothconnector](https://github.com/lapfelix/BluetoothConnector) which allows you to connect to / disconnect from bluetooth devices
- [switchaudio-osx](https://github.com/deweller/switchaudio-osx/) which allows you to select your Mac's current audio input/output devices

Both of these can be easily installed using `brew`:

```shell
brew install bluetoothconnector switchaudio-osx
```

## Connecting via Bluetooth
The first step is making sure your AirPods are actually connected to your Mac via bluetooth.

As far as I can tell, `BluetoothConnector` doesn't have a great, pipeline-compatible CLI so you have to do a bit of ugly string mangling to connect to your airpods.
Here's each step involved, split up with some explanation of each part
```shell
# A device name to `grep` for from the available bluetooth devices
DEVICE_NAME="airpods pro"

# Retrieve the bluetooth physical address for your device
device_address=`BluetoothConnector | grep ' - ' | grep -i "$DEVICE_NAME" | cut -d ' ' -f 1`

# Connect to the device by its physical address
BluetoothConnector --connect $device_address
```

A one-liner which packages this all up:
```shell
BluetoothConnector --connect `BluetoothConnector | grep ' - ' | grep -i "airpods pro" | cut -d ' ' -f 1`
```

## Selecting the audio output device
Once your AirPods are connected via bluetooth, they must be set as your current audio output device.

If you know the _exact_ name of your AirPods, it's pretty straightforward to set them as your default audio device.
```shell
SwitchAudioSource -s "Chili’s AirPods Pro"
```
> By default, AirPods are named with a __right single quotation mark__, not an apostrophe. You should avoid typing out the name by hand, and instead copy the name from the output of `SwitchAudioSource -a`

Similarly, `switchaudio-osx` doesn't seem to have a pipeline-friendly CLI, so more string-mangling is in order here:
```shell
DEVICE_NAME="airpods pro"

# Resolve the full audio device name by matching available devices using $DEVICE_NAME
full_audio_device_name=`SwitchAudioSource -a -t output | grep -i "$DEVICE_NAME" | sed 's/ (.*//'`

# Set the default audio output device
SwitchAudioSource -s "$full_audio_device_name"
```

Another one-liner that wraps this all up:
```shell
SwitchAudioSource -s "$(SwitchAudioSource -a -t output | grep -i 'airpods pro' | sed 's/ (.*//')"
```

## Putting it all together
Here is a script I use which combines both the Bluetooth connection steps and output device selection.

When invoked multiple times, this script will swap between using AirPods and another audio device by default (in this case `MacBook Pro Speakers`):

```shell
#!/bin/bash -xe

TARGET_DEVICE_NAME="airpods pro"
DEFAULT_AUDIO_DEVICE="MacBook Pro Speakers"

# Connect via Bluetooth
device_address=`BluetoothConnector | grep ' - ' | grep -i "$TARGET_DEVICE_NAME" | cut -d ' ' -f 1`
BluetoothConnector --connect $device_address

target_audio_device=`SwitchAudioSource -a -t output | grep -i "$TARGET_DEVICE_NAME" | sed 's/ (.*//'`
current_audio_device=`SwitchAudioSource -c`

# Only toggle between devices when the target device is available
if [ ! -z "$target_audio_device" ]; then

  if [ "$current_audio_device" != "$target_audio_device" ]; then
    SwitchAudioSource -s "$target_audio_device"
  else
    SwitchAudioSource -s "$DEFAULT_AUDIO_DEVICE"
  fi

fi
```

## Bonus: do it all with a keyboard shortcut
Once you've saved this shell script somewhere you can invoke it whenever you need from your terminal, but even better is being able to invoke it at any time, from any app.

To do this you can use a surprisingly-refined (despite its terrible name), little utility: [ICanHazShortcut](https://github.com/deseven/icanhazshortcut/). Also conveniently available via `brew`:
```shell
brew cask install icanhazshortcut
```

Once installed you can run the app and add any keyboard shortcut pointed at the shell script from the previous session. I happen to use `Shift+Cmd+Home` as my shortcut.

## Automate your 'Pods
That's all that's involved with connecting to, and using your AirPods from the command-line. Now that you can control your audio devices using scripts, a whole new area of automation opens up; like connecting to your AirPods automatically whenever you open a music app, or showing notifications when your bluetooth audio devices become available.
