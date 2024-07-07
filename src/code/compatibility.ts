switch (BROWSER) {
	case 'firefox':
		break
	case 'chrome':
	case 'opera':
	case 'edge':
			// @ts-ignore FIXME
		window.browser = window.chrome
		break
	default:
		throw Error(`Invalid browser "${BROWSER}" given.`)
}
