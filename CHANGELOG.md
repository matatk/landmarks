# Landmarks ChangeLog

## [2.5.2](https://github.com/matatk/landmarks/compare/2.5.1...2.5.2) (2019-01-26)

### Bug fixes

* **UI:** Add missing focus styles to GUI links ([#260](https://github.com/matatk/landmarks/issues/260)) ([93e19e8](https://github.com/matatk/landmarks/commit/93e19e8))
* **UI:** Make pop-up/sidebar links into buttons that open new tabs ([#263](https://github.com/matatk/landmarks/issues/263)) ([071e944](https://github.com/matatk/landmarks/commit/071e944)), closes [#262](https://github.com/matatk/landmarks/issues/262)

### Build system

* Use path.join() more ([#264](https://github.com/matatk/landmarks/issues/264)) ([00b8708](https://github.com/matatk/landmarks/commit/00b8708))

### Documentation

* **Help:** Update with changes for version 2.5.2 ([#266](https://github.com/matatk/landmarks/issues/266)) ([7c5c2e4](https://github.com/matatk/landmarks/commit/7c5c2e4))

## [2.5.1](https://github.com/matatk/landmarks/compare/2.5.0...2.5.1) (2019-01-19)

### Bug fixes

* **UI:** Add help and preferences links to GUIs ([#253](https://github.com/matatk/landmarks/issues/253)) ([da628f9](https://github.com/matatk/landmarks/commit/da628f9)), closes [#250](https://github.com/matatk/landmarks/issues/250)
* **UI:** Clarify and clean up styles ([#254](https://github.com/matatk/landmarks/issues/254)) ([61109fa](https://github.com/matatk/landmarks/commit/61109fa))
* Change "show all landmarks" key to avoid Firefox clash ([#256](https://github.com/matatk/landmarks/issues/256)) ([8d73dbd](https://github.com/matatk/landmarks/commit/8d73dbd)), closes [#251](https://github.com/matatk/landmarks/issues/251)

### Build system

* Mozilla Add-ons build information script ([#255](https://github.com/matatk/landmarks/issues/255)) ([34501b7](https://github.com/matatk/landmarks/commit/34501b7)), closes [#252](https://github.com/matatk/landmarks/issues/252)

### Documentation

* **Help:** Update with changes for version 2.5.1 ([#257](https://github.com/matatk/landmarks/issues/257)) ([300109a](https://github.com/matatk/landmarks/commit/300109a))

## [2.5.0](https://github.com/matatk/landmarks/compare/2.4.3...2.5.0) (2019-01-14)

### Bug fixes

* **build:** Remove spurious .eslintrc.json from build and zip ([#242](https://github.com/matatk/landmarks/issues/242)) ([586bf90](https://github.com/matatk/landmarks/commit/586bf90))
* **UI:** Message consistency, visual text spacing, visual note spacing ([#247](https://github.com/matatk/landmarks/issues/247)) ([8c308af](https://github.com/matatk/landmarks/commit/8c308af))

### Build system

* Adopt conventional changelog and npm version scripts ([#239](https://github.com/matatk/landmarks/issues/239)) ([f5e0b39](https://github.com/matatk/landmarks/commit/f5e0b39))
* Make the whole build process synchronous ([#241](https://github.com/matatk/landmarks/issues/241)) ([1c81099](https://github.com/matatk/landmarks/commit/1c81099))

### Documentation

* **Help:** Describe new features; heading case consistency ([#248](https://github.com/matatk/landmarks/issues/248)) ([85c9659](https://github.com/matatk/landmarks/commit/85c9659))
* **README:** Fix typo; clarity and style improvements ([#240](https://github.com/matatk/landmarks/issues/240)) ([9968507](https://github.com/matatk/landmarks/commit/9968507)), closes [#232](https://github.com/matatk/landmarks/issues/232)

### Features

* Enhanced help documentation, bundled with the extension ([#237](https://github.com/matatk/landmarks/issues/237)) ([a8be495](https://github.com/matatk/landmarks/commit/a8be495))
* **toggle:** Show all landmarks keyboard shortcut ([#245](https://github.com/matatk/landmarks/issues/245)) ([10691ee](https://github.com/matatk/landmarks/commit/10691ee)), closes [#165](https://github.com/matatk/landmarks/issues/165)
* **toggle:** Show all landmarks UI ([#246](https://github.com/matatk/landmarks/issues/246)) ([0803ed7](https://github.com/matatk/landmarks/commit/0803ed7)), closes [#120](https://github.com/matatk/landmarks/issues/120)

2.4 series
----------

### 2.4.3 - 16th of December 2018

* Improve the appearance of the DevTools panel on Firefox. \[[\#217](https://github.com/matatk/landmarks/pull/217)\]
* Fix a bug whereby landmark updates for background tabs pages would show up in the pop-up if it's open. \[[\#216](https://github.com/matatk/landmarks/pull/216)\]
* Improve the profiling script considerably, and use the results to improve performance of landmark finding. \[[\#220](https://github.com/matatk/landmarks/pull/220)\]
* Fewer debug-mode log messages; tidy up metadata and improve screengrabs; bump dependencies. \[[\#218](https://github.com/matatk/landmarks/pull/218)\]
* Make the preferences/options UI clearer and more accessible; improve documentation and metadata; improve build robustosity. \[[\#228](https://github.com/matatk/landmarks/pull/228)\]

### 2.4.2 - 29th of October 2018

* Fix a bug with sidebar option initialisation. \[[\#213](https://github.com/matatk/landmarks/pull/213)\]

### 2.4.1 - 28th of October 2018

* Fix a bug with packaging that was causing the DevTools panel script to be left out of the zip file that gets uploaded to the browser add-on sites (oops again ;-)). \[[\#212](https://github.com/matatk/landmarks/pull/212)\]

### 2.4.0 - 28th of October 2018

* Offer an optional sidebar as well as the toolbar pop-up on Firefox and Opera. \[[\#188](https://github.com/matatk/landmarks/pull/188), [\#199](https://github.com/matatk/landmarks/pull/199)\]
* Provide a Developer Tools panel that allows landmark elements to be inspected in the DOM viewer. This also entailed re-writing the internal communications between parts of Landmarks to use ports instead of one-time messages. \[[\#204](https://github.com/matatk/landmarks/pull/204)\]
* Show the current keyboard shortcuts on the splash page and allow the user to update them on Chrome and Opera. \[[\#187](https://github.com/matatk/landmarks/pull/187)\]
* Fix a bug whereby if an element is removed from the page, its border would remain. Also, update the border if the highlighted element's size or position changes. \[[#210](https://github.com/matatk/landmarks/pull/210)\]
* Massive re-organisation of the code to make it easier to manage and accommodate and take advantage of cross-browser differences. \[[\#191](https://github.com/matatk/landmarks/pull/191)\]
* Several smaller code improvements, including: clean-ups to the generated code; efficiency and documentation improvements and new screengrabs and captions. \[[#207](https://github.com/matatk/landmarks/pull/207), [#209](https://github.com/matatk/landmarks/pull/209), [#211](https://github.com/matatk/landmarks/pull/211)\]

2.3 series
----------

### 2.3.1 - 9th of June 2018

* Support multiple labelling elements when `aria-labelledby` is used. \[[\#176](https://github.com/matatk/landmarks/pull/176)\]
* Keep labels legible, and borders neat, when landmark regions are narrow, or full-width/height. Also let pointer events through the border so the user can interact as normal with the page below. \[[\#179](https://github.com/matatk/landmarks/pull/179)\]
* Small refinements to the build process, documentation and error-handling. \[[\#174](https://github.com/matatk/landmarks/pull/174), [\#178](https://github.com/matatk/landmarks/pull/178)\]

### 2.3.0 - 17th of May 2018

* Add landmark labels to the border, which is now drawn more robustly and has customisable colour. \[[\#158](https://github.com/matatk/landmarks/pull/158), [\#162](https://github.com/matatk/landmarks/pull/162)\]
* Options are saved as they're changed by the user, and borders get updated to reflect settings changes immediately. \[[\#160](https://github.com/matatk/landmarks/pull/160)\]
* Fix text sometimes overflowing buttons in Firefox. \[[\#163](https://github.com/matatk/landmarks/pull/163)\]
* Minor tweaks to documentation, build process; library package bumps. \[[\#159](https://github.com/matatk/landmarks/pull/159), [\#161](https://github.com/matatk/landmarks/pull/161), [\#164](https://github.com/matatk/landmarks/pull/164)\]

2.2 series
----------

### 2.2.0 - 18th of February 2018

* Support [Digital Publishing ARIA module](https://www.w3.org/TR/dpub-aria-1.0/) landmarks, and makes landmark role names friendly and translatable. \[[\#150](https://github.com/matatk/landmarks/pull/150)\]
* Always scroll to the top of a landmark when moving to it. \[[\#151](https://github.com/matatk/landmarks/pull/151)\]
* Plumbing work on the build system and other code improvements. \[[\#145](https://github.com/matatk/landmarks/pull/145)\]

2.1 series
----------

### 2.1.1 - 19th of January 2018

* Improve performance on sites/apps that change rapidly (such as Google Docs) by limiting how quickly Landmarks responds to further changes when they're being made in quick succession. \[[\#139](https://github.com/matatk/landmarks/pull/139)\]
* Add a keyboard shortcut to show the landmarks pop-up. \[[\#135](https://github.com/matatk/landmarks/pull/135)\]
* Give the options page a title that shows up for Opera users. \[[\#136](https://github.com/matatk/landmarks/pull/136)\]
* Behind-the-scenes code and infrastructure improvements for improved quality. \[[\#124](https://github.com/matatk/landmarks/pull/124), [\#128](https://github.com/matatk/landmarks/pull/128), [\#129](https://github.com/matatk/landmarks/pull/129), [\#130](https://github.com/matatk/landmarks/pull/130), [\#142](https://github.com/matatk/landmarks/pull/142), [\#143](https://github.com/matatk/landmarks/pull/143)\]

### 2.1.0 - 6th of November 2017

* Landmarks are now updated when pages change dynamically (not just when the whole page is loaded). This should make the extension much more useful when working with web-apps and pages with pop-ups and slide-out menus, for example. \[[\#111](https://github.com/matatk/landmarks/pull/111)\]
* Add a keyboard shortcut to skip to the main landmark. \[[also \#111](https://github.com/matatk/landmarks/pull/111)\]
* Fix a bug whereby sibling landmarks may not be identified as such. \[[\#112](https://github.com/matatk/landmarks/pull/112)\]
* Adopt more browser-like UI on Firefox (pop-up and options) and Opera (options). \[[\#115](https://github.com/matatk/landmarks/pull/115)\]
* Use Mozilla's 'addons-linter' to check the built extension. \[[err, also \#111](https://github.com/matatk/landmarks/pull/111)\]

2.0 series
----------

### 2.0.8 - 18th of September 2017

* Landmarks now ignores visually hidden regions. \[[\#85](https://github.com/matatk/landmarks/pull/85)\]
* Fix a bug that caused the pop-up to incorrectly report nesting that changes by more than one level between landmarks. \[[\#102](https://github.com/matatk/landmarks/pull/102)\]
* Correctly restore elements' outlines after they are highlighted. \[[\#94](https://github.com/matatk/landmarks/pull/94)\]
* Automatically disable the extension on browsers' extensions store pages. \[[\#97](https://github.com/matatk/landmarks/pull/97)\]
* Start exploring what's needed for Edge support in future. \[[\#99](https://github.com/matatk/landmarks/pull/99)\]
* Improvements to the SVG to PNG process. \[[\#95](https://github.com/matatk/landmarks/pull/95)\]
* Other more minor tweaks and fixes.
* README updates.

### 2.0.7 - 11th of May 2017

* Officially support Opera.
* Make the landmark highlight more visible.
* Open a help page when the extension is installed/updated on Firefox (this was already supported on Chrome, and is on Opera).
* Make use of Firefox's synching of settings across devices.
* More tests, and numerous other code improvements behind the scenes.
* Partly works on Edge; still a few things to sort out before it's robust (also, the extensions store is not yet immediately open to submissions from allcomers).

### 2.0.6 - 2nd of February 2017

* Add a test suite to ensure landmarks are identified correctly.
* Various large internal code-quality improvements.

### 2.0.5 - 5th of December 2016

* No user-facing changes.
* Fix error in packaging (the new build system was not actually compressing the ZIP file, which different parts of the submission process for Chrome and Firefox didn't like&mdash;oops!)
* Add more code robustosity checks with ESLint.

### 2.0.4 - 4th of December 2016

* Clean up the appearance of the pop-up.
* Increase 'momentary' highlight duration to two seconds, from one second.
* Remove a workaround for a bug in Firefox pop-up sizing that was fixed in Firefox 50.
* Drop Grunt and switch to just using NPM and scripts for building the extensions.
* Track builds with Travis CI.
* Use ESLint and EditorConfig code standards and quality tools.

### 2.0.3 - 23rd of September 2016

* When installed/updated on Chrome, show the web page, with a (hopefully) helpful notice about the install/upgrade.
* Automatically re-inject the content script on Chrome when the extension is updated (or inject it when the extension is installed), as users would expect it to start working straight away. (Firefox does this itself.)
* Locale is now en\_GB (instead of en).
* Switch to using grunt-phantom-rasterize for converting the SVGs to PNGs.

### 2.0.2 - 12th of August 2016

* First WebExtension Release
