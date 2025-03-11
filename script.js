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

class SerialMonitor {
    constructor(socketUrl) {
        this.socket = new WebSocket(socketUrl);
        this.createMonitorUI();
        this.logs = [];
        this.maxLogs = 100;

        this.socket.onopen = () => this.log("Connected to Serial Device");
        this.socket.onmessage = (event) => this.log(event.data);
        this.socket.onerror = (error) => this.log(`WebSocket Error: ${error.message}`);
        this.socket.onclose = () => this.log("Disconnected from Serial Device");
    }

    createMonitorUI() {
        // Create serial monitor container
        const monitor = document.createElement('div');
        monitor.className = 'serial-monitor';
        monitor.innerHTML = `
            <div class="monitor-header">
                <span>Serial Monitor</span>
                <button id="clear-monitor">Clear</button>
            </div>
            <div class="monitor-body" id="monitor-body"></div>
            <div class="monitor-input">
                <input type="text" id="monitor-command" placeholder="Type command...">
                <button id="send-monitor-command">Send</button>
            </div>
        `;

        // Add monitor to page
        document.body.appendChild(monitor);

        // Event listeners
        document.getElementById('clear-monitor').addEventListener('click', () => this.clear());
        document.getElementById('send-monitor-command').addEventListener('click', () => this.sendCommand());
        document.getElementById('monitor-command').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.logs.push(logEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs.shift(); // Remove old logs
        }

        const monitorBody = document.getElementById('monitor-body');
        const logElement = document.createElement('div');
        logElement.className = 'monitor-log';
        logElement.textContent = logEntry;
        monitorBody.appendChild(logElement);
        monitorBody.scrollTop = monitorBody.scrollHeight; // Auto-scroll
    }

    clear() {
        this.logs = [];
        document.getElementById('monitor-body').innerHTML = '';
    }

    sendCommand() {
        const commandInput = document.getElementById('monitor-command');
        const command = commandInput.value.trim();

        if (command && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(command);
            this.log(`> ${command}`);
            commandInput.value = '';
        } else {
            this.log("Error: Unable to send command (socket closed or command empty)");
        }
    }
}

// Usage: Replace `ws://your-websocket-url` with your actual WebSocket server address
const serialMonitor = new SerialMonitor("ws://localhost:8765"); 

// Add CSS styles for the serial monitor
const style = document.createElement('style');
style.textContent = `
    .serial-monitor {
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

    .monitor-header {
        padding: 10px;
        background: #394648;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #FFF9EC;
    }

    .monitor-body {
        flex-grow: 1;
        padding: 10px;
        overflow-y: auto;
        color: #FFF9EC;
        font-family: monospace;
        font-size: 14px;
        background: #222; /* Darker background for better contrast */
        border-top: 1px solid #555;
    }

    .monitor-log {
        margin: 2px 0;
        word-wrap: break-word;
    }

    .monitor-input {
        display: flex;
        padding: 10px;
        background: #394648;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
    }

    .monitor-input input {
        flex-grow: 1;
        margin-right: 10px;
        padding: 5px;
        background: #DE3A86;
        border: 1px solid #555;
        color: #FFF9EC;
        border-radius: 4px;
    }
    
    .monitor-input input::placeholder {
        color: #FFD2E5;
        opacity: 1;
    }

    .monitor-input button,
    .monitor-header button {
        padding: 5px 10px;
        background: #DE3A86;
        color: #FFF9EC;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .monitor-input button:hover,
    .monitor-header button:hover {
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
            <button id="connect-ble">Connect to Cup</button>
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

