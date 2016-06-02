Landmarks
=========

**Firefox users: This extension has been moved to the new WebExtension API so it can once again be used in Firefox. However, Firefox will only support keyboard commands for WebExtensions from version 48 (to be released on 2016-08-02). It works fully with Firefox Developer Edition already.**

**Chrome users: there is currently an issue whereby after updating or re-enabling the extension, you need to reload tabs in order for landmarks to be detected. This is becuase Chrome does not re-load extension background scripts after an update/re-enable.**

This is a browser extension (for Firefox and Chrome) that enables navigation of WAI-ARIA landmarks (including [implicit landmarks in HTML5 elements](http://www.w3.org/html/wg/drafts/html/master/dom.html#sec-strong-native-semantics)). Landmarks may be navigated using the keyboard or via a pop-up (from the extension's toolbar button). The following WAI-ARIA landmarks are supported.

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

There are no hosted versions of this extension presently. However, you can test the current code locally as follows.

1.  Clone this repository to your computer.
2.  Ensure you have all the required build tools with `npm install`.
3.  Run `grunt` to build both the Firefox and Chrome versions, or `grunt firefox` or `grunt chrome` to build just one. The built versions of the extension are placed in the `extensions/<browser>/` directories.
4.  To test the extension locally in your browser...
    -   **Firefox:** use [Mozilla's instructions on temporarily loading extensions from disk](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Packaging_and_installation#Loading_from_disk).
    -   **Chrome:** follow [Google's instructions on loading the extension](https://developer.chrome.com/extensions/getstarted#unpacked).

Navigating Landmarks
--------------------

### Via Shortcut Key

You can use shortcut keys to navigate between landmarks. By default, they keys are:

-   <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+N to move to the next landmark, and
-   <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+P to move to the previous landmark.

The shortcut key can be changed by **FIXME**.

### Via Toolbar Pop-up

1.  Click/tap/activate the landmarks toolbar button. A pop-up will appear. If landmarks are present on the page, they will be shown in a nested list, reflecting the structure of the landmarks on the page. If landmark labels are present via `aria-label` or `aria-labelledby`, the labels are shown.

2.  Click/tap/activate a button in the list to move to that landmark. The landmark will be focused and a border shown according to your [border preferences](#fixme).

3.  To close the pop-up, press <kbd>Escape</kbd>, or click/tap outside of the pop-up.

Test Pages
----------

-   ARIA landmarks: http://www.html5accessibility.com/tests/roles-land.html
-   HTML 5 structural elements: http://www.html5accessibility.com/tests/structural-elements.html

