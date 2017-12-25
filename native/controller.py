#!/usr/bin/env python3

from gi.repository import Gio, GLib
import logging, sys, json, struct

BUS_GSD_NAME = 'org.gnome.SettingsDaemon'
BUS_GSD_MKEYS_IFACE = 'org.gnome.SettingsDaemon.MediaKeys'
BUS_GSD_MKEYS_OBJECT_PATH = '/org/gnome/SettingsDaemon/MediaKeys'

mkeys = None

logging.basicConfig(
    level=logging.DEBUG,
    filename='gnome_media_control.log',
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

_log = logging.getLogger(name='gnome_media_control')

def handle_key_press(app, key):
    if key == 'Play':
        send_message(encode_message({'action': 'playpause'}))
    elif key == 'Stop':
        send_message(encode_message({'action': 'stop'}))

def get_message():
    raw_len = sys.stdin.buffer.read(4)
    if len(raw_len) == 0:
        sys.exit(0)
    msg_len = struct.unpack('@I', raw_len)[0]
    message = sys.stdin.buffer.read(msg_len).decode('utf-8')
    return json.loads(message)

def handle_message(channel, condition):
    msg = get_message()
    _log.debug('Got message: %s', msg)

    if msg['action'] == 'grab_media_keys':
        mkeys.GrabMediaPlayerKeys('(su)', 'Firefox', 0)
    elif msg['action'] == 'release_media_keys':
        mkeys.ReleaseMediaPlayerKeys('(s)', 'Firefox')

    return True

def encode_message(content):
    encoded = json.dumps(content).encode('utf_8')
    length = struct.pack('@I', len(encoded))
    return {'length': length, 'content': encoded}

def send_message(message):
    _log.debug('Sending message: %s', message)
    sys.stdout.buffer.write(message['length'])
    sys.stdout.buffer.write(message['content'])
    sys.stdout.buffer.flush()

def handle_dbus_signal(proxy, sender, signal, params):
    _log.debug('Got signal: %s %s %s %s', proxy, sender, signal, params)
    if signal == 'MediaPlayerKeyPressed':
        handle_key_press(params[0], params[1])

def main():
    _log.info('Establishing DBus session')
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)

    global mkeys
    mkeys = Gio.DBusProxy.new_sync(
        bus,
        Gio.DBusProxyFlags.NONE,
        None,
        BUS_GSD_NAME,
        BUS_GSD_MKEYS_OBJECT_PATH,
        BUS_GSD_MKEYS_IFACE,
        None
    )

    mkeys.connect('g-signal', handle_dbus_signal)
    GLib.io_add_watch(sys.stdin.buffer, GLib.PRIORITY_HIGH, GLib.IOCondition.IN, handle_message)
    main_loop = GLib.MainLoop()

    _log.info('Starting main loop')
    main_loop.run()

if __name__ == '__main__':
    main()
