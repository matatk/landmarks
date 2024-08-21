interface Settings {
	[key: string]: string | number | undefined
	version?: number
}

type Migrations = Record<number, (settings: Settings) => void>;

export default class MigrationManager {
	#migrations: Migrations

	constructor(migrations: Migrations) {
		this.#migrations = migrations
	}

	#getVersion(settings: Settings) {
		return settings.version ?? 0
	}

	#isMigrationNeeded(startingVersion: number) {
		return startingVersion < Number(Object.keys(this.#migrations).pop())
	}

	migrate(settings: Settings) {
		if (Object.keys(settings).length === 0) return false
		const startingVersion = this.#getVersion(settings)
		if (this.#isMigrationNeeded(startingVersion)) {
			for (const key in this.#migrations) {
				const toVersion = Number(key)
				if (toVersion > startingVersion) {
					this.#migrations[toVersion](settings)
					settings.version = toVersion
				}
			}
			console.log(`Landmarks: migrated user settings from version ${startingVersion} to version ${settings.version}`)
			return true
		}
		console.log(`Landmarks: no need to migrate user settings from version ${startingVersion} to version ${settings.version}`)
		return false
	}
}
