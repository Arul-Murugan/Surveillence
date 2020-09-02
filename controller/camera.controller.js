
const mockData = require('../constants/mock');
const cameraController = {};

/**
 * Get camera
 * this function is used to get the list of the cameras
 */
cameraController.getList = async(req, res, next) => {
    var data = mockData.cameras;
    res.send({
        meta: {
            status: 200,
            message: "success"
        },
        data: data
    })
}

cameraController.getStationList = async(req, res, next) => {
    var data = mockData.stations;
    res.send({
        meta: {
            status: 200,
            message: "success"
        },
        data: data
    })
}

module.exports = cameraController;