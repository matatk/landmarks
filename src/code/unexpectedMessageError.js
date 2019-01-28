import senderId from './senderId'

export default function unexpectedMessageError(message, sender) {
	const limit = 100
	let strMessage = JSON.stringify(message)
	if (strMessage.length > limit) {
		strMessage = strMessage.slice(0, limit)
		strMessage += '...'
	}
	return Error(`Unexpected message ${strMessage} from ${senderId(sender)}`)
}
