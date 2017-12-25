A browser extension for controlling Firefox media playback with keyboard
media keys under GNOME.

## Features
* Play / Pause playback of `<audio>` and `<video>` elements
  with the media keys of your keyboard

## Installation
To install the add-on, do the following:

* Install the native components by executing the `./install-native.sh` script.
* Install the add-on to Firefox

### Requirements
Before installing the native component, you need to install the following
dependencies:

* python3
* gir1.2-glib-2.0

Additionally, this only works under GNOME based sessions that are running
the GNOME settings daemon (like Unity in Ubuntu 16.04).

## How it Works?
The add-on contains following logic to decide which media element
to control when play / stop media key is clicked.

* If any element is playing, pause the playback of all elements
* If no element is playing, start playing the element whose playback
  started most recently

## TODO / Ideas
* Configurable logic on how to choose which element(s) to pause when
  the browser is playing media:
  * Pause all (current)
  * Pause all except the most recent element
  * Pause all except the most recent element in the current tab
* Configurable logic on which element to play when all tracks are
  paused:
  * Play the most recent one (current)
  * Play the most recent one in the current tab
* Configurable timeout until the add-on releases media keys after last
  track has stopped playing
* Better instructions on how to install the native components
* Chrome / Chromium support

## Development

### Add-on
The add-on is built with webpack. Use `npm install` to install the required
dependencies.

The add-on code lives in the `add-on` directory. The top-level files `background.js`
and `content.js` are automatically generated with webpack. The entrypoints for
these two scripts are:
* `add-on/background/main.js` - entrypoint to the `background.js` script (top-level
  statements in this file are executed when the add-on is loaded)
* `add-on/content/main.js` - entrypoint to the `content.js` script (top-level
  statements in this file are executed when a page is loaded).

To build the entrypoint bundles, run the following:
```
npm run build
```

If you want to continuously test your changes, make sure to run the following
commands (needs different terminals):
```
npm run build:watch # to make webpack build the bundles when sources change
npm run start # to make web-ext cli reload the extension when the bundles change
```

To make a production build (silences debug logging), run the following command
```
npm run build:prod
```

### Native Component
The native component is avaiable in the `native/` directory. The component
is in charge of talking to GNOME Settings Daemon over DBus to grab media
keys and listen for media key presses.

To test changes made to the script or the manifest:
* Install the new versions with the `install-native.sh` script
* Reload the add-on manually from [about:debugging](about:debugging)

The log output of the native component can be found from the file
`~/.mozilla/native-messaging-hosts/gnome_media_control.log`.
