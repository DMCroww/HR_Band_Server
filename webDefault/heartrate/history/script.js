const textEl = document.querySelector("#text")
const rateEl = document.querySelector("#rate")
const rangeEl = document.querySelector("#range")
const canvas = document.querySelector("#heartRateGraph")
const gradientEl = document.querySelector('#gradientMask')
const ctx = canvas.getContext("2d")

const graphWidth = canvas.width
const graphHeight = canvas.height

let heartRateData = []
let groupedRanges = []
let timeChunks = []
let currentGroupIndex = 0
let currentChunkIndex = 0

const storage = window.localStorage.getItem('settings')
let { chunkDuration, moveInterval, smFactor } = storage
	? JSON.parse(storage)
	: { chunkDuration: 60, moveInterval: 5, smFactor: 15 }

const gapThreshold = 30 * 60 * 1000

ctx.lineWidth = 3
ctx.strokeStyle = "#fff"
ctx.lineCap = "round"
ctx.lineJoin = "round"


fetch("/heartrate/history/get").then((data) => data.text())
	.then((string) => {
		heartRateData = string
			.trim().split("\n")
			.map((line) => {
				const [ts, bpm] = line.split(" ").map(Number)
				return { timestamp: ts < 10000000000 ? ts * 1000 : ts, bpm }
			})

		groupDataByRange()
		createRangeSelection()
		updateChunks()
		makeButtons()
		updateGraph()
	})
	.catch(console.error)


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
	// let endTs = selectedGroup[selectedGroup - 1].timestamp

	while (start < selectedGroup[selectedGroup.length - 1].timestamp) {
		const end = Math.min(start + chunkDur, selectedGroup[selectedGroup.length - 1].timestamp)
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

	const stepButtons = document.querySelectorAll("#stepButtons button")
	const smButtons = document.querySelectorAll("#smButtons button")

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
		if (chunkDuration < 60 * 24) {
			chunkDuration = chunkDuration >= 120 ? chunkDuration + 60
				: chunkDuration >= 60 ? chunkDuration + 15
					: chunkDuration + 5

			console.log("zoom:", chunkDuration)

			updateOptionsText()
			updateChunks()
			updateGraph()
			saveSettings()
		}
	}
	zoomButtons[1].onclick = () => {
		if (chunkDuration > 60) {
			chunkDuration = chunkDuration > 120 ? chunkDuration - 60
				: chunkDuration > 60 ? chunkDuration - 15
					: chunkDuration - 5

			console.log("zoom:", chunkDuration)

			updateOptionsText()
			updateChunks()
			updateGraph()
			saveSettings()
		}
	}


	stepButtons[0].onclick = () => {
		if (moveInterval > 1) {
			moveInterval = moveInterval > 120
				? moveInterval - 60
				: moveInterval > 60
					? moveInterval - 15
					: moveInterval > 10
						? moveInterval - 5
						: moveInterval - 1

			updateOptionsText()
			updateChunks()
			saveSettings()
		}
	}
	stepButtons[1].onclick = () => {
		if (moveInterval < 60 * 6) {
			moveInterval = moveInterval >= 120
				? moveInterval + 60
				: moveInterval >= 60
					? moveInterval + 15
					: moveInterval >= 10
						? moveInterval + 5
						: moveInterval + 1

			updateOptionsText()
			updateChunks()
			saveSettings()
		}
	}


	smButtons[0].onclick = () => {
		if (smFactor > 0) {
			smFactor = smFactor > 60
				? smFactor - 30
				: smFactor > 6
					? smFactor - 6
					: smFactor - 1

			updateOptionsText()
			console.log("SM fac:", smFactor)
			updateGraph()
			saveSettings()
		}
	}
	smButtons[1].onclick = () => {
		if (smFactor < 360) {
			smFactor = smFactor >= 60
				? smFactor + 30
				: smFactor >= 6
					? smFactor + 6
					: smFactor + 1


			updateOptionsText()
			console.log("SM fac:", smFactor)
			updateGraph()
			saveSettings()
		}
	}
	updateOptionsText()

}

function updateOptionsText() {
	const zoomText = document.querySelector("#zoomButtons span")
	const stepText = document.querySelector("#stepButtons span")
	const smText = document.querySelector("#smButtons span")

	let smFac = smFactor * 2

	smText.innerText = smFac == 720 ? '~1hr' : smFac < 1 ? '~5sec' : smFac < 12 ? `~${smFac * 5}sec` : `~${(smFac * 5 / 60).toFixed(2)}min`

	stepText.innerText = moveInterval < 60 ? `Step: ${moveInterval}min` : `Step: ${(moveInterval / 60).toFixed(2)}h`

	zoomText.innerText = chunkDuration < 60 ? `Zoom: ${chunkDuration}min` : `Zoom: ${(chunkDuration / 60).toFixed(2)}h`
}

function saveSettings() {
	const settings = {
		moveInterval,
		chunkDuration,
		smFactor
	}
	window.localStorage.setItem("settings", JSON.stringify(settings))
}

function updateGraph() {
	ctx.clearRect(0, 0, graphWidth, graphHeight)
	if (timeChunks.length === 0) return

	const selectedRange = timeChunks[currentChunkIndex]
	rangeEl.innerText = `${new Date(selectedRange.start).toLocaleTimeString()} - ${new Date(selectedRange.end).toLocaleTimeString()}`

	const filteredData = groupedRanges[currentGroupIndex]
		.filter((d) => d.timestamp >= selectedRange.start && d.timestamp <= selectedRange.end)

	if (filteredData.length === 0) return

	const smoothedData = filteredData.map((_, i, arr) => {
		const range = arr.slice(Math.max(0, i - smFactor), Math.min(arr.length - 1, i + smFactor) + 1)
		const avg = range.reduce((sum, p) => sum + p.bpm, 0) / range.length

		const bpm = range.reduce((sum, p) => {
			const diff = Math.abs(p.bpm - avg)
			const weight = 1 / (1 + diff * 0.05) // Lowering factor smooths minor jumps
			return sum + p.bpm * weight
		}, 0) / range.reduce((sum, p) => sum + (1 / (1 + Math.abs(p.bpm - avg) * 0.05)), 0)

		return { timestamp: arr[i].timestamp, bpm: parseFloat(bpm.toFixed(2)) } // Keep decimals for smooth rendering
	})






	//// Value lines and text

	const minValue = Math.min(...filteredData.map((d) => d.bpm))
	const maxValue = Math.max(...filteredData.map((d) => d.bpm))
	const valueDelta = maxValue - minValue
	const valueStep = valueDelta / 6

	textEl.innerHTML = ''
	for (let idx = 0; idx < 7; idx++) {
		const value = (minValue + (valueStep * idx)).toFixed(2)
		const el = document.createElement('p')
		el.innerText = value
		el.style.color = getColor(value, minValue, maxValue)
		textEl.appendChild(el)
	}

	const minValueGraph = Math.min(...smoothedData.map((d) => d.bpm)) - .1
	const maxValueGraph = Math.max(...smoothedData.map((d) => d.bpm)) + .1
	const graphDelta = maxValueGraph - minValueGraph

	// const graphStep = graphDelta / 6
	// for (let idx = 0; idx < 7; idx++) {
	// 	const y = graphHeight - (((minValueGraph + graphStep * idx) - minValueGraph) / graphDelta) * graphHeight
	// 	ctx.beginPath()
	// 	ctx.moveTo(0, y)
	// 	ctx.lineTo(graphWidth, y)
	// 	ctx.stroke()
	// 	ctx.closePath()
	// }

	ctx.beginPath()

	smoothedData.forEach((point, index) => {
		const x = ((point.timestamp - selectedRange.start) / (selectedRange.end - selectedRange.start)) * graphWidth
		const y = graphHeight - ((point.bpm - minValueGraph) / graphDelta) * graphHeight
		index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
	})

	ctx.stroke()

	gradientEl.style.maskImage = `url(${canvas.toDataURL()})`
	gradientEl.style.webkitMaskImage = `url(${canvas.toDataURL()})` // For Safari
}




function getColor(value, minValue, maxValue) {
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
