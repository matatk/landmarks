/* eslint-disable no-prototype-builtins */

//
// Constants
//

// TODO: The code runs faster with these defined in the LandmarksFinder function

// List of landmarks to navigate
const regionTypes = Object.freeze([
	// Core ARIA
	'banner',
	'complementary',
	'contentinfo',
	'form',           // spec says should label
	'main',
	'navigation',
	'region',         // spec says must label
	'search',

	// Digital Publishing ARIA module
	'doc-acknowledgments',
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
])

// Sectioning content elements
const sectioningContentElements = Object.freeze([
	'ARTICLE',
	'ASIDE',
	'NAV',
	'SECTION'
])

// Non-<body> sectioning root elements
const nonBodySectioningRootElements = Object.freeze([
	'BLOCKQUOTE',
	'DETAILS',
	'FIELDSET',
	'FIGURE',
	'TD'
])

// non-<body> sectioning elements and <main>
const nonBodySectioningElementsAndMain = Object.freeze(
	sectioningContentElements.concat(nonBodySectioningRootElements, 'MAIN')
)

// Mapping of HTML5 elements to implicit roles
const implicitRoles = Object.freeze({
	ASIDE:   'complementary',
	FOOTER:  'contentinfo',    // depending on its ancestor elements
	FORM:    'form',
	HEADER:  'banner',         // depending on its ancestor elements
	MAIN:    'main',
	NAV:     'navigation',
	SECTION: 'region'
})


//
// DOM Functions
//

// This can only check an element's direct styles. We just stop recursing
// into elements that are hidden. That's why the heuristics don't call this
// function (they don't check all of a guessed landmark's parent elements).
export function isVisuallyHidden(win, element) {
	if (element.hasAttribute('hidden')) return true

	const style = win.getComputedStyle(element)
	if (style.visibility === 'hidden' || style.display === 'none') {
		return true
	}

	return false
}

export function isSemantiallyHidden(element) {
	if (element.getAttribute('aria-hidden') === 'true'
		|| element.hasAttribute('inert')) {
		return true
	}
	return false
}

export function getRoleFromTagNameAndContainment(element) {
	const name = element.tagName
	let role = null

	if (name) {
		if (implicitRoles.hasOwnProperty(name)) {
			role = implicitRoles[name]
		}

		// <header> and <footer> elements have some containment-
		// related constraints on whether they're counted as landmarks
		if (name === 'HEADER' || name === 'FOOTER') {
			if (!isChildOfTopLevelSection(element)) {
				role = null
			}
		}
	}

	return role
}

export function isChildOfTopLevelSection(element) {
	let ancestor = element.parentNode

	while (ancestor !== null) {
		if (nonBodySectioningElementsAndMain.includes(ancestor.tagName)) {
			return false
		}
		ancestor = ancestor.parentNode
	}

	return true
}

export function getValidExplicitRole(value) {
	if (value) {
		if (value.indexOf(' ') >= 0) {
			const roles = value.split(' ')
			for (const role of roles) {
				if (regionTypes.includes(role)) {
					return role
				}
			}
		} else if (regionTypes.includes(value)) {
			return value
		}
	}
	return null
}

export function getARIAProvidedLabel(doc, element) {
	let label = null

	// TODO general whitespace test?
	// TODO if some IDs don't exist, this will include nulls - test?
	const idRefs = element.getAttribute('aria-labelledby')
	if (idRefs !== null && idRefs.length > 0) {
		const innerTexts = Array.from(idRefs.split(' '), idRef => {
			const labelElement = doc.getElementById(idRef)
			return getInnerText(labelElement)
		})
		label = innerTexts.join(' ')
	}

	if (label === null) {
		label = element.getAttribute('aria-label')
	}

	return label
}

export function getInnerText(element) {
	let text = null

	if (element) {
		text = element.innerText
		if (text === undefined) {
			text = element.textContent
		}
	}

	return text
}

export function isLandmark(role, explicitRole, label) {
	// <section> and <form> are only landmarks when labelled.
	// <div role="form"> is always a landmark.
	if (role === 'region' || (role === 'form' && !explicitRole)) {
		return label !== null
	}
	return true  // already a valid role if we were called
}

export function getRoleDescription(element) {
	const roleDescription = element.getAttribute('aria-roledescription')
	// TODO make this a general whitespace check?
	if (/^\s*$/.test(roleDescription)) {
		return null
	}
	return roleDescription
}

export function createSelector(element) {
	const reversePath = []
	let node = element

	while (node.tagName !== 'HTML') {
		const tag = node.tagName.toLowerCase()
		const id = node.id
		const klass = node.classList.length > 0 ? node.classList[0] : null

		let description

		if (id) {
			description = '#' + id
		} else {
			// If the element tag is not unique amongst its siblings, then
			// we'll need to include an nth-child bit on the end of the
			// selector part for this element.
			const siblingElementTagNames =
				Array.from(node.parentNode.children, x => x.tagName)
			const uniqueSiblingElementTagNames =
				[...new Set(siblingElementTagNames)]  // Array API is neater

			// Include element's class if need be.
			// TODO this probably isn't needed as we have nth-child.
			if (klass) {
				description = tag + '.' + klass
			} else {
				description = tag
			}

			if (siblingElementTagNames.length
				> uniqueSiblingElementTagNames.length) {
				const siblingNumber =
					Array.prototype.indexOf.call(
						node.parentNode.children, node) + 1

				description += ':nth-child(' + siblingNumber + ')'
			}
		}

		reversePath.push(description)
		if (id) break
		node = node.parentNode
	}

	return reversePath.reverse().join(' > ')
}