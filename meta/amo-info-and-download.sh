#!/bin/sh
in='meta/amo-info.template'
tag=$(git describe --tags --abbrev=0)
changelog_line=$(grep "$tag" CHANGELOG.md)
changelog_date=$(echo "$changelog_line" | grep -Eo '\d{4}-\d{2}-\d{2}')
tag_without_dots=$(echo "$tag" | tr -d .)
changelog_anchor="$tag_without_dots-$changelog_date"

sed \
	-e "s/CHANGELOG_ANCHOR/$changelog_anchor/g" \
	-e "s/VERSION_NUMBER/$tag/g" \
	< $in

echo
github_zip_file=$tag.zip
github_code_url="https://github.com/matatk/landmarks/archive/$github_zip_file"
curl \
	--location "$github_code_url" \
	--remote-name \
	--remote-header-name
