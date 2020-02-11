#!/bin/sh
# shellcheck disable=SC1004
in='meta/detailed-description.html'

echo "// Description for Mozilla Add-ons"; echo
cat $in

echo; echo; echo "// Plain Text Description"; echo
sed < $in -E \
	-e 's/<p>//g' \
	-e 's/<\/p>/\
/g' \
	-e 's/<\/?strong>/*/g' \
	-e 's/^\*//' \
	-e 's/\*$//'
