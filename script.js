import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDW5ARJrZPYLzL7Dvp4_HPPTKU2X6zTrmI",
    authDomain: "femflow-backend.firebaseapp.com",
    databaseURL: "https://femflow-backend-default-rtdb.firebaseio.com",
    projectId: "femflow-backend",
    storageBucket: "femflow-backend.firebasestorage.app",
    messagingSenderId: "1075337010614",
    appId: "1:1075337010614:web:17748e5a2c5ce59e19b517"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const username = "user123";

class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        this.terminal = new Terminal();
    }

    async connect() {
        try {
            this.terminal.log('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({
                // Add your device filters here
                filters: [
                    // Example filter - update based on your device
                    { services: ['battery_service'] }
                ]
            });

            this.terminal.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            this.terminal.log('Getting Service...');
            this.service = await this.server.getPrimaryService('battery_service');

            this.terminal.log('Getting Characteristic...');
            this.characteristic = await this.service.getCharacteristic('battery_level');

            this.isConnected = true;
            this.terminal.log('Connected successfully!');

            // Setup disconnect listener
            this.device.addEventListener('gattserverdisconnected', () => {
                this.isConnected = false;
                this.terminal.log('Device disconnected');
            });

            // Start notification listener
            await this.startNotifications();

        } catch (error) {
            this.terminal.log(`Error: ${error}`);
            throw error;
        }
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
            this.terminal.log('Disconnected from device');
        }
    }

    async startNotifications() {
        if (!this.characteristic) {
            this.terminal.log('No characteristic available');
            return;
        }

        try {
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const value = event.target.value;
                this.terminal.log(`Received value: ${value}`);
            });
            this.terminal.log('Notifications started');
        } catch (error) {
            this.terminal.log(`Error starting notifications: ${error}`);
        }
    }

    async sendCommand(command) {
        if (!this.isConnected) {
            this.terminal.log('Not connected to device');
            return;
        }

        try {
            const encoder = new TextEncoder();
            await this.characteristic.writeValue(encoder.encode(command));
            this.terminal.log(`Sent command: ${command}`);
        } catch (error) {
            this.terminal.log(`Error sending command: ${error}`);
        }
    }
}

class Terminal {
    constructor() {
        this.createTerminalUI();
        this.logs = [];
        this.maxLogs = 100; // Maximum number of logs to keep
    }

    createTerminalUI() {
        // Create terminal container
        const terminal = document.createElement('div');
        terminal.className = 'terminal';
        terminal.innerHTML = `
            <div class="terminal-header">
                <span>Device Terminal</span>
                <button id="clear-terminal">Clear</button>
            </div>
            <div class="terminal-body" id="terminal-body"></div>
            <div class="terminal-input">
                <input type="text" id="terminal-command" placeholder="Enter command...">
                <button id="send-command">Send</button>
            </div>
        `;

        // Add terminal to page
        document.body.appendChild(terminal);

        // Setup event listeners
        document.getElementById('clear-terminal').addEventListener('click', () => this.clear());
        document.getElementById('send-command').addEventListener('click', () => this.sendCommand());
        document.getElementById('terminal-command').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.logs.push(logEntry);

        // Trim logs if exceeding max length
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Update terminal display
        const terminalBody = document.getElementById('terminal-body');
        const logElement = document.createElement('div');
        logElement.className = 'terminal-log';
        logElement.textContent = logEntry;
        terminalBody.appendChild(logElement);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    clear() {
        this.logs = [];
        const terminalBody = document.getElementById('terminal-body');
        terminalBody.innerHTML = '';
    }

    async sendCommand() {
        const commandInput = document.getElementById('terminal-command');
        const command = commandInput.value.trim();
        
        if (command) {
            // Get BLE manager instance and send command
            // This would need to be connected to your BLE manager instance
            this.log(`> ${command}`);
            commandInput.value = '';
        }
    }
}

// Add CSS styles for the terminal
const style = document.createElement('style');
style.textContent = `
    .terminal {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 300px;
        background: #B2035B;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(178, 3, 91, 0.1);
        display: flex;
        flex-direction: column;
        z-index: 1000;
    }

    .terminal-header {
        padding: 10px;
        background: #394648;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #FFF9EC;
    }

    .terminal-body {
        flex-grow: 1;
        padding: 10px;
        overflow-y: auto;
        color: #FFF9EC;
        font-family: monospace;
        font-size: 14px;
    }

    .terminal-log {
        margin: 2px 0;
        word-wrap: break-word;
    }

    .terminal-input {
        display: flex;
        padding: 10px;
        background: #394648;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
    }

    .terminal-input input {
        flex-grow: 1;
        margin-right: 10px;
        padding: 5px;
        background:  #DE3A86;
        border: 1px solid #555;
        color: #FFF9EC;
        border-radius: 4px;
    }
    
    .terminal-input input::placeholder {
        color: #FFD2E5; /* Light pink placeholder to complement the input's background */
        opacity: 1; /* Ensures the placeholder text is fully opaque */
    }

    .terminal-input button,
    .terminal-header button {
        padding: 5px 10px;
        background: #DE3A86;
        color: #FFF9EC;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .terminal-input button:hover,
    .terminal-header button:hover {
        background: #F9C1E6;
    }
`;
document.head.appendChild(style);

// Initialize BLE manager and connect it to your Calendar class
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        this.weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        this.readingsData = {};
        this.activePopup = null;
        
        this.setupEventListeners();
        this.initializeFirebase();
        this.bleManager = new BLEManager();
        this.setupBLEControls();
    }

    setupBLEControls() {
        // Create BLE control buttons
        const bleControls = document.createElement('div');
        bleControls.className = 'ble-controls';
        bleControls.innerHTML = `
            <button id="connect-ble">Connect Device</button>
            <button id="disconnect-ble">Disconnect</button>
        `;
        
        // Add controls to the card header
        document.querySelector('.header-content').appendChild(bleControls);

        // Setup event listeners
        document.getElementById('connect-ble').addEventListener('click', async () => {
            try {
                await this.bleManager.connect();
            } catch (error) {
                console.error('Connection failed:', error);
            }
        });

        document.getElementById('disconnect-ble').addEventListener('click', async () => {
            await this.bleManager.disconnect();
        });
    }
    
    initializeFirebase() {
        const userRef = ref(database, `users/${username}`);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                this.readingsData = snapshot.val();
                this.render();
            } else {
                console.log("No data available");
                this.readingsData = {};
                this.render();
            }
        });
    }

    async addReading(date, readingValue) {
        const readingKey = `reading_${Date.now()}`; // Generate a unique key
        const readingRef = ref(database, `users/${username}/${date}/${readingKey}`);
        const data = {
            reading: readingValue,
            timestamp: Date.now()
        };
        try {
            await set(readingRef, data);
            console.log(`Data added to ${readingRef.toString()}:`, data);
        } catch (error) {
            console.error("Error adding data:", error);
        }
    }


    getDailyReadings(date) {
        const dateStr = this.formatDate(date);
        const readings = [];

        if (this.readingsData[dateStr]) {
            Object.entries(this.readingsData[dateStr]).forEach(([readingId, readingData]) => {
                if (readingData.reading && readingData.timestamp) {
                    readings.push({
                        id: readingId,
                        reading: readingData.reading,
                        timestamp: readingData.timestamp
                    });
                }
            });
        }

        return readings;
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    setupEventListeners() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.navigateMonth(-1);
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.navigateMonth(1);
        });

        document.getElementById('add-button').addEventListener('click', async () => {
            const date = document.getElementById('date-input').value;
            const readingValue = parseFloat(document.getElementById('reading-value-input').value);

            if (date && !isNaN(readingValue)) {
                await this.addReading(date, readingValue);
            } else {
                alert("Please fill out all fields correctly.");
            }
        });
    }

    navigateMonth(direction) {
        this.currentDate = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth() + direction,
            1
        );
        this.render();
    }

    createPopup(content) {
        this.closeActivePopup();

        const popup = document.createElement('div');
        popup.className = 'readings-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <button class="close-popup">&times;</button>
                <div class="popup-body">${content}</div>
            </div>
        `;

        popup.querySelector('.close-popup').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeActivePopup();
        });

        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                this.closeActivePopup();
            }
        });

        this.activePopup = popup;
        document.body.appendChild(popup);
    }

    closeActivePopup() {
        if (this.activePopup) {
            this.activePopup.remove();
            this.activePopup = null;
        }
    }

    render() {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';

        document.getElementById('currentMonthYear').textContent = 
            `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        this.weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'weekday';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });

        const firstDay = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth(),
            1
        );
        const startingDayIndex = firstDay.getDay();

        for (let i = 0; i < startingDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }

        const daysInMonth = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth() + 1,
            0
        ).getDate();

        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(
                this.currentDate.getFullYear(),
                this.currentDate.getMonth(),
                day
            );
            
            const isToday = date.toDateString() === today.toDateString();
            const readings = this.getDailyReadings(date);

            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day${isToday ? ' today' : ''}`;

            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';

            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;

            dayHeader.appendChild(dayNumber);

            if (readings.length > 0) {
                const readingValue = document.createElement('span');
                readingValue.className = 'reading-value';
                readingValue.textContent = readings.length; // Show number of readings
                
                // Create popup content showing chronological readings
                const popupContent = readings.map((reading, index) => {
                    const time = new Date(reading.timestamp).toLocaleTimeString();
                    const formattedReading = reading.reading.toFixed(1);
                    
                    return `<div class="reading-entry">
                        <strong>${time}:</strong> ${formattedReading}
                    </div>`;
                }).join('');

                readingValue.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.createPopup(popupContent);
                });

                dayHeader.appendChild(readingValue);
            }

            dayElement.appendChild(dayHeader);
            calendar.appendChild(dayElement);
        }
    }
}

// Initialize calendar when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Calendar();
});

