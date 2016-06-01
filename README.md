Landmarks
=========

**This extension has been moved to the new WebExtension API so it can once again be used in Firefox. However, Firefox will only support keyboard commands for WebExtensions from version 48 (to be released on 2016-08-02). It *should* work with Firefox Developer Edition right now, but is presently experiencing some permissions errors.**

**Therefore, keyboard-only navigation of landmarks will return as soon as Firefox supports it, and border preferences will return as soon as possible.**

This repository contains a Firefox extension that enables navigation of WAI-ARIA landmarks (including [implicit landmarks in HTML5 elements](http://www.w3.org/html/wg/drafts/html/master/dom.html#sec-strong-native-semantics)). Landmarks may be navigated via the extension's toolbar button. The following WAI-ARIA landmarks are supported:

-   application (1)
-   banner
-   complementary
-   contentinfo
-   form (1)
-   main
-   navigation
-   region (1)
-   search

**Note 1:** that application, form and region roles are considered navigable landmarks only when they are labelled with `aria-label` or `aria-labelledby`.

**Note 2:** header and footer elements are not considered landmarks when they are contained within an article or a section element.

Installation
------------

To install the extension, clone the repository to your computer and then use [Mozilla's instructions on temporarily loading extensions from disk](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Packaging_and_installation#Loading_from_disk).

Navigating Landmarks
--------------------

The landmarks menu item presents a list of page landmarks allowing the user to select one. If landmarks are nested, the landmarks menu item indents entries to reflect nesting. If landmark labels are present via `aria-label` or `aria-labelledby`, the labels are shown.

Test Pages
----------

-   ARIA landmarks: http://www.html5accessibility.com/tests/roles-land.html
-   HTML 5 structural elements: http://www.html5accessibility.com/tests/structural-elements.html

