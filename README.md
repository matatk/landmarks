landmarks
==========

This repository contains a Firefox extension that enables keyboard navigation of WAI-ARIA landmarks (including [implicit landmarks in HTML5 elements](http://www.w3.org/html/wg/drafts/html/master/dom.html#sec-strong-native-semantics)).  Landmarks may be navigated via hotkey or via the Firefox `Tools` menu item.  The following WAI-ARIA landmarks are supported:

 * application (1)
 * banner
 * complementary
 * contentinfo
 * form (1)
 * main
 * navigation
 * region (1)
 * search

**Note 1:** that application, form and region roles are considered navigable landmarks only when they are labelled with `aria-label` or `aria-labelledby`.

**Note 2:** header and footer elements are not considered landmarks when they are contained within an article or a section element.

Installation
-------------

To install the extension, download the landmarks.xpi file (from the [releases page](https://github.com/matatk/landmarks/releases)) then drag it over a Firefox window and release.  Then follow the installation instructions.

Navigating Landmarks
---------------------

Landmarks may be navigated using one of two methods:

1. Navigate landmarks via hot key.

   * Pressing the "n" key navigates forward through landmarks.
   * Pressing the "p" key navigates backward through landmarks.

   The "n" and "p" keys are default navigation keys.  The defaults may be changed by navigating to `Tools` --> `Add-ons`.  Select the "Options" or "Preferences" button on the "WAI-ARIA landmark keyboard navigation" extension.

   Note that some navigation key settings may interfere with other application shortcut keys or your browser's shortcut keys.

   Use `Tools` -->  `Add-ons` --> `Options`/`Preferences`, to enable rendering a border around an element having a landmark role.  Three border options are available as follows:

   * No border drawn around focused element
   * Persistent border drawn around focused element
   * Momentary border drawn around focused element

2. Navigate landmarks from the `Tools` --> `Landmarks` menu item.

   The landmarks menu item presents a list of page landmarks allowing the user to select one. If landmarks are nested, the landmarks menu item indents entries to reflect nesting.  If landmark labels are present via `aria-label` or `aria-labelledby`, the labels are shown.

Test Pages
-----------

 * ARIA landmarks: http://www.html5accessibility.com/tests/roles-land.html
 * HTML 5 structural elements: http://www.html5accessibility.com/tests/structural-elements.html
