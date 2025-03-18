const rateEl = document.querySelector("#rate")
const minEl = document.querySelector("#min")
const maxEl = document.querySelector("#max")
const heartEl = document.querySelector("#heart")
const dcEl = document.querySelector("#dc")
const battImg = document.querySelector("#batt")

const maxDataPoints = 600
const heartRateData = []

let minValue
let maxValue


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


function processMessage(event) {
	let { id, type, data } = JSON.parse(event.data)
	if (id == "phoneclient") {
		if (type == "heartrate") {
			while (heartRateData.length >= maxDataPoints)
				heartRateData.shift()
			heartRateData.push(data)

			if (rateEl.innerText != data) {
				rateEl.innerText = data
				rateEl.style.color = getColor(data)
			}

			minValue = Math.min(...heartRateData)
			maxValue = Math.max(...heartRateData)

			if (minEl.innerText != minValue)
				minEl.innerText = minValue
			if (maxEl.innerText != maxValue)
				maxEl.innerText = maxValue

			heartEl.className = 'pulse'
			setTimeout(() => { heartEl.className = '' }, 600)

			dcEl.classList.toggle("show", false)
		}

		else if (type == "battery")
			battImg.classList.toggle('show', data < 10)

		else if (type == "connected")
			dcEl.classList.toggle("show", !data)

		else if (type == "log")
			data.forEach(val => heartRateData.push(val))
	}
}


setTimeout(() => {
	send("phoneclient", "heartrate", "get")
}, 1000)
