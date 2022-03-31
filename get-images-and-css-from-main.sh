#!/bin/sh
git checkout main && \
	git pull && \
	git checkout gh-pages && \
	git checkout main -- 'meta/firefox*png' && \
	git checkout main -- 'src/static/common.css'
