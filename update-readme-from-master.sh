#!/bin/bash
LAYOUT_PREFIX='---\r\nlayout: index\r\n---\r\n'
git checkout master -- README.md
echo -e $LAYOUT_PREFIX > index.md
cat README.md | tail -n +6 >> index.md
git rm --force README.md
git add index.md
git commit -m "Sync README.md in master to index.md in gh-pages"
echo
echo Now you may need to...
echo "    git push origin gh-pages"
# Thanks http://stackoverflow.com/a/16389663/1485308 :-)
