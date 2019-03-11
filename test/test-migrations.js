'use strict'
function getSettingsVersion(settings) {
	if (!settings.hasOwnProperty('version')) {
		return 0
	}
	return settings.version
}

function runMigrations(migrations, settings) {
	const startingVersion = getSettingsVersion(settings)
	for (const key in migrations) {
		const toVersion = Number(key)
		if (toVersion > startingVersion) {
			migrations[toVersion](settings)
			settings.version = toVersion
		}
	}
}

function isMigrationNeeded(migrations, startingVersion) {
	return startingVersion < Object.keys(migrations).pop()
}

exports['test the damage report machine'] = function(assert) {
	assert.ok(true, 'damage report machine intact')
}

exports['test implicit v0'] = function(assert) {
	const settings = {}
	assert.strictEqual(getSettingsVersion(settings), 0, 'ok')
}

exports['test explicit v0'] = function(assert) {
	const settings = { 'version': 0 }
	assert.strictEqual(getSettingsVersion(settings), 0, 'ok')
}

exports['test explicit v42'] = function(assert) {
	const settings = { 'version': 42 }
	assert.strictEqual(getSettingsVersion(settings), 42, 'ok')
}

exports['test one migration that adds a field'] = function(assert) {
	const settings = { 'version': 0 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		}
	}
	runMigrations(migrations, settings)
	assert.strictEqual(getSettingsVersion(settings), 1, 'bumped version')
	assert.strictEqual(settings.newSetting, true, 'added new setting')
}

exports['test one migration that removes a field'] = function(assert) {
	const settings = {
		'version': 42,
		'deprecatedSetting': 'orange'
	}
	const migrations = {
		43: function(settings) {
			delete settings.deprecatedSetting
		}
	}
	runMigrations(migrations, settings)
	assert.strictEqual(getSettingsVersion(settings), 43, 'bumped version')
	assert.strictEqual(
		settings.hasOwnProperty('deprecatedSetting'), false, 'removed setting')
}

exports['test two migrations'] = function(assert) {
	const settings = { 'version': 0 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		},
		2: function(settings) {
			settings['newNewSetting'] = true
		}
	}
	runMigrations(migrations, settings)
	assert.strictEqual(getSettingsVersion(settings), 2, 'got latest version')
	assert.strictEqual(settings.newSetting, true, 'added new setting')
	assert.strictEqual(settings.newNewSetting, true, 'added new new setting')
}

exports['test two migrations, only one needed, error path'] = function(assert) {
	// We're saying that we're starting with settings version 1, but we aren't.
	const settings = { 'version': 1 }
	const migrations = {
		1: function(settings) {
			settings['newSetting'] = true
		},
		2: function(settings) {
			settings['newNewSetting'] = true
		}
	}
	runMigrations(migrations, settings)
	assert.strictEqual(getSettingsVersion(settings), 2, 'got latest version')
	assert.strictEqual(settings.newSetting, undefined, "didn't run migration 1")
	assert.strictEqual(settings.newNewSetting, true, 'added new new setting')
}

exports['test if migrations are needed (expecting no)'] = function(assert) {
	const startingVersion = 1
	const migrations = {
		1: () => {}
	}
	assert.strictEqual(
		isMigrationNeeded(migrations, startingVersion), false, 'no')
}

exports['test if migrations are needed (expecting yes)'] = function(assert) {
	const startingVersion = 0
	const migrations = {
		1: () => {}
	}
	assert.strictEqual(
		isMigrationNeeded(migrations, startingVersion), true, 'yes')
}

if (module === require.main) {
	require('test').run(exports)
}
