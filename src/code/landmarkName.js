export default function landmarkName(landmark) {
	const roleName = landmark.roleDescription
		? landmark.roleDescription
		: processRole(landmark.role)

	const label = landmark.label
		? landmark.label + ' (' + roleName + ')'
		: roleName

	return landmark.guessed
		? label + ' (guessed)'
		: label
}

// Fetch the user-friendly name for a role
function processRole(role) {
	const capRole = base => (base.charAt(0).toUpperCase() + base.slice(1))

	return browser.i18n.getMessage('role' +
		(role.startsWith('doc-') ? capRole(role.slice(4)) : capRole(role)))
}
