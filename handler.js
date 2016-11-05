"use strict";

let config = require('./config.json');
let fetch = require('node-fetch');
let Particle = require('particle-api-js');
let cheerio = require('cheerio');
let particle = new Particle();

/**
 * Splits dutch direction string and translates to english (ZZO => "SSE")
 * @param direction {string}
 * @returns {string}
 */
function translateDirection(direction) {

  const englishDirections = {
    "N" : "N",
    "O" : "E",
    "Z" : "S",
    "W" : "W"
  };

  return direction.split('').map(c => englishDirections[c]).join('');
}

/**
 *
 * Translates windspeed from M/S -> Beaufort
 * @param ms {string}
 * @returns {string}
 */
function getBeaufortForMS(ms) {

  const speeds = {
    "0": {
      "speed_interval": [0.0, 0.3]
    },
    "1": {
      "speed_interval": [0.3, 1.6]
    },
    "2":{
      "speed_interval": [1.6, 3.3]
    },
    "3":{
      "speed_interval": [3.4, 5.5]
    },
    "4":{
      "speed_interval": [5.5, 8.0]
    },
    "5":{
      "speed_interval": [8.0, 10.8]
    },
    "6":{
      "speed_interval": [10.8, 13.9]
    },
    "7":{
      "speed_interval": [13.9, 17.2]
    },
    "8":{
      "speed_interval": [17.2, 20.7]
    }
  };

  // Default to 0 beaufort
  let output = "0";

  Object.keys(speeds).forEach((key)=>{
    let speed = speeds[key];
    if (ms >= speed.speed_interval[0] && ms < speed.speed_interval[1]) {
      output = key;
    }
  });
  return output;
}

/**
 * Pushes data to Particle returns with a promise which will always resolve with status-message
 * @param key
 * @param value
 * @returns {Promise.<String>}
 */
function pushToParticle(key, value){
  return particle.callFunction({ deviceId: config.DEVICE_ID, name:key, argument: value, auth: config.ACCESS_TOKEN }).then(() => {
    return "Pushed " + key;
  }).catch(()=>{
    return 'Could not push '+ key;
  });
}

/**
 *
 * Get's data from dutch KNMI (weather institute), and pushes to particle
 *
 * @param station
 * @returns {Promise.<String/Err>}
 */
function getAndPushWeatherData(station){
  return fetch('http://www.knmi.nl/nederland-nu/weer/waarnemingen').then(response => response.text()).then(body => {
    let $ = cheerio.load(body);

    // Set defaults
    let direction = "N";
    let speed = "1";
    let beaufort = "1";

    // Loop through all tr's which represent the weather-stations
    $("#weather table tbody tr").each( (index, tr) => {

      // Get the cell's in this row
      let tds = $(tr).find('td');

      // The first cell (index 0) corresponds with the name of the station.
      let rowStation = $(tds[0]).html();

      // If it's the station we're interested in....
      if (station.toUpperCase() == rowStation.toUpperCase()) {

        // then get the winddirection from the 6th cell (index 5)
        let dutchDirection = $(tds[5]).html();
        direction = translateDirection(dutchDirection);

        // and get the speed from the 7th cell (index 6)
        speed = $(tds[6]).html();
        beaufort  = getBeaufortForMS(speed);
      }
    });

    // Try to push our windspeed and winddirection to particle
    let speedp = pushToParticle('windSpeed', beaufort);
    let dirp   = pushToParticle('windDir', direction);

    // Return a promise which will resolve when both pushes are handled.
    return Promise.all([speedp, dirp]).then(
        responses => direction + ", " + beaufort + " BFT, " + speed + " m/s - " + responses[0] + ", " + responses[1]
    );

  });
}

module.exports.update = (event, context, callback) => {
  getAndPushWeatherData(config.WEATHER_STATION).then((response)=>{

    // If it succeeded, log this, and call callback with 'success' param
    console.log(response);
    callback(null, response);
  }, (err)=>{

    // If it didn't succeed, call callback with err
    callback(err);
  })
};
