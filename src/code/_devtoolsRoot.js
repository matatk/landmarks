import './compatibility'

browser.devtools.panels.create(
	'Landmarks',
	'landmarks-32.png',
	'dummyDevToolsPanel.html')

browser.devtools.panels.elements.createSidebarPane(
	'Landmarks',
	function(sidebarPane) {
		sidebarPane.setPage('devtoolsPanel.html')
	})
