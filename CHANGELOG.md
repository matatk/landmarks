# Landmarks changelog

## [2.7.0](https://github.com/matatk/landmarks/compare/2.6.0...2.7.0) (2020-02-11)

### Bug fixes

* Allow Landmarks to run on the stand-alone options page ([#328](https://github.com/matatk/landmarks/issues/328)) ([4e634bc](https://github.com/matatk/landmarks/commit/4e634bc))

### Builds

* Skip dotfiles when bringing in static assets ([#330](https://github.com/matatk/landmarks/issues/330)) ([79bde2d](https://github.com/matatk/landmarks/commit/79bde2d))
* Use additional deepmerge convenience function ([#326](https://github.com/matatk/landmarks/issues/326)) ([8bc2e91](https://github.com/matatk/landmarks/commit/8bc2e91)), closes [#324](https://github.com/matatk/landmarks/issues/324)

### Documentation

* **Mozilla Add-ons:** Update notes for reviewers ([#325](https://github.com/matatk/landmarks/issues/325)) ([0017bcb](https://github.com/matatk/landmarks/commit/0017bcb)), closes [#322](https://github.com/matatk/landmarks/issues/322)
* **README:** Mention Edge support ([#331](https://github.com/matatk/landmarks/issues/331)) ([b7d93af](https://github.com/matatk/landmarks/commit/b7d93af))
* Update extension metadata ([#333](https://github.com/matatk/landmarks/issues/333)) ([a445b5b](https://github.com/matatk/landmarks/commit/a445b5b))

### Features

* Dark mode and GUI style improvements ([#332](https://github.com/matatk/landmarks/issues/332)) ([c2653fe](https://github.com/matatk/landmarks/commit/c2653fe))
* Standalone options page; streamline help ([#327](https://github.com/matatk/landmarks/issues/327)) ([4aa2b60](https://github.com/matatk/landmarks/commit/4aa2b60)), closes [#227](https://github.com/matatk/landmarks/issues/227) [#288](https://github.com/matatk/landmarks/issues/288) [#226](https://github.com/matatk/landmarks/issues/226)
* Support the new Microsoft Edge ([#329](https://github.com/matatk/landmarks/issues/329)) ([a4d4743](https://github.com/matatk/landmarks/commit/a4d4743)), closes [#53](https://github.com/matatk/landmarks/issues/53)

## [2.6.0](https://github.com/matatk/landmarks/compare/2.5.5...2.6.0) (2019-09-06)

### Bug fixes

* Use specified spelling for "doc-acknowledgments" role; add en_US locale ([#315](https://github.com/matatk/landmarks/issues/315)) ([cfbfd6c](https://github.com/matatk/landmarks/commit/cfbfd6c))

### Builds

* Use factored-out package for generating/updating the changelog ([#313](https://github.com/matatk/landmarks/issues/313)) ([17a228a](https://github.com/matatk/landmarks/commit/17a228a))

### Chores

* **Dependencies:** Remove unused JSDOM; Bumps ([#314](https://github.com/matatk/landmarks/issues/314)) ([c6f1b00](https://github.com/matatk/landmarks/commit/c6f1b00))
* Bump to Node 10 on Travis ([#318](https://github.com/matatk/landmarks/issues/318)) ([cc0f2b0](https://github.com/matatk/landmarks/commit/cc0f2b0)), closes [#276](https://github.com/matatk/landmarks/issues/276)

### Documentation

* **README:** Refer to test suite documentation for standards su… ([#319](https://github.com/matatk/landmarks/issues/319)) ([129955f](https://github.com/matatk/landmarks/commit/129955f))
* Release notes for 2.6.0 ([#320](https://github.com/matatk/landmarks/issues/320)) ([43e194f](https://github.com/matatk/landmarks/commit/43e194f))

### Features

* Support aria-roledescription (also fix forms detection) ([#317](https://github.com/matatk/landmarks/issues/317)) ([711fb16](https://github.com/matatk/landmarks/commit/711fb16)), closes [#316](https://github.com/matatk/landmarks/issues/316)

### Tests

* Expected test results in tree format ([#311](https://github.com/matatk/landmarks/issues/311)) ([b530435](https://github.com/matatk/landmarks/commit/b530435))
* Use factored-out landmark scanner test suite ([#312](https://github.com/matatk/landmarks/issues/312)) ([a710d49](https://github.com/matatk/landmarks/commit/a710d49))

## [2.5.5](https://github.com/matatk/landmarks/compare/2.5.4...2.5.5) (2019-03-25)

### Bug fixes

* Remove page visibility event listener when content script gets disconnected on Chrome-like browsers ([#299](https://github.com/matatk/landmarks/issues/299)) ([5c514a2](https://github.com/matatk/landmarks/commit/5c514a2)), closes [#296](https://github.com/matatk/landmarks/issues/296)

### Build system

* Check there are no unexpected dotfiles ([#301](https://github.com/matatk/landmarks/issues/301)) ([6e095ad](https://github.com/matatk/landmarks/commit/6e095ad)), closes [#295](https://github.com/matatk/landmarks/issues/295)
* Remove Edge manifest and DRY DevTools key ([#300](https://github.com/matatk/landmarks/issues/300)) ([2aff6b4](https://github.com/matatk/landmarks/commit/2aff6b4)), closes [#294](https://github.com/matatk/landmarks/issues/294)
* Use ESLint's new (as of 5.13) syntax for configuring globals ([#304](https://github.com/matatk/landmarks/issues/304)) ([a111cee](https://github.com/matatk/landmarks/commit/a111cee))

### Chores

* Bump dependencies ([#298](https://github.com/matatk/landmarks/issues/298)) ([63e8791](https://github.com/matatk/landmarks/commit/63e8791))

### Documentation

* **Help:** Update for 2.5.5 ([#308](https://github.com/matatk/landmarks/issues/308)) ([a96f8b2](https://github.com/matatk/landmarks/commit/a96f8b2))

### Performance improvements

* Enhance profiling script help message ([#302](https://github.com/matatk/landmarks/issues/302)) ([19409dd](https://github.com/matatk/landmarks/commit/19409dd)), closes [#297](https://github.com/matatk/landmarks/issues/297)
* Perform the first scan for landmarks sooner ([#307](https://github.com/matatk/landmarks/issues/307)) ([4992396](https://github.com/matatk/landmarks/commit/4992396)), closes [#306](https://github.com/matatk/landmarks/issues/306)

## [2.5.4](https://github.com/matatk/landmarks/compare/2.5.3...2.5.4) (2019-03-21)

### Bug fixes

* **Help:** Ensure correct key handling for links ([#287](https://github.com/matatk/landmarks/issues/287)) ([8dc137a](https://github.com/matatk/landmarks/commit/8dc137a)), closes [#286](https://github.com/matatk/landmarks/issues/286)
* **Metadata:** Update build instructions for Firefox reviewers ([#290](https://github.com/matatk/landmarks/issues/290)) ([9461815](https://github.com/matatk/landmarks/commit/9461815)), closes [#284](https://github.com/matatk/landmarks/issues/284)
* **UI:** Help should open, from GUIs, in new page (regression) ([#289](https://github.com/matatk/landmarks/issues/289)) ([f07e58b](https://github.com/matatk/landmarks/commit/f07e58b)), closes [#285](https://github.com/matatk/landmarks/issues/285)

### Documentation

* Update extension-loading links and copyright date range ([#291](https://github.com/matatk/landmarks/issues/291)) ([ea3fbcc](https://github.com/matatk/landmarks/commit/ea3fbcc)), closes [#275](https://github.com/matatk/landmarks/issues/275) [#155](https://github.com/matatk/landmarks/issues/155)
* **Help:** Update for 2.5.4 ([#292](https://github.com/matatk/landmarks/issues/292)) ([f7d108f](https://github.com/matatk/landmarks/commit/f7d108f))

## [2.5.3](https://github.com/matatk/landmarks/compare/2.5.2...2.5.3) (2019-03-19)

### Bug fixes

* Move to simpler message passing ([#268](https://github.com/matatk/landmarks/issues/268)) ([0404b77](https://github.com/matatk/landmarks/commit/0404b77)), closes [#265](https://github.com/matatk/landmarks/issues/265)
* Support migration of user settings; Remove the debugInfo setting ([#272](https://github.com/matatk/landmarks/issues/272)) ([9f1924e](https://github.com/matatk/landmarks/commit/9f1924e))
* Ensure command descriptions appear on the help page on Firefox 66 ([#280](https://github.com/matatk/landmarks/issues/280)) ([0a3b6b2](https://github.com/matatk/landmarks/commit/0a3b6b2))

### Build system

* Remove Edge support for now ([#274](https://github.com/matatk/landmarks/issues/274)) ([ef55e8a](https://github.com/matatk/landmarks/commit/ef55e8a)), closes [#270](https://github.com/matatk/landmarks/issues/270)
* Support debug builds; build refactoring ([#279](https://github.com/matatk/landmarks/issues/279)) ([48e5aeb](https://github.com/matatk/landmarks/commit/48e5aeb)), closes [#271](https://github.com/matatk/landmarks/issues/271)

### Documentation

* **Help:** Explain how to modify keyboard shortcuts on Firefox ([#281](https://github.com/matatk/landmarks/issues/281)) ([086804b](https://github.com/matatk/landmarks/commit/086804b))
* **Help:** Update for 2.5.3 ([#282](https://github.com/matatk/landmarks/issues/282)) ([ae88692](https://github.com/matatk/landmarks/commit/ae88692))

### Performance improvements

* Mutation observation metrics ([#271](https://github.com/matatk/landmarks/issues/271)) ([171b16a](https://github.com/matatk/landmarks/commit/171b16a))
* Only observe mutations when the page is visible ([#273](https://github.com/matatk/landmarks/issues/273)) ([f1c0a01](https://github.com/matatk/landmarks/commit/f1c0a01)), closes [#269](https://github.com/matatk/landmarks/issues/269)

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
