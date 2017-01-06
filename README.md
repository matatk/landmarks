Landmarks
=========

[![Build Status](https://travis-ci.org/matatk/landmarks.svg?branch=master)](https://travis-ci.org/matatk/landmarks)

This is a browser extension (for Firefox and Chrome) that enables navigation of WAI-ARIA landmarks, via the keyboard or a pop-up menu (from the extension's toolbar button).

Landmarks provide a quick way to broadly signpost the function of different areas of a page (e.g. navigation, search, main content and so on). They can make navigation considerably easier for people who use the keyboard to navigate and those using assistive technologies such as screen-readers, because they make it much quicker to get an overview and to navigate to (and between) areas of interest.

The following sections explain how to install and use the extension.

If you're a web author/developer, check out the information below on [why landmarks rock, and how easy they are to put into your site](#information-for-web-authors-designers-and-developers)&mdash;in fact, if you're using HTML5, you probably already have landmarks on your site, but there are some ways to make them even more helpful, as discussed below.

Installation
------------

- **Firefox:** [Install via Mozilla Add-ons](https://addons.mozilla.org/addon/landmarks/)
- **Chrome:** [Install via the Chrome Web Store](https://chrome.google.com/webstore/detail/landmark-navigation-via-k/ddpokpbjopmeeiiolheejjpkonlkklgp)

Navigating Landmarks
--------------------

### Via Shortcut Key

You can use shortcut keys to navigate between landmarks. By default, they keys are:

-   <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>n</kbd> to move to the next landmark, and
-   <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>p</kbd> to move to the previous landmark.
-   Note that, on a Mac, the <kbd>Option</kbd> key is equivolent to <kbd>Alt</kbd>.

Landmarks will be focused, and a border shown according to your [border preferences](#border-preferences).

If you're using Chrome, you can change these shortcuts: visit your Chrome extensions page (go to chrome://extensions or activate the "More"/"Menu" button, then "Settings" and "Extensions") and follow the "Keyboard shortcuts" link at the bottom of the page.

Firefox does not yet provide a UI for changing keyboard shortcuts for WebExtensions.

### Via Toolbar Pop-up

If landmarks are found on the page, the Landmarks button in the toolbar (which looks like an "L") will be badged with the number of landmarks found.

1.  Activate the Landmarks toolbar button. A pop-up will appear. If landmarks are present on the page, they will be shown in a nested list, reflecting the structure of the landmarks on the page.

2.  Activate a button in the list to move to that landmark. The landmark will be focused, and a border shown according to your [border preferences](#border-preferences).

3.  To close the pop-up, press <kbd>Escape</kbd>, or click outside of the pop-up.

Border Preferences
------------------

A border can be drawn around the landmarks as you navigate them, to make it clear where you are on the page. You can change the border style in the extension's preferences/options page. The available border styles are:

-   **Momentary (default):** the border remains visible for a short time, then disappears.
-   **Persistent:** the border remains visible at all times.
-   **None:** no border is drawn.

To change the settings in Chrome, either right-click on (or otherwise activate the context menu of) the extension's toolbar button and select "Options", or visit your Chrome extensions page (go to chrome://extensions or activate the "More"/"Menu" button, then "Settings" and "Extensions") and activate the "Options" link for the Landmarks extension.

To change the settings in Firefox, visit your add-ons page (go to about:addons or activate the menu button and then "Add-ons") and use the "Preferences" button for the Landmarks extension.

**Remember to use the "Save" button to save any changes.** Also, due to the varied way in which web pages can be styled, the border will sometimes not appear to fully surround the landmark element.

Development
-----------

You can build and run the current code locally as follows.

1.  Clone [the Landmarks repository on GitHub](https://github.com/matatk/landmarks) to your computer.

2.  Ensure you have all the required build tools with `npm install` (you will need [Node.js](https://nodejs.org/)).

3.  Run the build script to build one or all of the extensions:

    - `npm run build:firefox`
    - `npm run build:chrome`
    - `npm run build:all`

    The built versions of the extension are placed in the `build/<browser>/` directories and ZIP files for each will be created in the root of the checked-out repository.

4.  To load and use the extension locally in your browser...
    -   **Firefox:** use [Mozilla's instructions on temporarily loading extensions from disk](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Packaging_and_installation#Loading_from_disk).
    -   **Chrome:** follow [Google's instructions on loading the extension](https://developer.chrome.com/extensions/getstarted#unpacked).

Some further info on the test/build process:

- Automated tests are run as a pre-requisite part of the build process; you can also run them with `npm test`.

- You can remove the `build/<browser>/` directories and ZIP files with `npm run clean:firefox`, `npm run clean:chrome` or `npm run clean:all`, as with the build scripts above.

- Because the process of rasterising the SVG to variously-sized PNGs is slow, the PNGs are cached, so they only need to be re-generated when the SVG changes. You can clean out the cache with `npm run clean:cache`.

### Test Pages

The following pages are incorporated into the automated test suite, but you can also visit them in-browser to try out the extension's UI.

-   [HTML5Accessibility: ARIA landmarks](http://www.html5accessibility.com/tests/roles-land.html)
-   [HTML5Accessibility: structural elements](http://www.html5accessibility.com/tests/structural-elements.html)

This Extension's Support for Landmarks
--------------------------------------

The extension supports the [ARIA landmark roles](https://www.w3.org/TR/wai-aria-1.1/#landmark_roles), both as supplied via the `role` attribute and as [implicit landmarks via HTML5 elements](https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings). The following WAI-ARIA landmarks are supported.

-   application (0) (1)
-   banner (2)
-   complementary
-   contentinfo (2)
-   form (1)
-   main
-   navigation
-   region (1)
-   search

**Note 0:** the `application` role has been removed from ARIA 1.1.

**Note 1:** that `application`, `form` and `region` roles are considered navigable landmarks only when they are labelled with `aria-label` or `aria-labelledby`.

**Note 2:** `<header>` (`banner`) and `<footer>` (`contentinfo`) elements are not considered landmarks unless they are the page-wide header/footer elements.

If landmark labels are present via `aria-label` or `aria-labelledby`, the labels are shown in the pop-up.

Information for Web Authors, Designers and Developers
-----------------------------------------------------

As described at start of this document, landmarks can really help various people get a quick overview of your site, and navigate it much more effectively. This can save them *a lot* of time, so please consider implementing landmarks on your site; here is some information to help you do so...

-   [Léonie Watson demonstrates landmarks (video)](https://www.youtube.com/watch?v=IhWMou12_Vk)
-   [Using WAI-ARIA Landmarks (The Paciello Group 'blog article)](https://www.paciellogroup.com/blog/2013/02/using-wai-aria-landmarks-2013/)
-   [W3C Advice on using Landmarks](http://www.w3.org/TR/WCAG20-TECHS/ARIA11.html)
    -   If you're using HTML5 elements such as `<header>`, `<nav>`, `<main>` and others, then your page may well inherit some landmarks automagically. However it can be really helpful to label them (especially if there's more than one of a landmark on a page, such as a site-wide and page-local set of navigation links). The W3C documentation has all the details.

Just bear in mind: it's important that landmarks are not over-used, because their power comes from providing a concise overview of the content of the page. The heading hierarchy for the page can be relied upon for more fine-grained navigation within a particular area of a page.

Here's a good rule of thumb when implementing landmarks: use as few landmarks as possible, but ensure that all of the content on the page is within a landmark region.

Acknowledgements
----------------

This is a fork of the [original landmarks extension](https://github.com/davidtodd/landmarks) written by [davidtodd](https://github.com/davidtodd) at IBM. Thanks to [stevefaulkner](https://github.com/stevefaulkner) for suggesting I work on this, and for feature suggestions (and again to [davidtodd](https://github.com/davidtodd) for supporting me doing so), and to [The Paciello Group](https://www.paciellogroup.com) for donating a significant chunk of the development time.

Changes
-------

-   2.0.6 - ???th of January 2017
    * Add a test suite to ensure landmarks are identified correctly.
    * Various large internal code-quality improvements.
-   2.0.5 - 5th of December 2016
    * No user-facing changes.
    * Fix error in packaging (the new build system was not actually compressing the ZIP file, which different parts of the submission process for Chrome and Firefox didn't like&mdash;oops!)
    * Add more code robustosity checks with ESLint.
-   2.0.4 - 4th of December 2016
    * Clean up the appearance of the popup.
    * Increase 'momentary' highlight duration to two seconds, from one second.
    * Remove a workaround for a bug in Firefox popup sizing that was fixed in Firefox 50.
    * Drop Grunt and switch to just using NPM and scripts for building the extensions.
    * Track builds with Travis CI.
    * Use ESLint and EditorConfig code standards and quality tools.
-   2.0.3 - 23rd of September 2016
    * When installed/updated on Chrome, show the web page, with a (hopefully) helpful notice about the install/upgrade.
    * Automatically re-inject the content script on Chrome when the extension is updated (or inject it when the extension is installed), as users would expect it to start working straight away. (Firefox does this itself.)
    * Locale is now en_GB (instead of en).
    * Switch to using grunt-phantom-rasterize for converting the SVGs to PNGs.
-   2.0.2 - 12th of August 2016
    * First WebExtension Release
