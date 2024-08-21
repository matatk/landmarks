import test from 'ava'
import MigrationManager from '../src/code/migrationManager.js'

// The purpose of the migration manager is to delete obsolete user settings, or
// rename existing user settings to their current names. Landmarks ships with
// current default settings, and code throughout the extension uses the
// defaults if the setting hasn't been explicitly specified by the user.
//
// In the tests, though, it's easiest to use the addition of fields to indicate
// whether migrations have occurred. In real life, new settings would be added
// by amending the defaults file.

test('skip migration if there are no user settings', t => {
	const settings = {}
	const migrations = {
		1: function(settings) {
			settings.something = 42
		},
		2: function(settings) {
			settings.somethingElse = 'forty-two'
		},
		3: function(settings) {
			settings.somethingCompletelyDifferent = 'for tea two'
		}
	}
	const migrationManager = new MigrationManager(migrations)
	const changed = migrationManager.migrate(settings)
	t.is(changed, false, 'manager says settings were not changed')
	t.deepEqual({}, settings, 'settings are still empty')

	// We could set the latest version number in the user settings, which means
	// that we could then skip going through _all_ the migrations if the user
	// customises anything in future, but: (a) that would make the code more
	// complex and (b) as migrations should be non-destructive, it doesn't
	// matter if we go through outdated ones later.
})

test('renaming one field (implied v0)', t => {
	const settings = { likedNumber: 42 }
	const migrations = {
		1: function(settings) {
			if (Object.hasOwn(settings, 'likedNumber')) {
				settings.favouriteNumber = settings.likedNumber
				delete settings.likedNumber
			}
		}
	}
	const migrationManager = new MigrationManager(migrations)
	const changed = migrationManager.migrate(settings)
	t.is(changed, true, 'manager says settings were changed')
	t.deepEqual({ favouriteNumber: 42, version: 1 }, settings)
})

test('removing one field (explicit version number)', t => {
	const settings = {
		version: 42,
		deprecatedSetting: 'orange'
	}
	const migrations = {
		43: function(settings) {
			delete settings.deprecatedSetting
		}
	}
	const migrationManager = new MigrationManager(migrations)
	const changed = migrationManager.migrate(settings)
	t.is(changed, true, 'manager says settings were changed')
	t.deepEqual({ version: 43 }, settings)
})

test('two migrations (explicit v0)', t => {
	const settings = { version: 0 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		},
		2: function(settings) {
			settings['newNewSetting'] = true
		}
	}
	const migrationManager = new MigrationManager(migrations)
	const changed = migrationManager.migrate(settings)
	t.is(changed, true, 'manager says settings were changed')
	t.deepEqual({
		newSetting: true,
		newNewSetting: true,
		version: 2
	}, settings)
})

test('two migrations, only one needed', t => {
	const settings = { version: 1 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		},
		2: function(settings) {
			settings['newNewSetting'] = true
		}
	}
	const migrationManager = new MigrationManager(migrations)
	const changed = migrationManager.migrate(settings)
	t.is(changed, true, 'manager says settings were changed')
	t.deepEqual({
		newNewSetting: true,
		version: 2
	}, settings)
})
