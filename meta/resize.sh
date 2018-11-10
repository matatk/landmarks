#!/bin/sh
chromeSize='640x400'
operaSize='612x408'
chromeBackgroundColour='rgb(250,250,250)'
operaBackgroundColor='rgb(237,237,237)'

function resize() {
	browser=$1
	size=$2
	background=$3
	echo $browser $size $background...
	for image in meta/$browser-*.png; do
		echo $image...
		base=`basename $image`
		convert -format png +repage -background $background -transparent orange -resize $size -gravity center -extent $size $image meta/out-$base
	done
	echo
}

resize 'chrome' $chromeSize $chromeBackgroundColour
resize 'opera' $operaSize $operaBackgroundColor
