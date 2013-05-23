var ARIA_LANDMARKS = {
	prefs: null,
	menu: null,
	selectedIndex: 0,           // Index of currently selected landmark in menu
	previousSelectedIndex: -1,  // Index of previously selected landmark in menu
	landmarkedElements: [],     // Array of landmarked elements

	// List of landmarks to navigate
	landmarks: {
		application: true,
		banner: true,
		complementary: true,
		contentinfo: true,
		form: true,
		main: true,
		navigation: true,
		region: true,
		search: true
	},

	// mapping of HTML5 elements to implicit roles
	implicitRoles: {
		HEADER: 'banner',       // must not be in a <section> or <article>
		FOOTER: 'contentinfo',  // must not be in a <section> or <article>
		MAIN: 'main',
		ASIDE: 'complementary',
		NAV: 'navigation'
	},

	makeLandmarksInit: function() {
		this.menu = document.getElementById("landmarkPopup");

		// Remove all of the items currently in the popup menu
		for(var i = this.menu.childNodes.length - 1; i >= 0; i--) {
			this.menu.removeChild(this.menu.childNodes.item(i));
		}

		this.selectedIndex = 0;
		this.makeLandmarks();

		// Put "no landmarks" message in menu if no landmarks are found
		if (this.menu.childNodes.length == 0) {
			var tempItem = document.createElement("menuitem");
			tempItem.setAttribute("label", "No landmarks found");
			tempItem.setAttribute("disabled", "true");
			this.menu.appendChild(tempItem);
		}
	},

	// Populate the landmarks array
	makeLandmarks: function() {
		this.landmarkedElements = [];
		var doc = this.getHTMLDocReference();
		ARIA_LANDMARKS.makeLandmarkMenu(doc.getElementsByTagName("body")[0], 0);
	},

	// Recursive function for building XUL landmark menu
	makeLandmarkMenu: function(currentElement, depth) {
		if (currentElement) {
			var role;
			var i=0;
			var currentElementChild = currentElement.childNodes[i];

			while (currentElementChild) {
				if (currentElementChild.nodeType == 1) {
					// Support HTML5 elements' native roles
					var name = currentElementChild.tagName;
					if (name) {
						try {
							role = ARIA_LANDMARKS.implicitRoles[currentElementChild.tagName];
						} catch(e) {
							role = null;
						}

						// Perform containment checks
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
					if (role && ARIA_LANDMARKS.isLandmark(role, currentElementChild)) {
						if (this.menu) {
							var lastLandmarkedElement = this.landmarkedElements[this.landmarkedElements.length-1];

							// Indicate nested elements in the menu by prefixing with hyphens
							if (this.isDescendant(lastLandmarkedElement, currentElementChild)) {
								++depth;
							}
							for (var j=0; j < depth; ++j) {
								role = "-" + role;
							}

							var label = ARIA_LANDMARKS.getLabel(currentElementChild);
							if (label != null) {
								role = role + ": " + label;
							}

							var tempItem = document.createElement("menuitem");
							tempItem.setAttribute("label", role);
							tempItem.setAttribute("oncommand", "ARIA_LANDMARKS.focusElement(" + this.selectedIndex + ")");
							this.menu.appendChild(tempItem);
						}
						this.landmarkedElements.push(currentElementChild);
						++this.selectedIndex;
					}
				}

				// Recursively traverse the tree structure of the child node
				ARIA_LANDMARKS.makeLandmarkMenu(currentElementChild, depth);
				i++;
				currentElementChild = currentElement.childNodes[i];
			}
		}
	},

	// Return a reference to an HTML document
	getHTMLDocReference: function() {
		try {
			return window.content.document;
		} catch(e) {
			return window.opener.parent.content.document;
		}
	},

	// Advance to next landmark via hot key
	nextLandmark: function(event) {
		if (this.landmarkedElements.length == 0) {
			this.makeLandmarks();
		}
		var landmarkCount = this.landmarkedElements.length;
		this.focusElement( (this.previousSelectedIndex + 1) % landmarkCount );
	},

	// Advance to previous landmark via hot key
	previousLandmark: function() {
		if (this.landmarkedElements.length == 0) {
			this.makeLandmarks();
		}
		var selectedLandmark = (this.previousSelectedIndex <= 0) ? this.landmarkedElements.length - 1 : this.previousSelectedIndex - 1;
		this.focusElement(selectedLandmark);
	},

	isDescendant: function(parent, child) {
	     var node = child.parentNode;
	     while (node != null) {
	         if (node == parent) {
	             return true;
	         }
	         node = node.parentNode;
	     }
	     return false;
	},

	// Set focus on the selected landmark
	focusElement: function (selectedIndex) {
		var borderTypePref = this.prefs.getCharPref("borderType");

		// Remove border on previously selected DOM element
		var previouslySelectedElement = this.landmarkedElements[this.previousSelectedIndex];
		if ((borderTypePref == "persistent" || borderTypePref == "momentary") && previouslySelectedElement) {
			this.removeBorder(previouslySelectedElement);
		}

		var element = this.landmarkedElements[selectedIndex];
		var tabindex = element.getAttribute("tabindex");
		if (tabindex == null || tabindex == "0") {
			element.setAttribute("tabindex", "-1");
		}

		element.focus();

		if (borderTypePref == "persistent" || borderTypePref == "momentary") {
			element.style.outline = "medium solid red";

			if (borderTypePref == "momentary") {
				setTimeout(function(){ARIA_LANDMARKS.removeBorder(element)}, 250);
			}
		}

		// Restore tabindex value
		if (tabindex == null) {
			element.removeAttribute("tabindex");
		} else if (tabindex == "0") {
			element.setAttribute("tabindex", "0");
		}

		this.previousSelectedIndex = selectedIndex;
	},

	removeBorder: function(element) {
		element.style.outline = "";
	},

	isLandmark: function(role, element) {
		// Region, application and form are counted as landmarks only when they have labels
		if (role == "region" || role == "application" || role == "form") {
			return !!ARIA_LANDMARKS.getLabel(element);
		}
		return this.landmarks[role];
	},

	// Get the landmark label if specified
	getLabel: function(element) {
		var label = element.getAttribute("aria-label");

		if (label == null) {
			var labelID = element.getAttribute("aria-labelledby");
			if (labelID != null) {
				var doc = this.getHTMLDocReference();
				var labelElement = doc.getElementById(labelID);
				label = ARIA_LANDMARKS.getInnerText(labelElement);
			}
		}
		return label;
	},

	getInnerText: function(element) {
		var text = null;

		if (element) {
			text = element.innerText;
			if (text == undefined)
				text = element.textContent;
		}
		return text;
	},

	// HTML page load event listener
	onPageLoad: function() {
		// Refresh landmarks list
		ARIA_LANDMARKS.previousSelectedIndex = -1;
		ARIA_LANDMARKS.makeLandmarks();
	},

	// Window load event listener - called when plugin
	// starts up & when the preferences window appears.
	startup: function() {
		// Listen for a page load so that landmarks array can be refreshed.
		// Fixes problem where nav keys don't work after a page refresh.
		var appcontent = document.getElementById("appcontent");   // browser  
		if(appcontent) {
			appcontent.addEventListener("DOMContentLoaded", this.onPageLoad, true);  
		}

		// Register to receive notifications when preferences change
		this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.landmarks.");
		this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.prefs.addObserver("", this, false);

		this.reflectPreferences();
	},

	observe: function(subject, topic, data) {
		if (topic != "nsPref:changed") {
			return;
		}

		this.reflectPreferences();
	},

	reflectPreferences: function() {
		// If a preference has changed /away/ from persistent borders,
		// remove any border that might be there now.
		// TODO: this could be DRY'd up a bit (similar code above).
		var borderTypePref = this.prefs.getCharPref("borderType");
		var previouslySelectedElement =
			this.landmarkedElements[this.previousSelectedIndex];

		if (borderTypePref != "persistent" && previouslySelectedElement) {
			this.removeBorder(previouslySelectedElement);
		}

		// The whole keyset has to be removed and recreated to cause
		// the browser to reflect the changes.
		//
		// For some reason if an id is set on the keyset in the XUL,
		// the key elements have no effect, hence this long-winded way
		// of doing things.
		var old_keyset = document.getElementById('nextLandmark').parentNode;
		var keyset_parent = old_keyset.parentNode;
		keyset_parent.removeChild(old_keyset);

		var modifiers = this.getModifiers();

		var nextNavKey = document.createElement('key');
		nextNavKey.setAttribute('id', 'nextLandmark');
		nextNavKey.setAttribute('oncommand',
			'ARIA_LANDMARKS.nextLandmark(event);');
		nextNavKey.setAttribute('key',
			this.prefs.getCharPref("nextLandmark"));
		if (modifiers) {
			nextNavKey.setAttribute("modifiers", modifiers);
		}

		var previousNavKey = document.createElement('key');
		previousNavKey.setAttribute('id', 'previousLandmark');
		previousNavKey.setAttribute('oncommand',
			'ARIA_LANDMARKS.previousLandmark(event);');
		previousNavKey.setAttribute('key',
			this.prefs.getCharPref("previousLandmark"));
		if (modifiers) {
			previousNavKey.setAttribute("modifiers", modifiers);
		}

		var new_keyset = document.createElement('keyset');
		new_keyset.appendChild(nextNavKey);
		new_keyset.appendChild(previousNavKey);
		keyset_parent.appendChild(new_keyset);
	},

	// Get the modifier keys user may have set in preferences
	getModifiers: function() {
		var modifiers = null;
		if (this.prefs.getBoolPref("shiftKey")) {
			modifiers = "shift";
		}
		if (this.prefs.getBoolPref("controlKey")) {
			if (modifiers) {
				modifiers += " " + "control";
			} else {
				modifiers = "control";
			}
		}
		return modifiers
	},

	debug: function(arg1, arg2) {
		var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		ps.alert(null, arg1, arg2 );
	}
};

window.addEventListener("load", function(e) {
	ARIA_LANDMARKS.startup();
}, false);
