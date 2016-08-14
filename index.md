---
layout: index
---

This is a browser extension (for Firefox and Chrome) that enables navigation of WAI-ARIA landmarks, via the keyboard or a pop-up menu (from the extension's toolbar button).

Landmarks provide a quick way to broadly signpost the function of different areas of a page (e.g. navigation, search, main content and so on). They can make navigation considerably easier for people who use the keyboard to navigate and those using assistive technologies such as screen-readers, because they make it much quicker to get an overview and to navigate to (and between) areas of interest.

The following sections explain how to install and use the extension.

If you're a web author/developer, check out the information below on [why landmarks rock, and how easy they are to put into your site](#information-for-web-authors-designers-and-developers)---in fact, if you're using HTML5, you probably already have landmarks on your site, but there are some ways to make them even more helpful, as discussed below.

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

Landmarks will be focused, and a border shown according to your [border preferences](#border-preferences).

If you're using Chrome, you can change these shortcuts: visit the Chrome extensions page (<chrome://extensions>) and follow the "Keyboard shortcuts" link at the bottom of the page.

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

To change the settings in Chrome, either right-click on, or activate the context menu of, the extension's toolbar button and select "Options", or visit the Chrome extensions page (<chrome://extensions>) and activate the "Options" link for the Landmarks extension.

To change the settings in Firefox, visit the add-ons page (<about:addons>) and activate the "Preferences" button for the Landmarks extension.

**Remember to use the "Save" button to save any changes.** Also, due to the varied way in which web pages can be styled, the border will sometimes not appear to fully surround the landmark element.

Development
-----------

You can build and run the current code locally as follows.

1.  Clone this repository to your computer.
2.  Ensure you have all the required build tools with `npm install` (you will need [Node.js](https://nodejs.org/)).
3.  Run `grunt` to build both the Firefox and Chrome versions, or `grunt firefox` or `grunt chrome` to build just one. The built versions of the extension are placed in the `extensions/<browser>/` directories and zip files for each will be stored in `build/<browser>/`.
4.  To test the extension locally in your browser...
    -   **Firefox:** use [Mozilla's instructions on temporarily loading extensions from disk](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Packaging_and_installation#Loading_from_disk).
    -   **Chrome:** follow [Google's instructions on loading the extension](https://developer.chrome.com/extensions/getstarted#unpacked).

### Test Pages

-   ARIA landmarks: http://www.html5accessibility.com/tests/roles-land.html
-   HTML 5 structural elements: http://www.html5accessibility.com/tests/structural-elements.html

This Extension's Support for Landmarks
--------------------------------------

The extension supports [implicit landmarks in HTML5 elements](http://www.w3.org/html/wg/drafts/html/master/dom.html#sec-strong-native-semantics) as well as roles supplied via the `role` attribute. The following WAI-ARIA landmarks are supported.

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

-   2.0.2 - 12th of August 2016 - First WebExtension Release
