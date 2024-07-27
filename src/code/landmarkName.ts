export default function landmarkName(landmark: LandmarkEntry) {
	const roleName = landmark.roleDescription
		? landmark.roleDescription
		: processRole(landmark.role)

	const label = landmark.label
		? landmark.label + ' (' + roleName + ')'
		: roleName

	return landmark.guessed
		? label + ' (' + browser.i18n.getMessage('guessed') + ')'
		: label
}

// Fetch the user-friendly name for a role
function processRole(role: string) {
	const capRole = (base: string) => (base.charAt(0).toUpperCase() + base.slice(1))

	return browser.i18n.getMessage('role' +
		(role.startsWith('doc-') ? capRole(role.slice(4)) : capRole(role)))
}
