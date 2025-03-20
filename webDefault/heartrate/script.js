let received = null
// #region WS stuff
const battImg = document.querySelector("img#batt")

if (typeof dataReceived !== 'function') dataReceived = () => { }

function processMessage(event) {
	let { id, type, data } = JSON.parse(event.data)
	if (id == "phoneclient") {
		if (type == "heartrate") {
			dataReceived(data)
			dcEl.classList.toggle("show", false)
		}

		else if (type == "battery")
			battImg.classList.toggle('show', data <= 10)

		else if (type == "connected") {
			console.log(Date.now().toLocaleString(), `${data ? "C" : "Disc"}onnected.`)
			dcEl.classList.toggle("show", !data)
		}

		else if (type == "log")
			data.forEach(val => heartRateData.push(val))
	}
}

function getColor(value) {
	const ratio = (value - minValue) / (maxValue - minValue)

	if (ratio <= 0.25) {
		// Light blue to green
		const t = ratio / 0.25
		return `rgb(${Math.round(0 * (1 - t) + 0 * t)}, ${Math.round(191 * (1 - t) + 255 * t)}, ${Math.round(255 * (1 - t) + 0 * t)})`
	} else if (ratio <= 0.5) {
		// Green to yellow-green
		const t = (ratio - 0.25) / 0.25
		return `rgb(${Math.round(0 * (1 - t) + 128 * t)}, ${Math.round(255 * (1 - t) + 255 * t)}, 0)`
	} else if (ratio <= 0.75) {
		// Yellow-green to orange
		const t = (ratio - 0.5) / 0.25
		return `rgb(${Math.round(128 * (1 - t) + 255 * t)}, ${Math.round(255 * (1 - t) + 128 * t)}, 0)`
	} else {
		// Orange to red
		const t = (ratio - 0.75) / 0.25
		return `rgb(${Math.round(255 * (1 - t) + 255 * t)}, ${Math.round(128 * (1 - t) + 0 * t)}, 0)`
	}
}

function getSmoothData(smFactor) {
	return heartRateData.map((_, i, arr) => {
		const range = arr.slice(Math.max(0, i - smFactor), Math.min(arr.length - 1, i) + 1)
		const avg = range.reduce((sum, p) => sum + p, 0) / range.length

		const bpm = range.reduce((sum, p) => {
			const diff = Math.abs(p - avg)
			const weight = 1 / (1 + diff * 0.1) // Adjust 0.1 to control sensitivity
			return sum + p * weight
		}, 0) / range.reduce((sum, p) => sum + (1 / (1 + Math.abs(p - avg) * 0.1)), 0)

		return bpm
	})
}


function applyCanvasMask() {
	gradientEl.style.maskImage = `url(${canvas.toDataURL()})`
	gradientEl.style.webkitMaskImage = `url(${canvas.toDataURL()})` // For Safari
}



function initFunc() {
	send("phoneclient", "heartrate", "get")
	send("phoneclient", "battery", "get")
}
