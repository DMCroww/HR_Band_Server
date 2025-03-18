const minEl = document.querySelector("#min")
const maxEl = document.querySelector("#max")
const rateEl = document.querySelector("#rate")
const rangeEl = document.querySelector("#range")
const canvas = document.querySelector("#heartRateGraph")
const ctx = canvas.getContext("2d")
const graphWidth = canvas.width
const graphHeight = canvas.height
let heartRateData = []
let groupedRanges = []
let timeChunks = []
let currentGroupIndex = 0
let currentChunkIndex = 0



let chunkDuration = 60
let moveInterval = 5
const gapThreshold = 10 * 60 * 1000



ctx.lineWidth = 3
ctx.strokeStyle = "#fff"
ctx.lineCap = "round"
ctx.lineJoin = "round"



fetch("/heartrate/history/get").then((data) => data.text()).then((string) => {
	heartRateData = string.trim().split("\n")
		.map((line) => {
			const [timestamp, bpm] = line.split(" ").map(Number)
			return { timestamp, bpm }
		})
	groupDataByRange()
	createRangeSelection()
	updateChunks()
	makeButtons()
	updateGraph()
}).catch(console.error)

function groupDataByRange() {
	groupedRanges = []
	let lastTimestamp = heartRateData[0].timestamp
	let currentGroup = []

	heartRateData.forEach((entry) => {
		if (entry.timestamp - lastTimestamp > gapThreshold) {
			if (currentGroup.length > 0) groupedRanges.push([...currentGroup])
			currentGroup = []
		}
		currentGroup.push(entry)
		lastTimestamp = entry.timestamp
	})
	if (currentGroup.length > 0) groupedRanges.push([...currentGroup])
}

function updateChunks() {
	timeChunks = []
	if (groupedRanges.length === 0) return

	const selectedGroup = groupedRanges[currentGroupIndex]
	const chunkDur = chunkDuration * 60 * 1000
	const overlap = moveInterval * 60 * 1000
	let start = selectedGroup[0].timestamp

	while (start < selectedGroup[selectedGroup.length - 1].timestamp) {
		const end = start + chunkDur
		timeChunks.push({ start, end })
		start += overlap
	}

	currentChunkIndex = Math.max(0, timeChunks.length - (chunkDuration / moveInterval) - 1)
}

function createRangeSelection() {
	const rangeSelect = document.querySelector("#rangeSelect")
	rangeSelect.innerHTML = ""

	groupedRanges.forEach((group, index) => {
		const option = document.createElement("option")
		option.value = index
		const startDate = new Date(group[0].timestamp)
		const endDate = new Date(group[group.length - 1].timestamp)

		const startDateString = `${startDate.getDate()}. ${startDate.getMonth() + 1}.`
		const startTimeString = `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}:${startDate.getSeconds().toString().padStart(2, "0")}`

		const endDateString = `${endDate.getDate()}. ${endDate.getMonth() + 1}.`
		const endTimeString = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}:${endDate.getSeconds().toString().padStart(2, "0")}`

		option.innerText = `${startDateString} ${startTimeString} - ${endDateString} ${endTimeString}`

		rangeSelect.appendChild(option)
	})
	currentGroupIndex = groupedRanges.length - 1

	rangeSelect.onchange = (e) => {
		currentGroupIndex = Number(e.target.value)
		updateChunks()
		updateGraph()
	}
}

function makeButtons() {
	const navButtons = document.querySelectorAll("#navButtons button")
	const zoomButtons = document.querySelectorAll("#zoomButtons button")
	const zoomText = document.querySelector("#zoomButtons span")
	const stepButtons = document.querySelectorAll("#stepButtons button")
	const stepText = document.querySelector("#stepButtons span")

	navButtons[0].onclick = () => {
		if (currentChunkIndex > 0) {
			currentChunkIndex--
			updateGraph()
		}
	}

	navButtons[1].onclick = () => {
		if (currentChunkIndex < timeChunks.length - (chunkDuration / moveInterval) - 1) {
			currentChunkIndex++
			updateGraph()
		}
	}


	zoomButtons[0].onclick = () => {
		if (chunkDuration > 5) {
			chunkDuration = chunkDuration > 120 ? chunkDuration - 60
				: chunkDuration > 60 ? chunkDuration - 15
					: chunkDuration > 15 ? chunkDuration - 5
						: chunkDuration - 1

			updateChunks()
			updateGraph()
			zoomText.innerText = chunkDuration < 60 ? `Zoom: ${chunkDuration}min` : `Zoom: ${(chunkDuration / 60).toFixed(2)}h`
		}
	}

	zoomButtons[1].onclick = () => {
		if (chunkDuration < 60 * 12) {
			chunkDuration = chunkDuration >= 120 ? chunkDuration + 60
				: chunkDuration >= 60 ? chunkDuration + 15
					: chunkDuration >= 15 ? chunkDuration + 5
						: chunkDuration + 1

			updateChunks()
			updateGraph()
			zoomText.innerText = chunkDuration < 60 ? `Zoom: ${chunkDuration}min` : `Zoom: ${(chunkDuration / 60).toFixed(2)}h`
		}
	}
	zoomText.innerText = chunkDuration < 60 ? `Zoom: ${chunkDuration}min` : `Zoom: ${(chunkDuration / 60).toFixed(2)}h`


	stepButtons[0].onclick = () => {
		if (moveInterval > 0.25) {
			moveInterval = moveInterval > 120 ? moveInterval - 60
				: moveInterval > 60 ? moveInterval - 15
					: moveInterval > 10 ? moveInterval - 5
						: moveInterval > 1 ? moveInterval - 1
							: moveInterval - .25

			stepText.innerText = moveInterval < 60 ? `Step: ${moveInterval}min` : `Step: ${(moveInterval / 60).toFixed(2)}h`
			updateChunks()
			updateGraph()
		}
	}

	stepButtons[1].onclick = () => {
		if (moveInterval < 60 * 24) {
			moveInterval = moveInterval >= 120 ? moveInterval + 60
				: moveInterval >= 60 ? moveInterval + 15
					: moveInterval >= 10 ? moveInterval + 5
						: moveInterval >= 1 ? moveInterval + 1
							: moveInterval + .25

			stepText.innerText = moveInterval < 60 ? `Step: ${moveInterval}min` : `Step: ${(moveInterval / 60).toFixed(2)}h`
			updateChunks()
			updateGraph()
		}
	}
	stepText.innerText = moveInterval < 60 ? `Step: ${moveInterval}min` : `Step: ${(moveInterval / 60).toFixed(2)}h`
}

function updateGraph() {
	ctx.clearRect(0, 0, graphWidth, graphHeight)
	if (timeChunks.length === 0) return

	const selectedRange = timeChunks[currentChunkIndex]
	rangeEl.innerText = `${new Date(selectedRange.start).toLocaleTimeString()} - ${new Date(selectedRange.end).toLocaleTimeString()}`

	const filteredData = groupedRanges[currentGroupIndex].filter(
		(d) => d.timestamp >= selectedRange.start && d.timestamp <= selectedRange.end
	)

	if (filteredData.length === 0) return

	const minValue = Math.min(...filteredData.map((d) => d.bpm))
	const maxValue = Math.max(...filteredData.map((d) => d.bpm))
	const avgValue =
		filteredData.reduce((sum, d) => sum + d.bpm, 0) / filteredData.length

	minEl.innerText = `Min: ${minValue}`
	maxEl.innerText = `Max: ${maxValue}`
	rateEl.innerText = `Avg: ${avgValue.toFixed(1)}`

	const smoothedData = filteredData.map((_, i, arr) => {
		const range = arr.slice(Math.max(0, i - 30), Math.min(arr.length, i + 31))
		return { timestamp: arr[i].timestamp, bpm: range.reduce((sum, p) => sum + p.bpm, 0) / range.length }
	})

	ctx.beginPath()
	smoothedData.forEach((point, index) => {
		const x = ((point.timestamp - selectedRange.start) / (selectedRange.end - selectedRange.start)) * graphWidth
		const y = graphHeight - ((point.bpm - minValue) / (maxValue - minValue)) * graphHeight
		index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
	})
	ctx.stroke()
	applyCanvasMask()

}

const gradientEl = document.querySelector('#gradientMask')

function applyCanvasMask() {
	gradientEl.style.maskImage = `url(${canvas.toDataURL()})`
	gradientEl.style.webkitMaskImage = `url(${canvas.toDataURL()})` // For Safari
}
