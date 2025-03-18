const { debug, log, warn, error } = console
const osc = require("osc")
const fs = require("fs")

class VRChatOsc {
	constructor() {
		/**@private */
		this.udpPort = false
		this.connected = false
		this.address = ''
	}

	startUDP(/**@type {string}*/address) {
		this.address = address
		this.stopUDP()

		this.udpPort = new osc.UDPPort({
			localAddress: "0.0.0.0",  // Bind to all available network interfaces
			localPort: 57121,         // Your local port (any available port)
			remoteAddress: address,
			remotePort: 9000
		})

		// Open the port
		this.udpPort.open()
		this.udpPort.on('open', () => this.connected = true)
		this.udpPort.on('close', () => this.connected = false)
		this.udpPort.on('error', error)
		this.udpPort.on("ready", () => this.sendChat("OSC server connected"))
	}

	stopUDP() {
		if (this.connected)
			this.udpPort.close()
	}


	sendChat(string, send = true) {
		if (!string) return
		if (!this.connected) return

		this.udpPort.send({
			address: "/chatbox/input",
			args: [
				{ type: "s", value: ` ${string}` },
				{ type: "i", value: send ? 1 : 0 }
			]
		})
	}

	/**
	 * @param {string} address
	 * @param {boolean|string|number} value
	 * @returns 
	 */
	sendOscData(address, value) {
		if (!address)
			return warn(`sendOSC() failed - Adress can't be empty!`)

		if (!this.connected) return

		let type = 's'

		if (typeof value === 'number')
			type = Number.isInteger(value) ? 'i' : 'f'

		else if (typeof value === 'boolean') {
			type = 'i'
			value = value ? 1 : 0
		}
		else if (typeof value !== 'string')
			return warn(`sendOSC() failed - Type "${typeof value}" not recognised`)


		this.udpPort.send({ address, args: [{ type, value }] })
	}

}


class HeartRateManager extends VRChatOsc {
	#options
	#heartRateHistory
	#lastSavedTs

	#heartRates
	#lastHrVal
	#songMessage

	#randomStrings
	#randomIndex
	#random
	#standaloneMessage

	constructor(wsSendFunc) {
		super()
		this.#options = require('./_data/options.json')
		if (this.#options.enabled)
			this.startUDP(this.#options.address)

		this.#heartRateHistory = []
		this.#lastSavedTs = Date.now()

		this.#heartRates = []
		this.#lastHrVal = 0
		this.#songMessage = ''

		this.#randomStrings = readRandomStrings()
		this.#randomIndex = 0
		this.#random = ''
		this.#standaloneMessage = ''

		this.heartrateStoragePath = './_data/heartrate'

		this.sendWS = wsSendFunc

		setInterval(() => this.updateVRC(), 4000)
		setInterval(() => this.getRandomString(), 60000)
		setTimeout(() => {
			this.getRandomString()
			this.updateVRC()
		}, 1000)
	}

	heartbeat(type, data) {
		if (type == "heartrate") {
			const now = Date.now()
			const lastTs = this.#heartRateHistory[this.#heartRateHistory.length - 1]?.timestamp || 0

			if (lastTs + (10 * 60 * 1000) < now)
				this.#saveHrHistory(true)

			else if (this.#lastSavedTs + (2 * 60 * 1000) < now)
				this.#saveHrHistory()


			this.#heartRateHistory.push({ timestamp: now, bpm: data })
			this.#heartRates.push(data)
		}

		if (type == "connected" && !data) {
			this.#saveHrHistory()
			this.#heartRates = []
		}
	}

	/**@private*/
	#saveHrHistory(clear = false) {
		const filename = parseTimestamp(this.#heartRateHistory[0]?.timestamp || Date.now())

		const data = averageEveryFive(this.#heartRateHistory).map((v) => `${v.timestamp} ${v.bpm}`).join('\n')

		if (!data) return

		if (!fs.existsSync(this.heartrateStoragePath))
			fs.mkdirSync(this.heartrateStoragePath, { recursive: true })

		fs.writeFileSync(`${this.heartrateStoragePath}/${filename}.log`, data)

		if (clear) this.#heartRateHistory = []
		this.#lastSavedTs = Date.now()
	}

	readHrHistory() {
		return fs.readdirSync(this.heartrateStoragePath)
			.map((file) => fs.readFileSync(`${this.heartrateStoragePath}/${file}`).toString())
			.join('\n')
	}

	message(dataObj) {
		let { id, to, type, data } = dataObj

		if (id === "phoneclient")
			return this.heartbeat(type, data)

		if (type == 'controls')
			return this.#controls(data)

		if (type == 'standalone') {
			this.#standaloneMessage = data
			this.updateVRC()

			setTimeout(() => {
				this.#standaloneMessage = ''
				this.updateVRC()
			}, 1000 * this.#options.standaloneTimeout)
			return
		}

		if (type === "mock")
			return this.sendOscData(data.address, data.value)
	}

	#controls(data) {
		// implement options
		switch (data.type) {
			case "toggle":
				this.#options.toggles[data.option] = !this.#options.toggles[data.option]
				fs.writeFileSync(`./_data/options.json`, JSON.stringify(data.options))
				break

			case "addString":
				this.#randomStrings.push(data.string.trim())
				saveRandomStrings(this.#randomStrings)
				break

			case "removeString":
				this.#randomStrings = this.#randomStrings.filter(string => string.toLowerCase() != data.string.trim().toLowerCase())
				saveRandomStrings(this.#randomStrings)
				break

			case "getOptions":
				this.sendWS({ options: this.#options, strings: this.#randomStrings }, 'vrchat')
				break

			case "setOptions":
				this.#options = data.options

				if (this.#options.enabled && !this.connected)
					this.startUDP(this.#options.address)
				else if (!this.#options.enabled && this.connected)
					this.stopUDP()

				fs.writeFileSync(`./_data/options.json`, JSON.stringify(this.#options))
				break

			default:
				break
		}
	}

	/**@private */
	updateVRC() {
		const { prefixes, suffixes, toggles } = this.#options
		const dataMap = {
			time: getTimeString(),
			bpm: this.#heartRates.length ? this.getHeartRate() : null,
			music: this.#songMessage,
			random: this.#random
		}

		const lines = Object.entries(dataMap).reduce((arr, [key, value]) => {
			if (toggles[key] && value)
				arr.push(`${prefixes[key]}${value}${suffixes[key]}`)

			return arr
		}, [])

		if (this.#standaloneMessage)
			this.sendChat(` ${this.#options.prefixes.standalone} ${this.#standaloneMessage}`)
		else if (lines.length)
			this.sendChat(` ${lines.join('\n')} `)
	}


	/**@param {SongData} data*/
	updateSong(data) {
		const title = data.track.title.length > 25 ? `${data.track.title.slice(0, 22)}...` : data.track.title
		const author = data.track.author.length > 25 ? `${data.track.author.slice(0, 22)}...` : data.track.author

		this.#songMessage = data.player.isPaused ? '' : `"${title}" by ${author}`
		this.updateVRC()
	}

	/**@private*/
	getHeartRate() {
		if (!this.#heartRates.length)
			return ''

		const sum = this.#heartRates.reduce((sum, value) => sum + value, 0)
		const value = Math.round(sum / this.#heartRates.length)

		const string = value == this.#lastHrVal
			? `${value} BPM`
			: value > this.#lastHrVal
				? `${value} BPM ▲`
				: `${value} BPM ▼`

		this.#heartRates = []
		this.#lastHrVal = value
		return string
	}

	getRandomString() {
		if (!this.#randomStrings.length)
			return this.#random = ''

		this.#randomIndex =
			this.#options.randomiseStrings
				? Math.round((this.#randomStrings.length - 1) * Math.random())
				: (this.#randomIndex + 1) % this.#randomStrings.length

		this.#random = this.#randomStrings[this.#randomIndex]
	}
}

function parseTimestamp(timestamp) {
	const date = new Date(timestamp)
	const year = date.getFullYear()
	const month = (date.getMonth() + 1).toString().padStart(2, "0")
	const day = date.getDate().toString().padStart(2, "0")

	const hour = date.getHours().toString().padStart(2, "0")
	const minute = date.getMinutes().toString().padStart(2, "0")
	const seconds = date.getSeconds().toString().padStart(2, "0")

	return `${year}-${month}-${day}_${hour}-${minute}-${seconds}`
}

function getTimeString() {
	const date = new Date()
	let hour = date.getHours()
	const minute = date.getMinutes().toString().padStart(2, "0")
	const ampm = hour >= 12 ? "pm" : "am"

	hour = hour % 12 || 12 // Convert to 12-hour format, making 0 -> 12

	return `${hour}:${minute} ${ampm}`
}

function readRandomStrings() {
	if (!fs.existsSync(`./_data/VRCstrings.txt`))
		return []

	const fileContent = fs.readFileSync(`./_data/VRCstrings.txt`).toString()

	if (!fileContent)
		return []

	return fileContent.split('\n')
}

function saveRandomStrings(strings = []) {
	fs.writeFileSync(`./_data/VRCstrings.txt`, strings.join('\n'))
}




function averageEveryFive(data) {
	let result = []

	for (let i = 0; i < data.length; i += 5) {
		let chunk = data.slice(i, i + 5)

		if (chunk.length === 0) break

		let avgTimestamp = chunk.reduce((sum, item) => sum + item.timestamp, 0) / chunk.length
		let avgBpm = chunk.reduce((sum, item) => sum + item.bpm, 0) / chunk.length

		result.push({ timestamp: Math.round(avgTimestamp / 1000), bpm: avgBpm.toFixed(1) })
	}

	return result
}

/**
 * @typedef {Object} SongData
 * @prop {Object<string,any>} player
 * @prop {Object<string,any>} track
 */



module.exports = HeartRateManager