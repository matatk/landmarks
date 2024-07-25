switch (BROWSER) {
	case 'firefox':
		break
	case 'chrome':
	case 'opera':
	case 'edge':
		// @ts-expect-error Firefox and Opera add sidebarAction (per global defns)
		window.browser = window.chrome
		break
	default:
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw Error(`Invalid browser "${BROWSER}" given.`)
}
