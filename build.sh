#!/bin/bash
SOURCE="src"
EXT="landmarks.xpi"
INSTRDF="install.rdf"
RELEASE=$(date +%Y-%m-%d)
rm -fv $SOURCE/$INSTRDF
cat ${INSTRDF}.template | sed -e "s/LANDMARKS_VERSION/$RELEASE/" > $SOURCE/$INSTRDF
rm -fv "$EXT" &&
cd "$SOURCE" &&
find . -name '.DS_Store' -exec rm {} \; &&
zip -9r "$EXT" * &&
mv "$EXT" ..
