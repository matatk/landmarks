#!/bin/sh
in='meta/detailed-description.html'

echo "// Description for Mozilla Add-ons"; echo
cat $in | sed \
	-e 's/<p>//g' \
	-e 's/<\/p>/@/g' \
	| tr '@' "\n"

echo; echo "// Plain Text Description"; echo
pandoc $in --to markdown --wrap none | sed -E \
	-e 's/\\//g' \
	-e 's/\*\*/*/g'
