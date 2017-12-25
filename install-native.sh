#!/bin/bash

set -euxo pipefail

TARGET_DIR="$HOME/.mozilla/native-messaging-hosts"

echo "Creating directories for native host applications"
mkdir -p "$TARGET_DIR"

echo "Copying native component to the app directory"
cp native/controller.py "$TARGET_DIR/gnome_media_control.py"

echo "Copying native component manifest to the app directory"
sed "s#@APP_PATH@#$TARGET_DIR/gnome_media_control.py#" native/manifest.json > "$TARGET_DIR/gnome_media_control.json"

