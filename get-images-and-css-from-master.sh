#!/bin/sh
git checkout master
git pull
git checkout gh-pages
git checkout master -- 'meta/firefox*png'
git checkout master -- 'src/static/common.css'
mv src/static/common.css .
rm -rfv src/static/
