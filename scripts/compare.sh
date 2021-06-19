#!/bin/sh
check_browser() {
	if [ "$1" != "firefox" ] && [ "$1" != "chrome" ] && [ "$1" != "opera" ] && [ "$1" != "edge" ]; then
		echo "'$1' is not a valid browser"
		exit 42
	fi
}

compare() {
	echo "compare $1 with $2"
	git diff --no-index "build/script-cache/$1" "build/script-cache/$2"
}

echo "Usage:"
echo "    <browser> <browser>"
echo "    <browser> <browser> d"
echo "    <browser> d"
echo
echo "You may want to run the following first"
echo "    node scripts/build.js --browser all --debug"
echo "    node scripts/build.js --browser all"

if [ ! "$1" ] || [ ! "$2" ]; then
	echo "Missing first or second arg"
	exit 42
fi

if [ "$2" = 'd' ]; then
	check_browser "$1"
	compare "$1" "$1-debug"
else
	check_browser "$1"
	check_browser "$2"
	if [ "$3" = 'd' ]; then
		compare "$1-debug" "$2-debug"
	else
		compare "$1" "$2"
	fi
fi
