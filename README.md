Landmarks
=========

[![Build Status](https://travis-ci.org/matatk/landmarks.svg?branch=master)](https://travis-ci.org/matatk/landmarks)

This is a browser extension (for Firefox, Chrome and Opera) that enables navigation of WAI-ARIA landmarks, via the keyboard or a pop-up menu.

Landmark regions broadly signpost the areas of a page (e.g. navigation, search, main content and so on). They can make navigation considerably easier for people who use the keyboard to navigate and those using assistive technologies such as screen-readers, because they make it much quicker to get an overview and to navigate to (and between) areas of interest.

The following sections explain how to install and use the extension.

If you're a web author/developer, check out the information below on [why landmarks rock, and how easy they are to put into your site](#information-for-web-authors-designers-and-developers)&mdash;in fact, if you're using HTML 5, you probably already have landmarks on your site, but there are some ways to make them even more helpful, as discussed below.

Table of Contents
-----------------

-   [Installation](#installation)
-   [Navigating Landmarks](#navigating-landmarks)
-   [Border Preferences](#border-preferences)
-   [This Extension's Support for Landmarks](#this-extensions-support-for-landmarks)
-   [Information for Web Authors, Designers and Developers](#information-for-web-authors-designers-and-developers)
-   [Development](#development)
-   [Acknowledgements](#acknowledgements)

Installation
------------

-   **Firefox:** [Install via Mozilla Add-ons](https://addons.mozilla.org/addon/landmarks/)
-   **Chrome:** [Install via the Chrome Web Store](https://chrome.google.com/webstore/detail/landmark-navigation-via-k/ddpokpbjopmeeiiolheejjpkonlkklgp)
-   **Opera:** [Install via Opera add-ons](https://addons.opera.com/en-gb/extensions/details/landmarks/)

**If you need support, please [check the known issues for Landmarks](https://github.com/matatk/landmarks/issues) and, if necessary, file a new issue using the "New Issue" button on that page.**

Navigating Landmarks
--------------------

### Via Shortcut Key

You can use shortcut keys to navigate between landmarks. By default, the keys are:

-   **Next landmark:** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd>
-   **Previous landmark:** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>
-   **Main landmark:** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>
-   **Open the landmarks pop-up:** <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>, then use <kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd> to move between buttons, <kbd>Space</kbd> or <kbd>Enter</kbd> to move focus to a landmark and <kbd>Escape</kbd> to close the pop-up.

(On a Mac, use the <kbd>Option</kbd> key, which is equivalent to <kbd>Alt</kbd>.)

Landmarks will be focused, and a border shown according to your [border preferences](#border-preferences).

You can change the keyboard shortcuts in the following browsers.

-   **Chrome:** More ⋮ → Settings → Extensions \[on the left-hand side\] → Keyboard shortcuts \[at the bottom of the page\]
-   **Opera:** Opera Menu / Speed Dial → Extensions → Extension Keyboard Shortcuts

### Via Toolbar Pop-up

If landmarks are found on the page, the Landmarks button in the toolbar (which looks like an "L") will be badged with the number of landmarks found.

1.  Activate the Landmarks toolbar button. A pop-up will appear. If landmarks are present on the page, they will be shown in a nested list, reflecting the structure of the landmarks on the page.

2.  Activate a button in the list to move to that landmark. The landmark will be focused, and a border shown according to your [border preferences](#border-preferences).

3.  To close the pop-up, press <kbd>Escape</kbd>, or click outside of the pop-up.

### Inspecting landmarks in the DOM

A Developer Tools panel called "Landmarks" is also provided. This can be used in the same way as the pop-up above, but also allows you to visit each landmark element in the DOM inspector, using inspection buttons that are placed immediately after the button for each landmark.

This feature is primarily intended for web authors/developers and accessibility testers.

Border Preferences
------------------

A border will be drawn around the landmarks as you navigate them. The border contains a label that displays the landmark's type and name (if one was provided by the author of the page). You can customise various aspects of this in the extension's preferences/options page. The available settings are:

-   **If the border should be displayed, and for how long.**
    -   **Momentary (default):** the border remains visible for a short time, then disappears.
    -   **Persistent:** the border remains visible at all times.
    -   **None:** no border is drawn.
-   **The border's colour.**
-   **The font size used in the landmark label.**

You can get to the extension's settings as follows.

-   **Firefox:** Menu ☰ → Add-ons → Extensions \[on left-hand side, if not already activated\] → Preferences \[under Landmarks, then scroll down\]
-   **Chrome/Opera:** Right-click on, or activate the context menu of, the Landmarks button in the toolbar → Options

This Extension's Support for Landmarks
--------------------------------------

The extension supports [WAI-ARIA landmark roles](https://www.w3.org/TR/wai-aria-1.1/#landmark_roles), both as supplied via the `role` attribute and as [implicit landmarks via HTML 5 elements](https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings). All landmark roles are supported, with some caveats, as per the relevant specifications, which are described below.

-   banner<sup>1</sup>
-   complementary
-   contentinfo<sup>1</sup>
-   form<sup>2</sup>
-   main
-   navigation
-   region<sup>2</sup>
-   search

### Caveats

1.  Both `<header>` (`banner`) and `<footer>` (`contentinfo`) elements are not considered landmarks unless they are the page-wide header/footer elements. (As per the [HTML element role mappings](https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings).)

2.  [`form`](https://www.w3.org/TR/wai-aria-1.1/#form) and [`region`](https://www.w3.org/TR/wai-aria-1.1/#region) landmarks are intended to be labelled. Ideally, this should be done with a visual label and an `aria-labelledby` attribute, so that all users can perceive the label. However, if a label is only provided by the non-visual `aria-label` attribute, this extension will recognise it.

    The HTML Accessibility API Mapping is clear that both [unlabelled `<form>`](https://www.w3.org/TR/html-aam-1.0/#details-id-42) and [unlabelled `<section>` (`region`)](https://www.w3.org/TR/html-aam-1.0/#details-id-119) elements are *not* to be counted as landmark regions. This extension discounts *any* unlabelled element with a role of `form` or `region` too, which is in line with most assistive technologies, and is intended to reduce noise in landmark navigation.

### Labelling landmarks

If a landmark label is present (via the `aria-labelledby` or `aria-label` attributes), it'll be shown in the pop-up. As per the [accessible name calculation algorithm](https://www.w3.org/TR/accname-aam-1.1/#mapping_additional_nd_te) used by browsers, the `aria-labelledby` attribute takes precedence over `aria-label`.

If an `aria-labelledby` attribute references multiple elements, all of those elements' text content will be joined to form the label for the landmark. However, it's not recommended that you label landmark regions with more than one element (usually referring to a single HTML heading element is sufficient). Using more than one labelling element could be a sign that your landmark structure is too complicated. [Referencing multiple labelling elements is more suited for labelling `<input>` elements with information from multiple sources.](https://www.w3.org/WAI/GL/wiki/Using_aria-labelledby_to_concatenate_a_label_from_several_text_nodes#Example_1:_A_time-out_input_field_with_concatenated_label)

### Digital Publishing ARIA Landmarks

The following additional landmark roles defined in the [Digital Publishing WAI-ARIA Module 1.0](https://www.w3.org/TR/dpub-aria-1.0/) are also supported.

-    `doc-acknowledgements`
-    `doc-afterword`
-    `doc-appendix`
-    `doc-bibliography`
-    `doc-chapter`
-    `doc-conclusion`
-    `doc-credits`
-    `doc-endnotes`
-    `doc-epilogue`
-    `doc-errata`
-    `doc-foreword`
-    `doc-glossary`
-    `doc-index` (is a landmark via `navigation`)
-    `doc-introduction`
-    `doc-pagelist` (is a landmark via `navigation`)
-    `doc-part`
-    `doc-preface`
-    `doc-prologue`
-    `doc-toc` (is a landmark via `navigation`)

Information for Web Authors, Designers and Developers
-----------------------------------------------------

As described at start of this document, landmarks can really help various people get a quick overview of your site, and navigate it much more effectively. This can save them *a lot* of time, so please consider implementing landmarks on your site; here is some information to help you do so...

-   [Léonie Watson demonstrates landmarks (video)](https://www.youtube.com/watch?v=IhWMou12_Vk)
-   [W3C ARIA landmarks example and advice page](https://www.w3.org/TR/wai-aria-practices/examples/landmarks/index.html)
-   [Easy content organisation with HTML5 (The Paciello Group 'blog article)](https://www.paciellogroup.com/blog/2015/09/easy-content-organisation-with-html5/)
-   [Using WAI-ARIA landmarks (The Paciello Group 'blog article)](https://www.paciellogroup.com/blog/2013/02/using-wai-aria-landmarks-2013/)
-   [W3C WCAG technique ARIA11: Using ARIA landmarks to identify regions of a page](http://www.w3.org/TR/WCAG20-TECHS/ARIA11.html)

Please bear in mind the following when implementing landmarks...

-   It's important that landmarks are not over-used, because their power comes from providing a concise overview of the content of the page. The heading hierarchy for the page can be relied upon for more fine-grained navigation within a particular area of a page.

    **Rule of thumb:** Use as few landmarks as possible, but ensure that all of the content on the page is within a landmark region.

-   If you're using HTML 5 elements such as `<header>`, `<nav>`, `<main>` and others, then your page will inherit some landmarks automagically. However it can be really helpful to label them (especially if there's more than one of a landmark on a page, such as a separate site-wide and page-local `<nav>`). The W3C documentation has all the details, but essentially you would use either the `aria-labelledby` or `aria-label` attribute.

    **Rule of thumb:** If you've more than one type of landmark, then be sure to label them, so their purpose is clear.

Development
-----------

You can build and run the current code locally as follows.

1.  Clone [the Landmarks repository on GitHub](https://github.com/matatk/landmarks) to your computer.

2.  Ensure you have all the required build tools with `npm install` (you will need [Node.js](https://nodejs.org/)).

3.  Run the build script to build one or all of the extensions:

    -   `npm run build:firefox`
    -   `npm run build:chrome`
    -   `npm run build:opera`
    -   `npm run build:edge` (Edge support is in development, but not fully ready yet.)
    -   `npm run build:all`

    The built versions of the extension are placed in the `build/<browser>/` directories and ZIP files for each will be created in the root of the checked-out repository.

4.  To load and use the extension locally in your browser...
    -   **Firefox:** either:
        -   use [Mozilla's instructions on temporarily loading extensions from disk](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Packaging_and_installation#Loading_from_disk), or
        -   if you have [`web-ext`](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext) installed, issue `npm run start:firefox` to open Firefox with Landmarks loaded. It will keep itself up-to-date when you re-build.
    -   **Chrome:** follow [Google's instructions on loading the extension](https://developer.chrome.com/extensions/getstarted#unpacked).
    -   **Opera:** refer to [Testing and Debugging](https://dev.opera.com/extensions/testing/).
    -   **Edge:** use the [Adding, moving, and removing extensions for Microsoft Edge](https://docs.microsoft.com/en-us/microsoft-edge/extensions/guides/adding-and-removing-extensions) instructions on Microsoft's developer site.

Some further info on the test/build process:

-   Automated tests are run as a pre-requisite part of the build process; you can also run them with `npm test`.

-   You can remove the `build/<browser>/` directories and ZIP files with `npm run clean:<browser>` and `npm run clean:all`, as with the build scripts above.

-   Because the process of rasterising the SVG to variously-sized PNGs is slow, the PNGs are cached so they only need to be re-generated when the SVG changes. You can clean out the cache with `npm run clean:cache`.

-   The `pre-commit` hook is used to ensure only code that passes tests is committed (it does this by running a build, which, in turn, runs the tests). [Husky](https://github.com/typicode/husky) manages this so that a build is run before you are asked for a commit message.

-   The `build:chrome:test` script is provided for making an alpha/beta/test build for Chrome, which is the same as a normal build, but the extension is retitled to "Landmarks (test version)". A separate extension listing is required for publishing test versions in the Chrome Web Store. For Firefox Add-ons, a version number such as "2.1.0beta1" can be used and the built package can be uploaded to the extension's beta channel.

### Test Pages

The following pages are incorporated into the automated test suite, but you can also visit them in-browser to try out the extension's UI.

-   [HTML5Accessibility: ARIA landmarks](http://www.html5accessibility.com/tests/roles-land.html)
-   [HTML5Accessibility: structural elements](http://www.html5accessibility.com/tests/structural-elements.html)

Acknowledgements
----------------

This is a fork of the [original landmarks extension](https://github.com/davidtodd/landmarks) written by [davidtodd](https://github.com/davidtodd) at IBM. Thanks to [stevefaulkner](https://github.com/stevefaulkner) for suggesting I work on this, and for feature suggestions (and again to [davidtodd](https://github.com/davidtodd) for supporting me doing so), and to [The Paciello Group](https://www.paciellogroup.com) for donating a significant chunk of the initial development time.
