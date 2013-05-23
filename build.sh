#!/bin/bash
SOURCE="src"
EXT="landmarks.xpi"
cd "$SOURCE"
zip -9r "$EXT" *
mv "$EXT" ..
