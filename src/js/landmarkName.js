// If the landmark has a label, the name is: 'label (role)'
// otherwise the name is just 'role'
export default function(landmark) {
	if (landmark.label) {
		return landmark.label + ' (' + processRole(landmark.role) + ')'
	}

	return processRole(landmark.role)
}

// Fetch the user-friendly name for a role
function processRole(role) {
	const capRole = base => (base.charAt(0).toUpperCase() + base.slice(1))

	return browser.i18n.getMessage('role' +
		(role.startsWith('doc-') ? capRole(role.slice(4)) : capRole(role)))
}
