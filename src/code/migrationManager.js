export default function MigrationManager(migrations) {
	function getVersion(settings) {
		if (!settings.hasOwnProperty('version')) {
			return 0
		}
		return settings.version
	}

	function isMigrationNeeded(startingVersion) {
		return startingVersion < Object.keys(migrations).pop()
	}

	this.migrate = function(settings) {
		const startingVersion = getVersion(settings)
		if (isMigrationNeeded(startingVersion)) {
			for (const key in migrations) {
				const toVersion = Number(key)
				if (toVersion > startingVersion) {
					migrations[toVersion](settings)
					settings.version = toVersion
				}
			}
			console.log(`Landmarks: migrated settings from version ${startingVersion} to version ${settings.version}`)
			return true
		}
		return false
	}
}
