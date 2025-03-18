const rateEl = document.querySelector("#rate")
const minEl = document.querySelector("#min")
const maxEl = document.querySelector("#max")
const heartEl = document.querySelector("#heart")
const dcEl = document.querySelector("#dc")
const battImg = document.querySelector("#batt")
const canvas = document.querySelector('#heartRateGraph')
const gradientEl = document.querySelector('#gradientMask')
const gradientContEl = document.querySelector('#gradientMaskContainer')
const ctx = canvas.getContext('2d')

ctx.lineWidth = 30
ctx.strokeStyle = "#fff"
ctx.lineCap = "round"
ctx.lineJoin = "round"
const graphWidth = canvas.width
const graphHeight = canvas.height
const maxDataPoints = 180
const heartRateData = []

let minValue
let maxValue
let heartPos

const heartH = 15
const gContW = 95
const gContH = 70
const gContPt = (100 - gContH) / 2
const gContPl = (100 - gContW)

gradientContEl.style.top = `${gContPt}vh`
gradientContEl.style.left = `calc(${gContPl}vw - ${heartH / 2}vh)`
gradientContEl.style.height = `${gContH}vh`
gradientContEl.style.width = `${gContW}vw`
heartEl.style.height = `${heartH}vh`

function drawGraph(value) {
	while (heartRateData.length >= maxDataPoints)
		heartRateData.shift()
	heartRateData.push(value)

	minValue = Math.min(Math.min(...heartRateData) - 2, 73)
	maxValue = Math.max(Math.max(...heartRateData) + 2, 87)

	if (minEl.innerText != minValue + 2)
		minEl.innerText = minValue + 2
	if (maxEl.innerText != maxValue - 2)
		maxEl.innerText = maxValue - 2

	const smoothedData = heartRateData.map((_, i, arr) => {
		const range = arr.slice(Math.max(0, i - 3), Math.min(arr.length, i + 3))
		return [range.reduce((sum, p) => sum + p, 0) / range.length]
	})

	// Draw data
	ctx.clearRect(0, 0, graphWidth, graphHeight)
	ctx.beginPath()
	smoothedData.forEach((value, index) => {
		const x = index * (graphWidth / maxDataPoints)
		const y = graphHeight - ((value - minValue) / (maxValue - minValue)) * graphHeight
		index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
		heartPos = gContH - ((value - minValue) / (maxValue - minValue)) * gContH
	})

	ctx.stroke()

	heartEl.style.top = `${heartPos + gContPt}vh`
	heartEl.style.left = `calc(${(gContW * heartRateData.length / maxDataPoints) + gContPl}vw - ${heartH / 2}vh)`
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


function applyCanvasMask() {
	gradientEl.style.maskImage = `url(${canvas.toDataURL()})`
	gradientEl.style.webkitMaskImage = `url(${canvas.toDataURL()})` // For Safari
}




function processMessage(event) {
	let { id, type, data } = JSON.parse(event.data)
	if (id == "phoneclient") {
		if (type == "heartrate") {
			if (rateEl.innerText != data) {
				rateEl.innerText = data
				rateEl.style.color = getColor(data)
			}

			heartEl.className = 'pulse'
			setTimeout(() => { heartEl.className = '' }, 600)

			drawGraph(data)
			applyCanvasMask()
			dcEl.classList.toggle("show", false)
		}

		else if (type == "battery")
			battImg.classList.toggle('show', data < 10)

		else if (type == "connected")
			dcEl.classList.toggle("show", !data)

		else if (type == "log") {
			console.log(data)
			data.forEach(val => heartRateData.push(val))
		}
	}
}


setTimeout(() => {
	send("phoneclient", "heartrate", "get")
}, 1000)
