const topEl = document.querySelector("#topbar")
const mainEl = document.querySelector("#main")
const stringsEl = document.querySelector("#strings")
const stringsInputEl = document.querySelector("#addString textarea")
const stringsButtonEl = document.querySelector("#addString button")
const powerEl = document.querySelector('#power')

const settingsEl = document.querySelector("#settings")
const ipInput = settingsEl.querySelector("#address")

const chatEl = document.querySelector("#chatbox")
const chatInputEl = chatEl.querySelector("textarea")

let settings = {
	enabled: true,
	address: "",
	prefixes: {
		time: "",
		bpm: "",
		music: "",
		random: ""
	},
	suffixes: {
		time: "",
		bpm: "",
		music: "",
		random: ""
	},
	toggles: {
		time: true,
		bpm: true,
		music: true,
		random: true
	},
	randomiseStrings: false,
	standaloneTimeout: 15
}

function processMessage(event) {
	const { id, data } = JSON.parse(event.data)

	if (id !== "server") return

	const { options, strings } = data
	settings = options
	optionsUpdated()
	validateIpInput()
	strings.forEach(string => makeStringEl(string))

	mainEl.classList.toggle('hidden', false)
	settingsEl.classList.toggle('hidden', true)
	document.querySelector("#loading").classList.toggle('hidden', true)
}


// Validate IP adress on input
ipInput.addEventListener("blur", validateIpInput)

function validateIpInput() {
	const ip = ipInput.value.trim()
	if (!/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip)) {
		alert("Invalid IP address!")
		ipInput.style.borderColor = "red"
	} else {
		ipInput.style.borderColor = ""
	}
}


function optionsUpdated() {
	powerEl.classList.toggle('enabled', settings.enabled)

	document.querySelectorAll("#panel button").forEach(button => {
		button.classList.toggle('enabled', settings.toggles[button.innerText.toLowerCase()])
	})

	settingsEl.querySelector("#address").value = settings.address

	settingsEl.querySelector("#randomise").checked = settings.randomiseStrings
	settingsEl.querySelector("#standaloneTimeout").value = settings.standaloneTimeout
	settingsEl.querySelector("#timeout").innerText = settings.standaloneTimeout + "sec"

	Object.entries(settings.prefixes).forEach(([key, value]) =>
		settingsEl.querySelector(`#${key} #pref`).value = value
	)
	Object.entries(settings.suffixes).forEach(([key, value]) =>
		settingsEl.querySelector(`#${key} #suff`).value = value
	)
}

function makeStringEl(string) {
	const p = document.createElement('p')

	p.innerText = string

	const editSpan = document.createElement('span')
	editSpan.className = 'edit'
	editSpan.onclick = () => editString(string)
	p.appendChild(editSpan)

	const removeSpan = document.createElement('span')
	removeSpan.className = 'delete'
	removeSpan.onclick = () => removeString(string)
	p.appendChild(removeSpan)

	stringsEl.appendChild(p)
}


stringsButtonEl.onclick = addString

function removeString(string) {
	send("server", { type: "removeString", string }, "controls")
	stringsEl.childNodes.forEach(el => {
		if (el.innerText == string) el.remove()
	})
}

function addString() {
	const string = stringsInputEl.value.trim()
	if (!string) return

	stringsInputEl.value = ""
	makeStringEl(string)
	send("server", { type: "addString", string }, "controls")
}

function replaceString(string) {
	removeString(string)
	addString()
}

function editString(string) {
	stringsInputEl.value = string
	stringsButtonEl.innerText = "Edit"
	stringsButtonEl.onclick = () => {
		replaceString(string)
		stringsButtonEl.innerText = "Add"
		stringsButtonEl.onclick = addString
	}
}

document.querySelectorAll("#panel button").forEach(button => {
	button.onclick = (event) => {
		const option = event.target.innerText.toLowerCase()
		send("server", { type: "toggle", option }, "controls")
		button.classList.toggle('enabled')
	}
})


powerEl.onclick = () => {
	settings.enabled = !settings.enabled
	powerEl.classList.toggle('enabled', settings.enabled)
	saveOptions()
}

document.querySelector('#saveSettings').onclick = () => {
	saveOptions()
	togglePopup('main')
}

document.querySelectorAll("img#close").forEach((el) => {
	el.onclick = () => togglePopup('main')
})

settingsEl.querySelector("#standaloneTimeout").addEventListener('input', () => {
	const val = settingsEl.querySelector("#standaloneTimeout").value
	settingsEl.querySelector("#timeout").innerText = val + "sec"
})

document.querySelector("#send").onclick = sendStandalone


chatInputEl.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault()
		sendStandalone()
	}
})



function sendStandalone() {
	send('server', chatInputEl.value.trim(), "standalone")
	chatInputEl.value = ''
}

document.querySelector("#chat").addEventListener('click', (event) => {
	event.preventDefault()
	togglePopup('chat')
})


function saveOptions() {
	settings.address = settingsEl.querySelector("#address").value

	settings.randomiseStrings = settingsEl.querySelector("#randomise").checked
	settings.standaloneTimeout = settingsEl.querySelector("#standaloneTimeout").value

	Object.keys(settings.prefixes).forEach(key =>
		settings.prefixes[key] = settingsEl.querySelector(`#${key} #pref`).value
	)
	Object.keys(settings.suffixes).forEach(key =>
		settings.suffixes[key] = settingsEl.querySelector(`#${key} #suff`).value
	)

	send("server", { type: "setOptions", options: settings }, "controls")
}

document.querySelector('#options').onclick = () => togglePopup("settings")


function togglePopup(element) {
	mainEl.classList.toggle('hidden', element != "main")
	topEl.classList.toggle('hidden', element != "main")
	settingsEl.classList.toggle('hidden', element != "settings")
	chatEl.classList.toggle('hidden', element != "chat")
	if (element == "chat")
		chatInputEl.focus()
}

setTimeout(() => send("server", { type: "getOptions" }, "controls"),
	300)