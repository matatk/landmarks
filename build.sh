#!/bin/bash
SOURCE="src"
EXT="landmarks.xpi"
rm "$EXT" &&
cd "$SOURCE" &&
find . -name '.DS_Store' -exec rm {} \; &&
zip -9r "$EXT" * &&
mv "$EXT" ..
