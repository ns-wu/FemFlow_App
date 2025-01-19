// P2P Service UUIDs (modify these to match your STM32 device)
const P2P_SERVICE_UUID = 0xFE40;
const P2P_NOTIFY_CHAR_UUID = 0xFE42;

let deviceCache = null;
let characteristicCache = null;
let readBuffer = '';

export function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice()).
      then(device => connectDeviceAndCacheCharacteristic(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => console.error(error));
}

function requestBluetoothDevice() {
  console.log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{services: [P2P_SERVICE_UUID]}],
  }).then(device => {
    console.log(`"${device.name}" bluetooth device selected`);
    deviceCache = device;
    deviceCache.addEventListener('gattserverdisconnected',
        handleDisconnection);
    return deviceCache;
  });
}

function handleDisconnection(event) {
  const device = event.target;
  console.log(`"${device.name}" bluetooth device disconnected, trying to reconnect...`);
  
  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => console.error(error));
}

function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  return device.gatt.connect().
      then(server => {
        console.log('Getting P2P Service...');
        return server.getPrimaryService(P2P_SERVICE_UUID);
      }).
      then(service => {
        console.log('Getting Notify Characteristic...');
        return service.getCharacteristic(P2P_NOTIFY_CHAR_UUID);
      }).
      then(characteristic => {
        characteristicCache = characteristic;
        return characteristicCache;
      });
}

function startNotifications(characteristic) {
  return characteristic.startNotifications().then(() => {
    characteristic.addEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
  });
}

function handleCharacteristicValueChanged(event) {
  const value = new TextDecoder().decode(event.target.value);
  try {
    const jsonData = JSON.parse(value);
    if (jsonData.sensorReading !== undefined) {
      // Handle the sensor reading
      console.log('Received sensor reading:', jsonData.sensorReading);
      // You can add a callback here to handle the data
      if (onDataReceived) {
        onDataReceived(jsonData.sensorReading);
      }
    }
  } catch (e) {
    console.error('Error parsing JSON:', e);
  }
}

export function disconnect() {
  if (deviceCache) {
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);
    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
    }
  }
  
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }
  
  deviceCache = null;
}

let onDataReceived = null;
export function setOnDataReceived(callback) {
  onDataReceived = callback;
}