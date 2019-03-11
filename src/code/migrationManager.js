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
			console.log('Landmarks settings pre-migration:', settings)
			for (const key in migrations) {
				const toVersion = Number(key)
				if (toVersion > startingVersion) {
					migrations[toVersion](settings)
					settings.version = toVersion
				}
			}
			console.log('Landmarks settings post-migration:', settings)
			console.log(`Landmarks: migrated from ${startingVersion} to ${settings.version}`)
		}
		return false
	}
}
