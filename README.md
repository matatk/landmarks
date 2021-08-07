# Landmarks

[![Build Status](https://github.com/matatk/landmarks/workflows/Build/badge.svg)](https://github.com/matatk/landmarks/actions?query=workflow%3ABuild)

This is a browser extension (for Firefox, Chrome, Opera and Edge) that enables navigation of WAI-ARIA landmarks, via the keyboard or a pop-up menu.

Landmark regions broadly signpost the areas of a page (e.g. navigation, search, main content and so on). They can make navigation considerably easier for people who use the keyboard to navigate and those using assistive technologies such as screen-readers, because they make it much quicker to get an overview and to navigate to (and between) areas of interest.

If you're an author or developer and want to learn about landmark regions, check out the information below on [why landmarks rock, and how easy they are to put into your site](#learning-about-landmark-regions). If you're using HTML5, you most likely already have landmarks on your site, but there are some ways to make them even more helpful, as described below.

## Table of contents

-   [Installation and usage](#installation-and-usage)
-   [This extension's support for landmarks](#this-extensions-support-for-landmarks)
-   [Learning about landmark regions](#learning-about-landmark-regions)
-   [Development](#development)
-   [Acknowledgements](#acknowledgements)

## Installation and usage

Use the [installation links on the home page](http://matatk.agrip.org.uk/landmarks/) to install the extension. When it's installed, you will find documentation on topics such as:

-   How to navigate by shortcut key, and how to change the shortcut keys.
-   How to navigate using the toolbar pop-up.
-   How to navigate using the sidebar (where supported).
-   Border preferences, for landmark highlights and labels whilst navigating.

The rest of this file provides information that may be of help and interest to web authors, designers and developers, accessibility testers and browser extension developers.

## This extension's support for landmarks

The Landmarks extension uses the [Page Structural Semantics Scanner Tests suite; you can find information on standards support there](https://github.com/matatk/page-structural-semantics-scanner-tests#support-for-landmarks).

<!-- This anchor is needed for extension versions <=2.9.0 -->
<div><a name="information-for-web-authors-designers-and-developers"></a></div>

## Learning about landmark regions

Landmark regions can really help people get a quick overview of your content, and navigate it much more effectively. This can save them *a lot* of time, so please consider implementing landmarks on your site. If you're using HTML5, you'll almost certainly have some landmarks already, but there are some things you need to know; the info below will help you ensure your landmarks are as helpful as possible.

-   [All about landmark regions, and some golden rules (story and slides for my a11yTOConf talk)](http://matatk.agrip.org.uk/talks/2020/landmarks/)
-   [Léonie Watson demonstrates landmarks (video)](https://www.youtube.com/watch?v=IhWMou12_Vk)
-   [W3C ARIA landmarks example and advice page](https://www.w3.org/TR/wai-aria-practices/examples/landmarks/index.html)
-   [Easy content organisation with HTML5 (The Paciello Group 'blog article)](https://www.paciellogroup.com/blog/2015/09/easy-content-organisation-with-html5/)
-   [Using WAI-ARIA landmarks (The Paciello Group 'blog article)](https://www.paciellogroup.com/blog/2013/02/using-wai-aria-landmarks-2013/)

Please bear in mind the following when implementing landmarks...

-   It's important that landmarks are not over-used, because their power comes from providing a concise overview of the content of the page. The heading hierarchy for the page can be relied upon for more fine-grained navigation within a particular area of a page.

    **Rule of thumb:** Use as few landmarks as possible, but ensure that all of the content on the page is within a landmark region.

-   If you're using HTML5 elements such as `<header>`, `<nav>`, `<main>` and others, then your page will inherit some landmarks automagically. However it can be really helpful to label them (especially if there's more than one landmark of the same type on a page, such as a separate site-wide and page-local `<nav>`). The W3C documentation has all the details, but essentially you would use either the `aria-labelledby` or `aria-label` attribute.

    **Rule of thumb:** If you've more than one landmark of the same type, then be sure to label them, so their purpose is clear.

## Development

You can build and run the current code locally as follows.

1.  Clone [the Landmarks repository on GitHub](https://github.com/matatk/landmarks) to your computer.

2.  Ensure you have all the required build tools with `npm install` (you will need [Node.js](https://nodejs.org/)).

3.  Run the tests and build script to create versions of the extension for all browsers with `npm run build:all`.

    The built versions of the extension are placed in `build/<browser>/` directories and ZIP files for each will be created in the root of the checked-out repository.

4.  To load and use the extension locally in your browser...

    If you have [`web-ext`](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) installed, issue `npm run start:<browser>` to open the browser with Landmarks freshly installed. It will keep itself up-to-date when you re-build. To manually temporarily load the built extension in each browser, follow these instructions...

    -   **Firefox:** [Temporary installation in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
    -   **Chrome:** [Instructions in the "Create the manifest" section of the "Getting started" docs](https://developer.chrome.com/extensions/getstarted#manifest)
    -   **Opera:** [Testing and Debugging](https://dev.opera.com/extensions/testing/)
    -   **Edge:** [Sideload an extension](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading)

Some further info on the test/build process:

-   Automated tests are run as a pre-requisite part of the build process; you can also run them with `npm test`.

-   You can remove the `build/<browser>/` directories and ZIP files for all browsers with `npm run clean:builds`.

-   Because the process of rasterising the SVG to variously-sized PNGs is slow, the PNGs are cached so they only need to be re-generated when the SVG changes. They are cached in the `build/png-cache/` directory.

-   The `pre-commit` hook is used to ensure only code that passes tests is committed (it does this by running a build, which, in turn, runs the tests). [Husky](https://github.com/typicode/husky) manages this so that a build is run before you are asked for a commit message.

-   For advanced use, you can run the build script directly (which bypasses the tests, beware) with `node scripts/build.js --help`.

### Test pages

The following pages are incorporated into the automated test suite, but you can also visit them in-browser to try out the extension's UI.

-   [HTML5Accessibility: ARIA landmarks](http://www.html5accessibility.com/tests/roles-land.html)
-   [HTML5Accessibility: structural elements](http://www.html5accessibility.com/tests/structural-elements.html)

## Acknowledgements

This is a fork of the [original landmarks extension](https://github.com/davidtodd/landmarks) written by [David Todd](https://github.com/davidtodd) at IBM. Thanks to [Steve Faulkner](https://github.com/stevefaulkner) for encouraging me to work on this, for feature suggestions, help with the relevant specifications and initial test cases (and again to [David Todd](https://github.com/davidtodd) for supporting my contributions). Thanks also to [The Paciello Group](https://www.paciellogroup.com) for donating my development time when this was a Firefox-specific extension and during the conversion to the WebExtensions API.
