/*
   © Copyright IBM Corp. 2012
   © Copyright The Paciello Group 2013-2015

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
   */

var ARIA_LANDMARKS = (function() {
	var pub = {};  // stuff in here will be available to call from outside

	var prefs = null;
	var menu = null;
	var selectedIndex = 0;           // Currently selected landmark in menu
	var previousSelectedIndex = -1;  // Previously selected landmark in menu
	var landmarkedElements = [];     // Array of landmarked elements

	// List of landmarks to navigate
	var landmarks = {
		application: true,    // must have a label
		banner: true,
		complementary: true,
		contentinfo: true,
		form: true,           // must have a label
		main: true,
		navigation: true,
		region: true,         // must have a label
		search: true
	};

	// mapping of HTML5 elements to implicit roles
	var implicitRoles = {
		HEADER: 'banner',       // must not be in a <section> or <article>
		FOOTER: 'contentinfo',  // must not be in a <section> or <article>
		MAIN: 'main',
		ASIDE: 'complementary',
		NAV: 'navigation'
	};


	//
	// Public Functions
	//

	// Window load event listener - called when plugin starts up
	pub.startup = function() {
		//console.log('LANDMARKS: startup function called');
		// Listen for a page load so that landmarks array can be refreshed.
		// Fixes problem where nav keys don't work after a page refresh.
		var appcontent = document.getElementById("appcontent");   // browser
		if(appcontent) {
			appcontent.addEventListener("DOMContentLoaded", onPageLoad, true);
		}

		// Keep track of tab changes...
		gBrowser.tabContainer.addEventListener("TabSelect", onTabChange, false);

		// Register to receive notifications when preferences change
		prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.landmarks.");
		prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		prefs.addObserver("", this, false);

		reflectPreferences();
	};

	pub.observe = function(subject, topic, data) {
		//console.log('LANDMARKS: prefs observer called');
		if (topic != "nsPref:changed") {
			return;
		}
		reflectPreferences();
	};

	// From <http://forums.mozillazine.org/viewtopic.php?f=19&t=2696969>, it
	// is not possible to use addEventListener on <key> elements, hence these
	// functions have to be public...

	// Advance to next landmark via hot key
	pub.nextLandmark = function() {
		if (landmarkedElements.length === 0) {
			msg_no_landmarks();
		} else {
			var landmarkCount = landmarkedElements.length;
			focusElement( (previousSelectedIndex + 1) % landmarkCount );
		}
	};

	// Advance to previous landmark via hot key
	pub.previousLandmark = function() {
		if (landmarkedElements.length === 0) {
			msg_no_landmarks();
		} else {
			var selectedLandmark = (previousSelectedIndex <= 0) ? landmarkedElements.length - 1 : previousSelectedIndex - 1;
			focusElement(selectedLandmark);
		}
	};


	//
	// Private functions
	//

	// HTML page load event listener
	function onPageLoad() {
		//console.log('LANDMARKS: page loaded...');
		refresh();
	}

	// browser tab change listener
	function onTabChange() {
		//var browser = gBrowser.selectedBrowser;
		//console.log('LANDMARKS: tab changed...');
		refresh();
	}

	function refresh() {
		previousSelectedIndex = -1;
		makeLandmarksInit();
	}

	function makeLandmarksInit() {
		//console.log('LANDMARKS: makeLandmarksInit');
		menu = document.getElementById("landmarkPopup");

		// Remove all of the items currently in the popup menu
		while (menu.firstChild) {
			menu.removeChild(menu.firstChild);
		}

		selectedIndex = 0;
		landmarkedElements = [];
		var doc = getHTMLDocReference();
		makeLandmarksMenu(doc.getElementsByTagName("body")[0], 0);

		// Put "no landmarks" message in menu if no landmarks are found
		if (menu.childNodes.length === 0) {
			var tempItem = document.createElement("menuitem");
			tempItem.setAttribute("label", "No landmarks found");
			tempItem.setAttribute("disabled", "true");
			menu.appendChild(tempItem);
		}
	}

	// Recursive function for building XUL landmark menu
	function makeLandmarksMenu(currentElement, depth) {
		if (currentElement) {
			var role;
			var i = 0;
			var currentElementChild = currentElement.childNodes[i];

			while (currentElementChild) {
				if (currentElementChild.nodeType == 1) {
					// Support HTML5 elements' native roles
					var name = currentElementChild.tagName;
					if (name) {
						try {
							role = implicitRoles[currentElementChild.tagName];
						} catch(e) {
							role = null;
						}

						// Perform containment checks
						// TODO: how far up should the containment check go (current is just one level)?
						if (name == 'HEADER' || name == 'FOOTER') {
							var parent_name = currentElement.tagName;
							if (parent_name == 'SECTION' || parent_name == 'ARTICLE') {
								role = null;
							}
						}
					}

					// Elements with explicitly-set roles
					if (currentElementChild.getAttribute) {
						var tempRole = currentElementChild.getAttribute("role");
						if (tempRole) {
							role = tempRole;
						}
					}

					// Add it if it's a landmark
					if (role && isLandmark(role, currentElementChild)) {
						var lastLandmarkedElement = landmarkedElements[landmarkedElements.length - 1];

						// Indicate nested elements in the menu by prefixing with hyphens
						if (isDescendant(lastLandmarkedElement, currentElementChild)) {
							++depth;
						}
						for (var j=0; j < depth; ++j) {
							role = "-" + role;
						}

						var label = getARIAProvidedLabel(currentElementChild);
						if (label !== null) {
							role = role + ": " + label;
						}

						var tempItem = document.createElement("menuitem");
						tempItem.setAttribute("label", role);
						// When the menu item is activated, we should focus this
						// element on the page.
						//
						// We want to take a copy of whatever the current
						// selectedIndex is; to do this, we need to introduce an
						// inner scope to capture the value of the variable...
						(function(index) {
							tempItem.addEventListener("command", function() {
								focusElement(index);
							});
						})(selectedIndex);
						menu.appendChild(tempItem);

						landmarkedElements.push(currentElementChild);
						++selectedIndex;
					}
				}

				// Recursively traverse the tree structure of the child node
				makeLandmarksMenu(currentElementChild, depth);
				i++;
				currentElementChild = currentElement.childNodes[i];
			}
		}
	}

	// Return a reference to an HTML document
	function getHTMLDocReference() {
		try {
			return window.content.document;
		} catch(e) {
			alert('window.content.document failed; using window.openenr.parent.content.document instead...');
			return window.opener.parent.content.document;
		}
	}

	function isDescendant(parent, child) {
		var node = child.parentNode;
		while (node !== null) {
			if (node == parent) {
				return true;
			}
			node = node.parentNode;
		}
		return false;
	}

	// Set focus on the selected landmark
	function focusElement(selectedIndex) {
		var borderTypePref = prefs.getCharPref("borderType");

		// Remove border on previously selected DOM element
		var previouslySelectedElement = landmarkedElements[previousSelectedIndex];
		if ((borderTypePref == "persistent" || borderTypePref == "momentary") && previouslySelectedElement) {
			removeBorder(previouslySelectedElement);
		}

		var element = landmarkedElements[selectedIndex];
		var tabindex = element.getAttribute("tabindex");
		if (tabindex === null || tabindex == "0") {
			element.setAttribute("tabindex", "-1");
		}

		element.focus();

		if (borderTypePref == "persistent" || borderTypePref == "momentary") {
			addBorder(element);

			if (borderTypePref == "momentary") {
				setTimeout(function() { removeBorder(element); }, 1000);
			}
		}

		// Restore tabindex value
		if (tabindex === null) {
			element.removeAttribute("tabindex");
		} else if (tabindex == "0") {
			element.setAttribute("tabindex", "0");
		}

		previousSelectedIndex = selectedIndex;
	}

	function addBorder(element) {
		element.style.outline = "medium solid red";
	}

	function removeBorder(element) {
		element.style.outline = "";
	}

	function isLandmark(role, element) {
		// Region, application and form are counted as landmarks only when
		// they have labels
		if (role == "region" || role == "application" || role == "form") {
			return !!getARIAProvidedLabel(element);
		}
		return landmarks[role];
	}

	// Get the landmark label if specified
	function getARIAProvidedLabel(element) {
		var label = element.getAttribute("aria-label");

		if (label === null) {
			var labelID = element.getAttribute("aria-labelledby");
			if (labelID !== null) {
				var doc = getHTMLDocReference();
				var labelElement = doc.getElementById(labelID);
				label = getInnerText(labelElement);
			}
		}
		return label;
	}

	function getInnerText(element) {
		var text = null;

		if (element) {
			text = element.innerText;
			if (text === undefined)
				text = element.textContent;
		}
		return text;
	}

	function reflectPreferences() {
		//console.log('LANDMARKS: reflectPreferences called');
		// Remove or add a border as required.
		var borderTypePref = prefs.getCharPref("borderType");
		var previouslySelectedElement = landmarkedElements[previousSelectedIndex];
		if (previouslySelectedElement) {
			switch (borderTypePref) {
				case "persistent":
					addBorder(previouslySelectedElement);
					break;
				default:
					removeBorder(previouslySelectedElement);
					break;
			}
		}
		// FIXME: if there is no previously selected element, it's because
		//        we are now on a different browser tab.

		// The whole keyset has to be removed and recreated to cause
		// the browser to reflect the changes.
		//
		// For some reason if an id is set on the keyset in the XUL,
		// the key elements have no effect, hence this long-winded way
		// of doing things.
		var old_keyset = document.getElementById('nextLandmark').parentNode;
		var keyset_parent = old_keyset.parentNode;
		keyset_parent.removeChild(old_keyset);

		var modifiers = getModifiers();

		var nextNavKey = document.createElement('key');
		nextNavKey.setAttribute('id', 'nextLandmark');
		nextNavKey.setAttribute('key', prefs.getCharPref("nextLandmark"));
		if (modifiers) {
			nextNavKey.setAttribute("modifiers", modifiers);
		}
		nextNavKey.setAttribute("oncommand", "ARIA_LANDMARKS.nextLandmark();");

		var previousNavKey = document.createElement('key');
		previousNavKey.setAttribute('id', 'previousLandmark');
		previousNavKey.setAttribute('key', prefs.getCharPref("previousLandmark"));
		if (modifiers) {
			previousNavKey.setAttribute("modifiers", modifiers);
		}
		previousNavKey.setAttribute("oncommand", "ARIA_LANDMARKS.previousLandmark();");

		var new_keyset = document.createElement('keyset');
		new_keyset.appendChild(nextNavKey);
		new_keyset.appendChild(previousNavKey);
		keyset_parent.appendChild(new_keyset);
	}

	// Get the modifier keys user may have set in preferences
	function getModifiers() {
		var modifiers = null;
		if (prefs.getBoolPref("shiftKey")) {
			modifiers = "shift";
		}
		if (prefs.getBoolPref("controlKey")) {
			if (modifiers) {
				modifiers += " " + "control";
			} else {
				modifiers = "control";
			}
		}
		return modifiers;
	}

	function msg_no_landmarks() {
		alert("No landmarks were found on this page.");
	}

	return pub;
})();

window.addEventListener("load", function(e) {
	ARIA_LANDMARKS.startup();
}, false);
