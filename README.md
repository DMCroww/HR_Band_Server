# HR Band Server

Welcome to the **HR Band Server** – a custom low-effort server with a web interface that does a lot more than you might expect. 

This project connects to a separate Android app called 'HR Band' via WebSocket to send real-time data.

## About

This webserver provides a WebSocket connection for the 'HR Band' Android app to transmit live heart rate data. Integrates with VRChat by sending OSC messages to the in-game chatbox. The control panel lets you choose from several options.

## Features

- **WebSocket Connection:** Provides connection for the 'HR Band' Android app to receive real-time data, storing it localy.
- **OSC Integration:** Sends OSC messages to VRChat using the in-game chatbox with the following options:
  - **Time:** 
    - Current local time of the server.
	 - "am/pm" formatting
  - **BPM:** 
    - Live data received from HR Band app
	 - Filtered to average last ~3s
  - **Music:** ***(WIP)***
    - Currently playing song
	 - So far, working only with private YTM App
	 - *Will probably require either local script on the PC playing the music or direct connection to Spotify*
  - **Random thought:**
	 - Easily editable list of messages through the interface
    - Selects one string from the list every minute and shows it at the end of chatbox
	 - Two options - 'randomised' or 'sequential'
- **OSC Control Panel:** 
  - Manage random thoughts (add/remove)
  - Enable or disable individual OSC options
  - Includes a chatbox for uninterrupted messaging
- **Overlays for OBS:** 
  - **Root Overlay** (`/heartrate`): Shows ~3m graph history and text with current heartrate value
  - **Graph View** (`/heartrate/graph`): Displays only the graph portion
  - **Text Overlay** (`/heartrate/text`): Shows live plain text data with min/max values
  - **Live Data:** All overlays update in real time, and you can also access a general live view at '/heartrate'
- **History Page** (`/heartrate/history`) Scroll through logged heart rates

## Prerequisites

- **Android App:** The server works in tandem with the 'HR Band' Android app. Download the latest release here: [HR Band App Releases](https://github.com/DMCroww/HR_Band_App/releases)

## Installation

1. **Clone the repo:**
   ```
	git clone https://github.com/DMCroww/HR_Band_Server.git
	cd HR_Band_Server
	```

2. **Install dependencies:**
   ```
	npm install
	```

3. **Run the Server:**
   ```
	npm start
	```

## Usage

- **Android App Connection:** Launch the 'HR Band' app, connect your heartrate device, and let it run in the background.
- **VRChat Controls:** Visit `/vrchat` to access the OSC control panel for setting your options and sending messages to your in-game chatbox.
- **Heartrate Overlays & Pages:**  
  - For OBS overlays, just select which format you like, and make it into a new 'Browser page'. *(multiple connections are handled properly, no need to only use one style)*

## Customisation

Web pages are fully customiseable, adding your own overlays and pages is fully explained [here](CUSTOMISE.md)

## Contributing

Got ideas for a new feature or a quirky improvement? Create a feature request.

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE. Feel free to remix, reuse, and rock on—as long as you give credit where it's due.

## Contact

For questions, suggestions, or bugs, open an issue or reach out to Bea on Discord or Twitter (X) under **@DMCroww** on both.