import _ from 'lodash';
import util from 'util';
import { EventEmitter } from 'events';
import BroadlinkJS from 'kiwicam-broadlinkjs-rm';

import logger from './logger';
import config from './config';
const dgram = require('dgram');

class Broadlink {
  constructor() {
    this.loopTimeToFindDevices = 5;
    this.broadlink = new BroadlinkJS();
    this.configureBroadLink();
    this.devicesLocal = {};

    // network callback, device is found
    this.broadlink.on('deviceReady', (device) => {
      this.configureDevice(device);
      logger.info(
        `Device found model: ${device.host.model}, id: ${device.host.id}, ip: ${device.host.address}`,
      );
      logger.debug('Device raw', device.host);
      this.emit('device', device);
    });
  }

  configureBroadLink(){
    // Setup Broadlink-RM if being used in a (docker) container
    if(config.settings.docker){
      logger.info(`Configuring device discovery for use in Docker container with broadcast range ${config.settings.docker.discoveryIpRange} and UDP port ${config.settings.docker.udpPort}`);
      // FIXME: this relys on a yet to be merged PR of the https://github.com/kiwi-cam/broadlinkjs-rm project
      this.broadlink.broadcastAddress = config.settings.docker.discoveryIpRange;
      this.broadlink.discoveryPort = config.settings.docker.udpPort;
    }

    // Show the broadlink-js debug logs based on the broadlink-mqtt-bridge log config
    this.broadlink.debug = logger.isDebugEnabled || logger.isSillyEnabled;
    // redirect Broadlink logs
    this.broadlink.log = (message) => {
        if(message.toLowerCase().includes("debug")){
          logger.debug(message);
        }else{
          logger.info(message);
        }
    };
  }

  devices() {
    return this.devicesLocal;
    // const devices = [];
    // return _.each(this.broadlink.devices, (device) => devices.push(device));
  }

  devicesInfo() {
    const devices = this.devices();
    return _.map(devices, (device) => device.host);
  }

  configureDevice(device) {
    this.deviceFillInfo(device);
    // listen on temperature changes
    device.on('temperature', (temperature) => {
      logger.debug(`Broadlink Temperature ${temperature} on ${device.host.id}`);
      try {
        // We got temperature, publish to
        // broadlink/internal/temperature/{device-id}
        this.emit('publish-mqtt', `${config.settings.mqtt.subscribeBasePath}internal/temperature/${device.host.id}`, temperature.toString());
        this.emit('temperature', device.host.id, temperature.toString());
      } catch (error) {
        logger.error('Temperature publish error', error);
      }
    });
  }

  deviceFillInfo(device) {
    logger.debug(`device mac to rewrite ${device.mac} hex: ${device.mac.toString('hex')}`);
    const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || [];
    logger.debug('device mac macAddressParts', macAddressParts);
    device.host.macAddress = macAddressParts.join(':');
    device.host.id = macAddressParts.join('');
    device.host.model = device.model;
    device.host.type = device.type;
    this.devicesLocal[device.host.id] = device;
  }

  // Emit *.255 broadcast to find devices on network
  discoverDevicesLoop(count = 0) {
  // We are finished, stop looking for devices
    if (count === 0) {
      this.emit('discoverCompleted', Object.keys(this.devicesLocal).length);
      config.setIsRunningScan(false);
      return;
    }

    // network emit
    const step = this.loopTimeToFindDevices - count;
    const progress = (step / this.loopTimeToFindDevices) * 100;
    this.emit('scan', progress);
    this.broadlink.discover();

    // loop
    count -= 1;
    setTimeout(() => {
      this.discoverDevicesLoop(count);
    }, 5 * 1000);
  }

  // EXPORTED; Run to find devices
  discoverDevices() {
    if (config.isPlayBlocked()) return false;
    config.setIsRunningScan(true);
    // clear
    this.broadlink.devices = {};
    this.devicesLocal = {};
    this.discoverDevicesLoop(this.loopTimeToFindDevices);
    return true;
  }
}
util.inherits(Broadlink, EventEmitter);
export default new Broadlink();
