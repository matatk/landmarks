(function () {
	'use strict';

	function LandmarksFinder(win, doc) {
		//
		// Constants
		//

		// List of landmarks to navigate
		const regionTypes = Object.freeze([
			// Core ARIA
			'banner',
			'complementary',
			'contentinfo',
			'form',           // should label
			'main',
			'navigation',
			'region',         // must label
			'search',

			// Digital Publishing ARIA module
			'doc-acknowledgements',
			'doc-afterword',
			'doc-appendix',
			'doc-bibliography',
			'doc-chapter',
			'doc-conclusion',
			'doc-credits',
			'doc-endnotes',
			'doc-epilogue',
			'doc-errata',
			'doc-foreword',
			'doc-glossary',
			'doc-index',         // via navigation
			'doc-introduction',
			'doc-pagelist',      // via navigation
			'doc-part',
			'doc-preface',
			'doc-prologue',
			'doc-toc'            // via navigation
		]);

		// Mapping of HTML5 elements to implicit roles
		const implicitRoles = Object.freeze({
			ASIDE:   'complementary',
			FOOTER:  'contentinfo',    // depending on its ancestor elements
			FORM:    'form',
			HEADER:  'banner',         // depending on its ancestor elements
			MAIN:    'main',
			NAV:     'navigation',
			SECTION: 'region'
		});

		// Sectioning content elements
		const sectioningContentElements = Object.freeze([
			'ARTICLE',
			'ASIDE',
			'NAV',
			'SECTION'
		]);

		// Non-<body> sectioning root elements
		const nonBodySectioningRootElements = Object.freeze([
			'BLOCKQUOTE',
			'DETAILS',
			'FIELDSET',
			'FIGURE',
			'TD'
		]);

		// non-<body> sectioning elements and <main>
		const nonBodySectioningElementsAndMain = Object.freeze(
			sectioningContentElements.concat(nonBodySectioningRootElements, 'MAIN')
		);


		//
		// Found landmarks
		//

		let landmarks = [];
		// Each member of this array is an object of the form:
		//   depth: (int)            -- indicates nesting of landmarks
		//   role: (string)          -- the ARIA role
		//   label: (string or null) -- author-supplied label
		//   element: (HTML*Element) -- in-memory element


		//
		// Keeping track of landmark navigation
		//

		let currentlySelectedIndex;

		// If we find a <main> or role="main" element...
		let mainElementIndex;

		// Keep a reference to the currently-selected element in case the page
		// changes and the landmarks are updated.
		let currentlySelectedElement;

		function updateSelectedIndexAndReturnElementInfo(index) {
			if (landmarks.length === 0) return
			currentlySelectedIndex = index;
			currentlySelectedElement = landmarks[index].element;
			return {
				element: currentlySelectedElement,
				role: landmarks[index].role,
				label: landmarks[index].label
			}
		}


		//
		// Functions that refer to document or window
		//

		// Recursive function for building list of landmarks from a root element
		function getLandmarks(element, depth, parentLandmark) {
			if (element === undefined) return

			element.childNodes.forEach(function(elementChild) {
				if (elementChild.nodeType === win.Node.ELEMENT_NODE) {
					if (isHidden(elementChild)) return

					// Support HTML5 elements' native roles
					let role = getRoleFromTagNameAndContainment(elementChild);

					// Elements with explicitly-set rolees
					if (elementChild.getAttribute) {
						const tempRole = elementChild.getAttribute('role');
						if (tempRole) {
							role = tempRole;
						}
					}

					// The element may or may not have a label
					const label = getARIAProvidedLabel(elementChild);

					// Add the element if it should be considered a landmark
					if (role && isLandmark(role, label)) {
						if (parentLandmark && isDescendant(parentLandmark, elementChild)) {
							depth = depth + 1;
						}

						landmarks.push({
							'depth': depth,
							'role': role,
							'label': label,
							'element': elementChild
						});

						// Was this element selected before we were called (i.e.
						// before the page was dynamically updated)?
						if (currentlySelectedElement === elementChild) {
							currentlySelectedIndex = landmarks.length - 1;
						}

						// If this is the first main landmark (there should only
						// be one), store a reference to it.
						if (mainElementIndex < 0 && role === 'main') {
							mainElementIndex = landmarks.length - 1;
						}

						parentLandmark = elementChild;
					}
				}

				// Recursively traverse the tree structure of the child node
				getLandmarks(elementChild, depth, parentLandmark);
			});
		}

		function getARIAProvidedLabel(element) {
			let label = null;

			const idRefs = element.getAttribute('aria-labelledby');
			if (idRefs !== null && idRefs.length > 0) {
				const innerTexts = Array.from(idRefs.split(' '), idRef => {
					const labelElement = doc.getElementById(idRef);
					return getInnerText(labelElement)
				});
				label = innerTexts.join(' ');
			}

			if (label === null) {
				label = element.getAttribute('aria-label');
			}

			return label
		}


		//
		// Functions that do not refer to document or window
		//

		function isLandmark(role, label) {
			// Region and form are landmarks only when they have labels
			if (role === 'region' || role === 'form') {
				return label !== null
			}

			// Is the role (which may have been explicitly set) a valid landmark type?
			return regionTypes.includes(role)
		}

		function getInnerText(element) {
			let text = null;

			if (element) {
				text = element.innerText;
				if (text === undefined) {
					text = element.textContent;
				}
			}

			return text
		}

		function isDescendant(ancestor, child) {
			let node = child.parentNode;

			while (node !== null) {
				if (node === ancestor) {
					return true
				}
				node = node.parentNode;
			}

			return false
		}

		function getRoleFromTagNameAndContainment(element) {
			const name = element.tagName;
			let role = null;

			if (name) {
				if (implicitRoles.hasOwnProperty(name)) {
					role = implicitRoles[name];
				}

				// <header> and <footer> elements have some containment-
				// related constraints on whether they're counted as landmarks
				if (name === 'HEADER' || name === 'FOOTER') {
					if (!isChildOfTopLevelSection(element)) {
						role = null;
					}
				}
			}

			return role
		}

		function isChildOfTopLevelSection(element) {
			let ancestor = element.parentNode;

			while (ancestor !== null) {
				if (nonBodySectioningElementsAndMain.includes(ancestor.tagName)) {
					return false
				}
				ancestor = ancestor.parentNode;
			}

			return true
		}

		function isHidden(element) {
			const style = win.getComputedStyle(element);
			if (element.hasAttribute('hidden')
				|| style.visibility === 'hidden'
				|| style.display === 'none' ) {
				return true
			}

			return false
		}


		//
		// Public API
		//

		this.find = function() {
			landmarks = [];
			mainElementIndex = -1;
			currentlySelectedIndex = -1;
			getLandmarks(doc.body.parentNode, 0);  // supports role on <body>
		};

		this.filter = function() {
			return landmarks.map(landmark => ({
				depth: landmark.depth,
				role: landmark.role,
				label: landmark.label
			}))
		};

		this.getNumberOfLandmarks = function() {
			return landmarks.length
		};

		// These all return elements and their public-facing info:
		// { element: HTMLElement, role: <string>, label: <string> }

		this.getNextLandmarkElementRoleLabel = function() {
			return updateSelectedIndexAndReturnElementInfo(
				(currentlySelectedIndex + 1) % landmarks.length)
		};

		this.getPreviousLandmarkElementRoleLabel = function() {
			return updateSelectedIndexAndReturnElementInfo(
				(currentlySelectedIndex <= 0) ?
					landmarks.length - 1 : currentlySelectedIndex - 1)
		};

		this.getLandmarkElementRoleLabel = function(index) {
			return updateSelectedIndexAndReturnElementInfo(index)
		};

		this.getMainElementRoleLabel = function() {
			return mainElementIndex < 0 ?
				null : updateSelectedIndexAndReturnElementInfo(mainElementIndex)
		};
	}

	// Public API

	// If the landmark has a label, the name is: 'label (role)'
	// otherwise the name is just 'role'
	function landmarkName(landmark) {
		if (landmark.label) {
			return landmark.label + ' (' + processRole(landmark.role) + ')'
		}

		return processRole(landmark.role)
	}


	// Private API

	// Fetch the user-friendly name for a role
	function processRole(role) {
		const capRole = base => (base.charAt(0).toUpperCase() + base.slice(1));

		return browser.i18n.getMessage('role' +
			(role.startsWith('doc-') ? capRole(role.slice(4)) : capRole(role)))
	}

	const defaultBorderSettings = Object.freeze({
		borderType: 'momentary',
		borderColour: '#ff2f92',
		borderFontSize: '16'
	});

	const defaultDebugSettings = Object.freeze({
		debugInfo: false
	});

	const defaultInterfaceSettings = Object.freeze({
		interface: 'popup'
	});

	// FIXME TODO don't include sidebar settings on Chrome when using rollup/similar
	const defaultSettings = Object.freeze(
		Object.assign({},
			defaultBorderSettings, defaultDebugSettings, defaultInterfaceSettings));

	function ContrastChecker() {
		const channelStringPositions = { r: 1, g: 3, b: 5 };


		//
		// Public API
		//

		this.contrastRatio = function(hex1, hex2) {
			const l1 = luminance(transmogrify(sRGB(hexToRGB(hex1))));
			const l2 = luminance(transmogrify(sRGB(hexToRGB(hex2))));
			if (l1 > l2) {
				return contrast(l1, l2)
			}
			return contrast(l2, l1)
		};

		this.foregroundTextColour = function(backgroundColour, fontSize, bold) {
			const contrastWhite = this.contrastRatio('#ffffff', backgroundColour);
			const threshold =
				((fontSize >= 18) || (fontSize >= 14 && bold === true)) ? 3 : 4.5;

			if (contrastWhite >= threshold) {
				return 'white'
			}
			return 'black'
		};


		//
		// Private API
		//

		function hexToRGB(hex) {
			const rgb = {};
			for (const channel in channelStringPositions) {
				const chanHex = hex.substr(channelStringPositions[channel], 2);
				rgb[channel] = parseInt('0x' + chanHex);
			}

			return rgb
		}

		function sRGB(rgb) {
			return {
				r: rgb.r / 255,
				g: rgb.g / 255,
				b: rgb.b / 255
			}
		}

		function transmogrify(sRGB) {
			const transmogrified = {};

			for (const channel in sRGB) {
				if (sRGB[channel] <= 0.03928) {
					transmogrified[channel] = sRGB[channel] / 12.92;
				} else {
					transmogrified[channel] = ((sRGB[channel] + 0.055) / 1.055) ** 2.4;
				}
			}

			return transmogrified
		}

		function luminance(transmogrified) {
			return 0.2126 * transmogrified.r
				+ 0.7152 * transmogrified.g
				+ 0.0722 * transmogrified.b
		}

		function contrast(lighter, darker) {
			return (lighter + 0.05) / (darker + 0.05)
		}
	}

	function ElementFocuser() {
		const contrastChecker = new ContrastChecker();

		const momentaryBorderTime = 2000;
		const borderWidthPx = 4;

		const settings = {};         // caches options locally (simpler drawing code)
		let labelFontColour = null;  // computed based on border colour

		// Keep a reference to the current element, its role and name for redraws
		let currentlyFocusedElementInfo = null;

		// Drawn border elements: the first is used as a convenient indicator that
		// the border is drawn. They are both needed when resizing/repositioning
		// the border/label.
		let currentBorderElement = null;
		let currentLabelElement = null;

		let currentResizeHandler = null;  // tracked so it can be removed
		let borderRemovalTimer = null;    // tracked so it can be cleared
		let justMadeChanges = false;      // we are asked this by mutation observer


		//
		// Options-handling
		//

		// Take a local copy of all options at the start (this means that 'gets' of
		// options don't need to be done asynchronously in the rest of the code).
		// This also computes the initial label font colour (as it depends on the
		// border colour, which forms the label's background).
		browser.storage.sync.get(defaultBorderSettings, function(items) {
			for (const option in items) {
				settings[option] = items[option];
			}
			updateLabelFontColour();
		});

		browser.storage.onChanged.addListener(function(changes) {
			for (const option in changes) {
				if (settings.hasOwnProperty(option)) {
					settings[option] = changes[option].newValue;
				}
			}

			if ('borderColour' in changes || 'borderFontSize' in changes) {
				updateLabelFontColour();
				redrawBorderAndLabel();
			}

			if ('borderType' in changes) {
				borderTypeChange();
			}
		});


		//
		// Public API
		//

		// Set focus on the selected landmark element. It takes an element info
		// object, as returned by the various LandmarksFinder functions.
		//
		// { element: HTMLElement, role: <string>, label: <string> }
		//
		// Note: this should only be called if landmarks were found. The check
		//       for this is done in the main content script, as it involves UI
		//       activity, and couples finding and focusing.
		this.focusElement = function(elementInfo) {
			removeBorderOnCurrentlySelectedElement();

			// Ensure that the element is focusable
			const originalTabindex = elementInfo.element.getAttribute('tabindex');
			if (originalTabindex === null || originalTabindex === '0') {
				elementInfo.element.setAttribute('tabindex', '-1');
			}

			elementInfo.element.scrollIntoView();  // always go to the top of it
			elementInfo.element.focus();

			// Add the border and set a borderRemovalTimer to remove it (if
			// required by user settings)
			if (settings.borderType !== 'none') {
				addBorder(elementInfo);

				if (settings.borderType === 'momentary') {
					if (borderRemovalTimer) {
						clearTimeout(borderRemovalTimer);
					}

					borderRemovalTimer = setTimeout(
						removeBorderOnCurrentlySelectedElement,
						momentaryBorderTime);
				}
			}

			// Restore tabindex value
			if (originalTabindex === null) {
				elementInfo.element.removeAttribute('tabindex');
			} else if (originalTabindex === '0') {
				elementInfo.element.setAttribute('tabindex', '0');
			}

			currentlyFocusedElementInfo = elementInfo;
		};

		function removeBorderOnCurrentlySelectedElement() {
			if (currentBorderElement) {
				justMadeChanges = true;
				currentBorderElement.remove();
				currentLabelElement.remove();
				window.removeEventListener('resize', currentResizeHandler);
				currentBorderElement = null;
				currentLabelElement = null;
			}

			// currentlyFocusedElementInfo is not deleted, as we may be in the
			// middle of updating (redrawing) a border due to settings changes
		}

		// This needs to be a separate (and public) declaration because external
		// stuff calls it, but the options-handling code can't access 'this'.
		this.removeBorderOnCurrentlySelectedElement
			= removeBorderOnCurrentlySelectedElement;

		// Did we just make changes to a border? If so, report this, so that the
		// mutation observer can ignore it.
		this.didJustMakeChanges = function() {
			const didChanges = justMadeChanges;
			justMadeChanges = false;
			return didChanges
		};


		//
		// Private API
		//

		// Add the landmark border and label for an element
		// Note: only one should be drawn at a time
		function addBorder(elementInfo) {
			drawBorderAndLabel(
				elementInfo.element,
				landmarkName(elementInfo),
				settings.borderColour,
				labelFontColour,  // computed as a result of settings
				settings.borderFontSize);
		}

		// Create an element on the page to act as a border for the element to be
		// highlighted, and a label for it; position and style them appropriately
		function drawBorderAndLabel(element, label, colour, fontColour, fontSize) {
			const zIndex = 10000000;

			const labelContent = document.createTextNode(label);

			const borderDiv = document.createElement('div');
			borderDiv.style.border = borderWidthPx + 'px solid ' + colour;
			borderDiv.style.boxSizing = 'border-box';
			borderDiv.style.margin = '0';
			borderDiv.style.padding = '0';
			// Pass events through - https://stackoverflow.com/a/6441884/1485308
			borderDiv.style.pointerEvents = 'none';
			borderDiv.style.position = 'absolute';
			borderDiv.style.zIndex = zIndex;

			const labelDiv = document.createElement('div');
			labelDiv.style.backgroundColor = colour;
			labelDiv.style.border = 'none';
			labelDiv.style.boxSizing = 'border-box';
			labelDiv.style.color = fontColour;
			labelDiv.style.display = 'inline-block';
			labelDiv.style.fontFamily = 'sans-serif';
			labelDiv.style.fontSize = fontSize + 'px';
			labelDiv.style.fontWeight = 'bold';
			labelDiv.style.margin = '0';
			labelDiv.style.paddingBottom = '0.25em';
			labelDiv.style.paddingLeft = '0.75em';
			labelDiv.style.paddingRight = '0.75em';
			labelDiv.style.paddingTop = '0.25em';
			labelDiv.style.position = 'absolute';
			labelDiv.style.whiteSpace = 'nowrap';
			labelDiv.style.zIndex = zIndex;

			labelDiv.appendChild(labelContent);

			document.body.appendChild(borderDiv);
			document.body.appendChild(labelDiv);
			justMadeChanges = true;  // seems to be covered by sizeBorderAndLabel()

			sizeBorderAndLabel(element, borderDiv, labelDiv);

			currentBorderElement = borderDiv;
			currentLabelElement = labelDiv;
			currentResizeHandler = () => resize(element);

			window.addEventListener('resize', currentResizeHandler);
		}

		// Given an element on the page and elements acting as the border and
		// label, size the border, and position the label, appropriately for the
		// element
		function sizeBorderAndLabel(element, border, label) {
			const elementBounds = element.getBoundingClientRect();
			const elementTopEdgeStyle = window.scrollY + elementBounds.top + 'px';
			const elementLeftEdgeStyle = window.scrollX + elementBounds.left + 'px';
			const elementRightEdgeStyle = document.documentElement.clientWidth -
				(window.scrollX + elementBounds.right) + 'px';

			border.style.left = elementLeftEdgeStyle;
			border.style.top = elementTopEdgeStyle;
			border.style.width = elementBounds.width + 'px';
			border.style.height = elementBounds.height + 'px';

			// Try aligning the right edge of the label to the right edge of the
			// border.
			//
			// If the label would go off-screen left, align the left edge of the
			// label to the left edge of the border.

			label.style.removeProperty('left');  // in case this was set before

			label.style.top = elementTopEdgeStyle;
			label.style.right = elementRightEdgeStyle;

			// Is part of the label off-screen?
			const labelBounds = label.getBoundingClientRect();
			if (labelBounds.left < 0) {
				label.style.removeProperty('right');
				label.style.left = elementLeftEdgeStyle;
			}

			justMadeChanges = true;  // seems to be in the right place
		}

		// When the viewport changes, update the border <div>'s size
		function resize(element) {
			sizeBorderAndLabel(
				element,
				currentBorderElement,
				currentLabelElement);
		}

		// Work out if the label font colour should be black or white
		function updateLabelFontColour() {
			labelFontColour = contrastChecker.foregroundTextColour(
				settings.borderColour,
				settings.borderFontSize,
				true);  // the font is always bold
		}

		// Redraw an existing border
		function redrawBorderAndLabel() {
			if (currentBorderElement) {
				if (settings.borderType === 'persistent') {
					removeBorderOnCurrentlySelectedElement();
					addBorder(currentlyFocusedElementInfo);
				}
			}
		}

		// Should a border be added/removed?
		function borderTypeChange() {
			if (settings.borderType === 'persistent') {
				if (currentlyFocusedElementInfo) {
					addBorder(currentlyFocusedElementInfo);
				}
			} else {
				removeBorderOnCurrentlySelectedElement();
			}
		}
	}

	function PauseHandler(logger) {
		//
		// Constants
		//

		const minPause = 500;
		const maxPause = 60000;
		const multiplier = 1.5;
		const decrement = minPause;
		const decreaseEvery = minPause * 2;


		//
		// State
		//

		let pause = minPause;
		let lastEvent = Date.now();
		let decreasePauseTimeout = null;
		let haveIncreasedPauseAndScheduledTask = false;


		//
		// Private API
		//

		function increasePause() {
			stopDecreasingPause();
			pause = Math.floor(pause * multiplier);
			if (pause >= maxPause) {
				pause = maxPause;
			}
			logger.log('Increased pause to:', pause);
		}

		function decreasePause() {
			decreasePauseTimeout = setTimeout(_decreasePause, decreaseEvery);
		}

		function _decreasePause() {
			pause = Math.floor(pause - decrement);
			if (pause <= minPause) {
				pause = minPause;
				decreasePauseTimeout = null;
			} else {
				decreasePause();
			}
			logger.log('Decreased pause to:', pause);
		}

		function stopDecreasingPause() {
			if (decreasePauseTimeout) {
				clearTimeout(decreasePauseTimeout);
				decreasePauseTimeout = null;
				logger.log('Stopped decreasing the pause');
			}
		}


		//
		// Public API
		//

		this.run = function(ignoreCheck, guardedTask, scheduledTask) {
			if (ignoreCheck()) return

			const now = Date.now();
			if (now > lastEvent + pause) {
				guardedTask();
				lastEvent = now;
			} else if (!haveIncreasedPauseAndScheduledTask) {
				increasePause();
				logger.log('Scheduling scan in:', pause);
				setTimeout(() => {
					logger.log('SCAN as scheduled');
					scheduledTask();
					decreasePause();
					haveIncreasedPauseAndScheduledTask = false;
				}, pause);
				haveIncreasedPauseAndScheduledTask = true;
			}
		};

		this.getPauseTime = function() {
			return pause
		};
	}

	const outOfDateTime = 2000;
	const logger = new Logger();
	let observer = null;

	const lf = new LandmarksFinder(window, document);
	const ef = new ElementFocuser();
	const ph = new PauseHandler(logger);


	//
	// Log messages according to user setting
	//

	function Logger() {
		const that = this;

		function getDebugInfoOption(callback) {
			browser.storage.sync.get({
				debugInfo: false
			}, function(items) {
				// We only define the log() function after successfully initing, so
				// as to trap any errant uses of the logger.
				handleOptionsChange({
					debugInfo: {
						newValue: items.debugInfo
					}
				});
				if (callback) {
					callback();
				}
			});
		}

		function handleOptionsChange(changes) {
			if (changes.hasOwnProperty('debugInfo')) {
				// Ensure the correct line number is reported
				// https://stackoverflow.com/a/32928812/1485308
				// https://stackoverflow.com/a/28668819/1485308
				if (changes.debugInfo.newValue === true) {
					that.log = console.log.bind(window.console);
				} else {
					that.log = function() {};
				}
			}
		}

		// We may wish to log messages right way, but the call to get the user
		// setting is asynchronous. Therefore, we need to pass our bootstrapping
		// code as a callback that is run when the option has been fetched.
		this.init = function(callback) {
			getDebugInfoOption(callback);
			browser.storage.onChanged.addListener(handleOptionsChange);
		};
	}


	//
	// Extension message management
	//

	// Act on requests from the background or pop-up scripts
	function messageHandler(message, sender, sendResponse) {
		switch (message.request) {
			case 'get-landmarks':
				// The pop-up is requesting the list of landmarks on the page
				handleOutdatedResults();
				sendResponse(lf.filter());
				break
			case 'focus-landmark':
				// Triggered by clicking on an item in the pop-up, or indirectly
				// via one of the keyboard shortcuts (if landmarks are present)
				handleOutdatedResults();
				checkFocusElement(
					() => lf.getLandmarkElementRoleLabel(message.index));
				break
			case 'next-landmark':
				// Triggered by keyboard shortcut
				handleOutdatedResults();
				checkFocusElement(lf.getNextLandmarkElementRoleLabel);
				break
			case 'prev-landmark':
				// Triggered by keyboard shortcut
				handleOutdatedResults();
				checkFocusElement(lf.getPreviousLandmarkElementRoleLabel);
				break
			case 'main-landmark': {
				handleOutdatedResults();
				const mainElementInfo = lf.getMainElementRoleLabel();
				if (mainElementInfo) {
					ef.focusElement(mainElementInfo);
				} else {
					alert(browser.i18n.getMessage('noMainLandmarkFound') + '.');
				}
				break
			}
			case 'trigger-refresh':
				// On sites that use single-page style techniques to transition
				// (such as YouTube and GitHub) we monitor in the background script
				// for when the History API is used to update the URL of the page
				// (indicating that its content has changed substantially). When
				// this happens, we should treat it as a new page, and fetch
				// landmarks again when asked.
				logger.log('Landmarks: trigger-refresh');
				ef.removeBorderOnCurrentlySelectedElement();
				findLandmarksAndUpdateBadge();
				break
			default:
				if (!message.request || !message.request.startsWith('splash-')) {
					throw Error(
						'Landmarks: content script received unexpected request: '
						+ message.request)
				}
		}
	}

	function handleOutdatedResults() {
		if (ph.getPauseTime() > outOfDateTime) {
			logger.log(`Landmarks may be out of date (pause: ${ph.getPauseTime()}); scanning now...`);
			findLandmarksAndUpdateBadge();
		}
	}

	function checkFocusElement(callbackReturningElementInfo) {
		if (lf.getNumberOfLandmarks() === 0) {
			alert(browser.i18n.getMessage('noLandmarksFound') + '.');
			return
		}

		ef.focusElement(callbackReturningElementInfo());
	}


	//
	// Actually finding landmarks
	//

	function findLandmarksAndUpdateBadge() {
		lf.find();
		sendUpdateBadgeMessage();
	}

	function sendUpdateBadgeMessage() {
		try {
			browser.runtime.sendMessage({
				request: 'update-badge',
				landmarks: lf.getNumberOfLandmarks()
			});
		} catch (error) {
			// The most likely error is that, on !Firefox this content script has
			// been retired because the extension was unloaded/reloaded. In which
			// case, we don't want to keep handling mutations.
			if (observer) {
				logger.log('Disconnecting observer from retired content script');
				observer.disconnect();
				observer = null;
			} else {
				throw error
			}
		}
	}


	//
	// Bootstrapping and mutation observer setup
	//

	function bootstrap() {
		logger.init(() => {
			logger.log('Bootstrapping Landmarks');
			logger.log(`Document state: ${document.readyState}`);
			findLandmarksAndUpdateBadge();
			setUpMutationObserver();
			browser.runtime.onMessage.addListener(messageHandler);
		});
	}

	function setUpMutationObserver() {
		observer = new MutationObserver((mutations) => {
			// Guard against being innundated by mutation events
			// (which happens in e.g. Google Docs)
			ph.run(
				ef.didJustMakeChanges,
				function() {
					if (shouldRefreshLandmarkss(mutations)) {
						logger.log('SCAN mutation');
						findLandmarksAndUpdateBadge();
					}
				},
				findLandmarksAndUpdateBadge);
		});

		observer.observe(document, {
			attributes: true,
			childList: true,
			subtree: true,
			attributeFilter: [
				'class', 'style', 'hidden', 'role', 'aria-labelledby', 'aria-label'
			]
		});
	}

	function shouldRefreshLandmarkss(mutations) {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				// Structural change
				for (const nodes of [mutation.addedNodes, mutation.removedNodes]) {
					for (const node of nodes) {
						if (node.nodeType === Node.ELEMENT_NODE) {
							return true
						}
					}
				}
			} else {
				// Attribute change
				if (mutation.attributeName === 'style') {
					if (/display|visibility/.test(mutation.target.getAttribute('style'))) {
						return true
					}
					continue
				}

				// TODO: things that could be checked:
				//  * If it's a class change, check if it affects visiblity.
				//  * If it's a relevant change to the role attribute.
				//  * If it's a relevant change to aria-labelledby.
				//  * If it's a relevant change to aria-label.

				// For now, assume that any change is relevant, becuse it
				// could be.
				return true
			}
		}
		return false
	}


	//
	// Entry point
	//

	bootstrap();

}());
