const rateEl = document.querySelector("#rate")
const heartEl = document.querySelector("#heart")
const dcEl = document.querySelector("#dc")
const minEl = document.querySelector("#min")
const maxEl = document.querySelector("#max")

const maxDataPoints = 600
const heartRateData = []

let minValue
let maxValue

function dataReceived(value) {
	while (heartRateData.length >= maxDataPoints)
		heartRateData.shift()
	heartRateData.push(value)

	minValue = Math.min(...heartRateData)
	maxValue = Math.max(...heartRateData)

	if (minEl.innerText != minValue)
		minEl.innerText = minValue
	if (maxEl.innerText != maxValue)
		maxEl.innerText = maxValue

	if (rateEl.innerText != value) {
		rateEl.innerText = value
		rateEl.style.color = getColor(value)
	}

	heartEl.className = 'pulse'
	setTimeout(() => { heartEl.className = '' }, 800)
}