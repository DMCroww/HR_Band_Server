
/** 
 * Set the Websocket Client ID bassed on the following rules:
 *  - url "http://example.com" results into ID "index"
 *  - url "http://example.com/overlay" results into ID "overlay"
 *  - url "http://example.com/overlay/chat/" results into ID "chat"
 *  - url "http://example.com/overlay/chat/index.html" results into ID "chat"
 *  - url "http://example.com/overlay/chat/streamer.html" results into ID "streamer"
 * 
 * Same IDs receive same data
 */
const id = document.location.pathname.split('/').filter((str => str != '' && str != 'index.html')).slice(-1)[0] || 'index'


/** Get the address of the server with appropriate protocol (ws/wss) */
const addr = `${document.location.protocol.replace('http', 'ws')}//${document.location.host}`

let socket

/** Initialize and connect to the WebSocket server */
function connect() {
	socket = new WebSocket(addr)
	socket.onopen = () => {
		console.log("Connected to WS.")
		send("server", true, "keepalive")
	}
	socket.onmessage = processMessage
	socket.onclose = () => {
		console.warn("Closed, reconnecting in 5s...")
		setTimeout(connect, 5000)
	}
	socket.onerror = console.error
}

function send(to, data, type = "command") {
	if (socket.readyState === 1)
		return socket.send(JSON.stringify({ id, to, type, data }))
	// If fails, try later
	setTimeout(() => { send(to, data, type) }, 200)
}

connect()