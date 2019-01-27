export default function senderId(sender) {
	if (sender.tab) return sender.tab.id
	if (sender.url) return sender.url.slice(sender.url.lastIndexOf('/') + 1)
	return '<unknown>'
}
