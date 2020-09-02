const express = require('express');
const router = express.Router();
const controller = require('../controller/index.controller.js');

/**
 * camera Api
 * to the list of the camera
 */
 router.get('/cameras', controller.Camera.getList);

 /**
 * station Api
 * to the list of the station
 */
 router.get('/stations', controller.Camera.getStationList);


module.exports = router;