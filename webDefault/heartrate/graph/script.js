const minEl = document.querySelector("#min")
const maxEl = document.querySelector("#max")
const heartEl = document.querySelector("#heart")
const dcEl = document.querySelector("#dc")
const canvas = document.querySelector('#heartRateGraph')
const gradientEl = document.querySelector('#gradientMask')
const gradientContEl = document.querySelector('#gradientMaskContainer')
const ctx = canvas.getContext('2d')

ctx.lineWidth = 35
ctx.strokeStyle = "#fff"
ctx.lineCap = "round"
ctx.lineJoin = "round"
const graphWidth = canvas.width
const graphHeight = canvas.height
const maxDataPoints = 300
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

	minValue = Math.min(Math.min(...heartRateData) - 2, 78)
	maxValue = Math.max(Math.max(...heartRateData) + 2, 82)

	if (minEl.innerText != minValue + 2)
		minEl.innerText = minValue + 2
	if (maxEl.innerText != maxValue - 2)
		maxEl.innerText = maxValue - 2

	ctx.clearRect(0, 0, graphWidth, graphHeight)

	// Draw data
	ctx.beginPath()

	getSmoothData(15).forEach((value, index) => {
		const x = index * (graphWidth / maxDataPoints)
		const y = graphHeight - ((value - minValue) / (maxValue - minValue)) * graphHeight
		index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
		heartPos = gContH - ((value - minValue) / (maxValue - minValue)) * gContH
	})

	ctx.stroke()


	heartEl.style.top = `${heartPos + gContPt}vh`
	heartEl.style.left = `calc(${(gContW * heartRateData.length / maxDataPoints) + gContPl}vw - ${heartH / 2}vh)`
}

function dataReceived(value) {
	heartEl.className = 'pulse'
	setTimeout(() => { heartEl.className = '' }, 800)

	drawGraph(value)
	applyCanvasMask()
}