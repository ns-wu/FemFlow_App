from js import navigator, window, console, document
from pyodide.ffi import to_js
from pyodide.ffi.wrappers import add_event_listener
import asyncio

# Utility function for converting py dicts to JS objects
def j(obj):
    return to_js(obj, dict_converter=js.Object.fromEntries)

class SerialManager():
    '''
    Class for managing reads and writes to/from a serial port
    With proper float processing for values like 5.50
    '''
    
    def __init__(self):
        self.dataWindow = document.getElementById("data-window")
        self.port = None
        self.encoder = None
        self.decoder = None
        self.reader = None
        
    def appendToDataWindow(self, message, messageType="data"):
        """Append a message to the data window with formatting based on type"""
        if not self.dataWindow:
            self.dataWindow = document.getElementById("data-window")
            
        if self.dataWindow:
            entry = document.createElement("div")
            
            if messageType == "data":
                entry.className = "data-entry"
                entry.textContent = message
            elif messageType == "float":
                entry.className = "float-entry"
                entry.innerHTML = f"<strong>Float:</strong> {message}"
            elif messageType == "system":
                entry.className = "system-entry"
                entry.innerHTML = f"<em>System:</em> {message}"
            
            self.dataWindow.appendChild(entry)
            # Auto-scroll to bottom
            self.dataWindow.scrollTop = self.dataWindow.scrollHeight

    def clearDataWindow(self):
        """Clear all content from the data window"""
        if not self.dataWindow:
            self.dataWindow = document.getElementById("data-window")
            
        if self.dataWindow:
            self.dataWindow.innerHTML = ""
            self.appendToDataWindow("Data window cleared", "system")

    async def askForSerial(self):
        '''
        Request that the user select a serial port, and initialize
        the reader/writer streams with it
        '''
        try:
            self.port = await navigator.serial.requestPort()
            await self.port.open(j({"baudRate": 115200}))
            self.appendToDataWindow("Connected to device at 115200 baud", "system")

            # Set up encoder to write to port
            self.encoder = js.TextEncoderStream.new()
            outputDone = self.encoder.readable.pipeTo(self.port.writable)

            # Set up listening for incoming bytes
            self.decoder = js.TextDecoderStream.new()
            inputDone = self.port.readable.pipeTo(self.decoder.writable)
            inputStream = self.decoder.readable

            self.reader = inputStream.getReader()
            await self.listenAndEcho()
        except Exception as e:
            self.appendToDataWindow(f"Error connecting to device: {str(e)}", "system")

    async def writeToSerial(self, data):
        '''Write to the serial port'''
        if not self.encoder:
            self.appendToDataWindow("Not connected to a device", "system")
            return
            
        try:
            outputWriter = self.encoder.writable.getWriter()
            outputWriter.write(data + '\n')
            outputWriter.releaseLock()
            self.appendToDataWindow(f"Sent: {data}", "system")
        except Exception as e:
            self.appendToDataWindow(f"Error sending data: {str(e)}", "system")

    async def process_buffer(self, buffer):
        '''Process and print the buffer contents as a float and trigger event for JS'''
        if buffer:
            try:
                # Try to format as a float with 2 decimal places
                value = float(buffer)
                formatted = f"{value:.2f}"
                self.appendToDataWindow(formatted, "float")
                
                # Dispatch an event for JavaScript to handle
                event = window.CustomEvent.new("serialValueReceived", j({"detail": {"value": value}}))
                document.dispatchEvent(event)
            except ValueError:
                # If not a valid float, just print the raw buffer
                self.appendToDataWindow(buffer, "data")

    async def listenAndEcho(self):
        '''Loop forever, collecting complete float values from serial'''
        buffer = ""
        number_buffer = ""
        collecting_number = False
        digit_count = 0
        decimal_seen = False
        
        while True:
            try:
                response = await self.reader.read()
                value, done = response.value, response.done
                
                for char in value:
                    # Handle newlines - process any accumulated number
                    if char in ['\r', '\n']:
                        if collecting_number:
                            # Process the completed number
                            await self.process_buffer(number_buffer)
                            number_buffer = ""
                            collecting_number = False
                            digit_count = 0
                            decimal_seen = False
                        continue
                    
                    # Check if we're getting a digit or decimal point
                    if char.isdigit() or char == '.':
                        # Start collecting a new number if needed
                        if not collecting_number:
                            collecting_number = True
                            number_buffer = char
                        else:
                            number_buffer += char
                        
                        # Track decimal point
                        if char == '.':
                            decimal_seen = True
                        elif decimal_seen:
                            digit_count += 1
                        
                        # If we have a complete number (2 decimal places after the point)
                        if decimal_seen and digit_count >= 2:
                            await self.process_buffer(number_buffer)
                            number_buffer = ""
                            collecting_number = False
                            digit_count = 0
                            decimal_seen = False
                    else:
                        # Non-digit, non-decimal character - process any accumulated number first
                        if collecting_number:
                            await self.process_buffer(number_buffer)
                            number_buffer = ""
                            collecting_number = False
                            digit_count = 0
                            decimal_seen = False
                        
                        # Handle other characters if needed
                        buffer += char
                        # Display in the window as normal text
                        if char not in ['\r', '\n', '']:
                            self.appendToDataWindow(char, "data")
            except Exception as e:
                self.appendToDataWindow(f"Error reading from device: {str(e)}", "system")
                await asyncio.sleep(1)  # Pause before trying again

# Create an instance of the SerialManager class when this script runs
sm = SerialManager()

# A helper function - to point the py-click attribute of one of our buttons to
async def sendValueFromInputBox(sm: SerialManager):
    '''
    Get the value of the input box and write it to serial
    Also clears the input box
    '''
    textInput = document.getElementById("text")
    value = textInput.value
    textInput.value = ''

    await sm.writeToSerial(value)