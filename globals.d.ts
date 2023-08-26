interface Window {
	browser: typeof window.chrome
}

var browser: typeof window.chrome

var BROWSER = 'firefox' | 'chrome' | 'opera' | 'edge'
var INTERFACE = 'popup' | 'sidebar' | 'devtools'
