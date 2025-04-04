const { debug, log, warn, error } = console
const fs = require("fs")
const http = require("http")
const WebSocket = require("ws")
const HeartRateManager = require("./heartrateManager")

// VARS #region default
const IP = "0.0.0.0"
const PORT = 80

let clients = new Map()
const contentTypes = {
	html: 'text/html',
	css: 'text/css',
	js: 'text/javascript',
	json: 'application/json',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif'
}
const heartRateMan = new HeartRateManager(sendWS)
// #end

// INIT #region
const server = http.createServer((req, res) => {
	const url = new URL(`http://localhost${req.url}`)

	let path = url.pathname

	if (!path.includes('.') && !path.endsWith('/')) {
		res.writeHead(301, { Location: `${path}/${url.search}` })
		return res.end()
	}

	if (path == "/heartrate/history/get/")
		return res.end(heartRateMan.readHrHistory())

	if (serveFile(res, `./web${path}`)) return
	if (serveFile(res, `./webDefault${path}`)) return

	res.writeHead(404, { 'Content-Type': 'text/html' })
	return res.end(fs.readFileSync("./webDefault/404.html"))
})

const wsServ = new WebSocket.Server({ server, pingTimeout: 120000, pingInterval: 60000 })
wsServ.on("connection", (ws) => {
	ws.on("message", message => {
		const dataObj = JSON.parse(message)
		let { id, to, type, data } = dataObj

		// Ensure there's an array for this key
		if (!clients.has(id))
			clients.set(id, [])

		// Remove closed or duplicate instances of this WebSocket
		clients.set(id, clients.get(id).filter(client => client.readyState === WebSocket.OPEN && client !== ws))

		// Add the new client
		clients.get(id).push(ws)

		if (type == "keepalive") return

		heartRateMan.message(dataObj)


		if (id == "phoneclient")
			sendWS(data, ["heartrate", "text", "graph"], id, type)
		else
			sendWS(data, to, id, type)
	})

	ws.on('close', () => {
		// Remove the closed WebSocket from all entries
		for (const [id, connections] of clients.entries()) {
			clients.set(id, connections.filter(client => client !== ws))

			// Cleanup empty arrays
			if (clients.get(id).length === 0) clients.delete(id)
		}
	})

	ws.on('error', error)
})
wsServ.on('error', error)
wsServ.on('close', error)

server.listen(PORT, IP, () => log(`Server ready.`))

// #end

/** Sends data to specified client if client exists. */

function sendWS(data, to, id = "server", type = "data") {
	const send = (to) => {
		if (clients.has(to))
			clients.get(to).forEach((client) => {
				if (client.readyState === WebSocket.OPEN)
					client.send(JSON.stringify({ id, type, data, to }))
			})
	}

	if (typeof to === 'string') send(to)
	else to.forEach(target => send(target))
}


function serveFile(res, path) {
	const indexPath = path + "index.html"
	const file = fs.existsSync(indexPath) ? indexPath : fs.existsSync(path) ? path : ''

	if (!file || file.endsWith('/')) return false

	let type = contentTypes[file.split('.').slice(-1)[0]] || 'text/html'
	fs.readFile(file, (err, data) => {
		if (err) {
			res.writeHead(500, { 'Content-Type': 'text/html' })
			res.end(`Error loading file '${file}'`)
		} else {
			res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' })
			res.end(data)
		}
	})
	return true
}