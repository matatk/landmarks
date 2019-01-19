#!/bin/sh
in='meta/amo-info.template'
tag=$(git describe --tags --abbrev=0)
changelog_line=$(grep $tag CHANGELOG.md)
changelog_date=$(echo "$changelog_line" | egrep -o '\d{4}-\d{2}-\d{2}')
tag_without_dots=$(echo $tag | tr -d .)
changelog_anchor="$tag_without_dots-$changelog_date"

cat $in | sed \
	-e "s/CHANGELOG_ANCHOR/$changelog_anchor/g" \
	-e "s/VERSION_NUMBER/$tag/g"

echo
github_code_url="https://github.com/matatk/landmarks/archive/$tag.zip"
curl --remote-name --remote-header-name --location $github_code_url
