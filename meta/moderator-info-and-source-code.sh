#!/bin/sh
build_info='meta/build-info.template'
edge_info='meta/edge-info.template'
tag=$(git describe --tags --abbrev=0)
changelog_line=$(grep "$tag" CHANGELOG.md)
changelog_date=$(echo "$changelog_line" | grep -Eo '\d{4}-\d{2}-\d{2}')
tag_without_dots=$(echo "$tag" | tr -d .)
changelog_anchor="$tag_without_dots-$changelog_date"

make_info_for_browser() {
	browser_pretty=$1
	browser_var=$2
	sed \
		-e "s/CHANGELOG_ANCHOR/$changelog_anchor/g" \
		-e "s/VERSION_NUMBER/$tag/g" \
		-e "s/BROWSER_PRETTY/$browser_pretty/g" \
		-e "s/BROWSER_VAR/$browser_var/g" \
		< $build_info
	}

make_info_for_edge() {
	sed \
		-e "s/CHANGELOG_ANCHOR/$changelog_anchor/g" \
		< $edge_info
	}

echo // Firefox
echo
make_info_for_browser Firefox firefox
echo
echo
echo // Opera
echo
make_info_for_browser Opera opera
echo
echo
echo // Edge
echo
make_info_for_edge
echo
echo

github_zip_file=$tag.zip
github_code_url="https://github.com/matatk/landmarks/archive/$github_zip_file"
local_source_file="landmarks-$github_zip_file"
if [ ! -f "$local_source_file" ]; then
	echo "Downloading <$github_code_url>..."
	curl \
		--location "$github_code_url" \
		--remote-name \
		--remote-header-name
else
	echo "$local_source_file already exists; skipping download"
fi
