
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

const { channel, code } = document.cookie
	.split('; ')
	.reduce((cookies, cookie) => {
		const [key, value] = cookie.split('=')
		cookies[key] = decodeURIComponent(value)
		return cookies
	}, {})


if (typeof processMessage !== 'function') processMessage = () => { }
if (typeof initFunc !== 'function') initFunc = () => { }


setInterval(() => send("server", true, "keepalive"), 30000)

let socket
function connect() {
	socket = new WebSocket(addr)
	socket.onopen = () => {
		send("server", true, "new")
		initFunc()
	}
	socket.onmessage = processMessage
	socket.onclose = (reason) => {
		console.warn(reason)
		console.log("Closed, reconnecting in 5s...")
		setTimeout(connect, 5000)
	}
	socket.onerror = console.log
}

function send(to, data, type = "command") {
	if (socket.OPEN) try {
		socket.send(JSON.stringify({ id, to, type, data, channel, code }))
		return
	} catch (err) {
		console.warn(`Cant send WS message:`, err, `Retrying in 1s`)
	}
	// If fails, try later
	setTimeout(() => { send(to, data, type) }, 1000)
}

connect()