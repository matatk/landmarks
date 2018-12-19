export default function JsonToHtml(doc, containerId) {
	function walk(docRoot, jsonRoot) {
		for (const object of jsonRoot) {
			if (object.text) {
				docRoot.appendChild(doc.createTextNode(object.text))
			} else {
				const element = doc.createElement(object.element.toUpperCase())
				for (const attr in object.attributes) {
					element.setAttribute(attr, object.attributes[attr])
				}
				docRoot.appendChild(element)
				if (object.contains) {
					walk(element, object.contains)
				}
			}
		}
	}

	// Public API

	this.makeHtml = function(json) {
		walk(doc.getElementById(containerId), json)
	}
}
