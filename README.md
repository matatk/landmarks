Landmarks
=========

**BORKEDNESS; CONVERSION TO WEBEXTENSION:** This is presently broken because it is unsigned and Firefox now requires signed add-ons.  I am in the process of converting it to using the new, relatively cross-browser, WebExtensions API (in the [`convert-to-webextension`](https://github.com/matatk/landmarks/tree/convert-to-webextension) branch) and will merge that in here ASAP.

This repository contains a Firefox extension that enables keyboard
navigation of WAI-ARIA landmarks (including [implicit landmarks in HTML5
elements](http://www.w3.org/html/wg/drafts/html/master/dom.html#sec-strong-native-semantics)).
Landmarks may be navigated via hotkey or via the Firefox `Tools` menu
item. The following WAI-ARIA landmarks are supported:

-   application (1)
-   banner
-   complementary
-   contentinfo
-   form (1)
-   main
-   navigation
-   region (1)
-   search

**Note 1:** that application, form and region roles are considered
navigable landmarks only when they are labelled with `aria-label` or
`aria-labelledby`.

**Note 2:** header and footer elements are not considered landmarks when
they are contained within an article or a section element.

Installation
------------

To install the extension, download the landmarks.xpi file (from the
[latest release](https://github.com/matatk/landmarks/releases/latest))
then drag it over a Firefox window and release. Then follow the
installation instructions.

You can build the code into an XPI file. On UNIX-like systems, use
`build.sh` and on Windows you can use `build.bat`. There are also
scripts that build and then open Firefox to install the extension:
`install-mac.sh` and `install-windows.bat`.

Navigating Landmarks
--------------------

Landmarks may be navigated using one of two methods:

### Navigate landmarks via hot key

-   Pressing the "n" key navigates forward through landmarks.
-   Pressing the "p" key navigates backward through landmarks.

The "n" and "p" keys are default navigation keys. The defaults may be
changed by navigating to `Tools` → `Add-ons`. Select the "Options" or
"Preferences" button on the "WAI-ARIA landmark keyboard navigation"
extension.

Note that some navigation key settings may interfere with other
application shortcut keys or your browser's shortcut keys.

### Navigate landmarks from the `Tools` → `Landmarks` menu

The landmarks menu item presents a list of page landmarks allowing the
user to select one. If landmarks are nested, the landmarks menu item
indents entries to reflect nesting. If landmark labels are present via
`aria-label` or `aria-labelledby`, the labels are shown.

### Border Options

Use `Tools` → `Add-ons` → `Options`/`Preferences`, to enable rendering a
border around an element having a landmark role. Three border options
are available as follows:

-   No border drawn around focused element
-   Persistent border drawn around focused element
-   Momentary border drawn around focused element (which is the default)

Test Pages
----------

-   ARIA landmarks:
    http://www.html5accessibility.com/tests/roles-land.html
-   HTML 5 structural elements:
    http://www.html5accessibility.com/tests/structural-elements.html

