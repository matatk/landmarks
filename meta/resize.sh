#!/bin/sh
chromeSize='1280x800'
operaSize='612x408'

function resize() {
	browser=$1
	size=$2
	echo $browser $size...
	for image in meta/$browser-*.png; do
		echo $image...
		base=`basename $image`
		convert -format png -trim +repage -background none -resize $size -gravity center -extent $size $image meta/out-$base
	done
	echo
}

resize 'chrome' $chromeSize
resize 'opera' $operaSize
