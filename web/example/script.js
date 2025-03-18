// Send data to 'example2' page on a button click
document.querySelector('#sendButton').onclick = () => {
	const to = "example2"
	const data = "Test data as string"
	const type = "test"
	send(to, data, type)
}

function processMessage(event) {
	const receivedDataObject = JSON.parse(event.data)

	console.log(receivedDataObject)


}