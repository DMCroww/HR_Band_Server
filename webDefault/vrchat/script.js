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


const ipRegex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

let settings

function processMessage(event) {
	const { id, data } = JSON.parse(event.data)

	if (id !== "server") return

	const { options, strings } = data
	settings = options
	optionsUpdated()
	validateIpInput()

	stringsEl.innerHTML = ''

	strings.forEach(string => makeStringEl(string))

	mainEl.classList.toggle('hidden', false)
	settingsEl.classList.toggle('hidden', true)
	document.querySelector("#loading").classList.toggle('hidden', true)
}

function initFunc() { send("server", true, "getOptions") }

function togglePopup(element) {
	mainEl.classList.toggle('hidden', element != "main")
	settingsEl.classList.toggle('hidden', element != "settings")
	chatEl.classList.toggle('hidden', element != "chat")
}

// Validate IP adress on input
ipInput.addEventListener("blur", validateIpInput)

function validateIpInput() {
	const ip = ipInput.value.trim()

	ipInput.style.borderColor = !ipRegex.test(ip) ? "red" : ""
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

	const editImg = document.createElement('img')
	editImg.src = 'assets/edit.png'
	editImg.onclick = () => editString(string)
	p.appendChild(editImg)

	const deleteImg = document.createElement('img')
	deleteImg.src = 'assets/delete.png'
	deleteImg.onclick = () => removeString(string)
	p.appendChild(deleteImg)

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

document.querySelector("#chat").onclick = () => togglePopup('chat')
document.querySelector('#options').onclick = () => togglePopup("settings")
document.querySelectorAll("img#close")
	.forEach(el => el.onclick = () => togglePopup('main'))
document.querySelector('#saveSettings').onclick = () => {
	saveOptions()
	togglePopup('main')
}
document.querySelector('#sendMock').onclick = () => {
	const address = document.querySelector('#mockAddress').value.trim()
	let value = document.querySelector('#mockValue').value.trim()

	if (value == 'true') value = true
	if (value == 'false') value = false

	if (isNaN(parseFloat(value))) value = parseFloat(value)

	if (address != '' && value != '')
		send("server", { address, value }, "mock")
}


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