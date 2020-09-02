const cv = require('opencv4nodejs');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(4000);
const mockData = require('./constants/mock');

const wCap = new cv.VideoCapture(0);

//change the size of the video
// wCap.set(cv.CAP_PROP_FRAME_HEIGHT, 100);
// wCap.set(cv.CAP_PROP_FRAME_WIDTH, 100);

const FPS = 30;
let camera = { id: "fea1e18c-6b8b-4d00-b9df-46a3d6e12515", name: "camera 100", lat: 11.9293492, lng: 79.803265, isAvailable: true, type: 'Box Camera', location: 'street 1' }

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Socket 
io.on('view', data => {
  camera = data;
});


setInterval(() => {
  const frame = wCap.read();
  const image = cv.imencode('.jpg', frame).toString('base64');
  io.emit('image', image);
  // fireCheck(frame);
  const predictions = classifyImg(frame);
  if (predictions.join().indexOf('fire') > -1) {
    console.log('**************  fire  **************')
    io.emit('fire', {camera});
  }
}, 1000 / FPS);

function fireCheck(frame) {
  const predictions = classifyImg(frame);
  if (predictions.join().indexOf('fire') > -1) {
    console.log('**************  fire  **************')
    let minDistance = 0;
    let station = '';
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < mockData.stations.length; i++) {
      const dist = distance(camera.lat, camera.lng, mockData.stations[i].lat, mockData.stations[i].lng, 'K');
      if (dist <= minDistance) {
        station = mockData.stations[i];
        minDistance = dist;
      }
    }
    io.emit('fire', { camera, station });
  }
}


// fire detect
const inceptionModelPath = './data';

const modelFile = path.resolve(inceptionModelPath, 'tensorflow_inception_graph.pb');
const classNamesFile = path.resolve(inceptionModelPath, 'imagenet_comp_graph_label_strings.txt');
if (!fs.existsSync(modelFile) || !fs.existsSync(classNamesFile)) {
  console.log('could not find inception model');
  console.log('download the model from: https://storage.googleapis.com/download.tensorflow.org/models/inception5h.zip');
  throw new Error('exiting');
}

// read classNames and store them in an array
const classNames = fs.readFileSync(classNamesFile).toString().split('\n');

// initialize tensorflow inception model from modelFile
const net = cv.readNetFromTensorflow(modelFile);

const classifyImg = (img) => {
  // inception model works with 224 x 224 images, so we resize
  // our input images and pad the image with white pixels to
  // make the images have the same width and height
  const maxImgDim = 224;
  const white = new cv.Vec(255, 255, 255);
  const imgResized = img.resizeToMax(maxImgDim).padToSquare(white);

  // network accepts blobs as input
  const inputBlob = cv.blobFromImage(imgResized);
  net.setInput(inputBlob);

  // forward pass input through entire network, will return
  // classification result as 1xN Mat with confidences of each class
  const outputBlob = net.forward();

  // find all labels with a minimum confidence
  const minConfidence = 0.05;
  const locations =
    outputBlob
      .threshold(minConfidence, 1, cv.THRESH_BINARY)
      .convertTo(cv.CV_8U)
      .findNonZero();

  const result =
    locations.map(pt => ({
      confidence: parseInt(outputBlob.at(0, pt.x) * 100) / 100,
      className: classNames[pt.x]
    }))
      // sort result by confidence
      .sort((r0, r1) => r1.confidence - r0.confidence)
      .map(res => `${res.className} (${res.confidence})`);

  return result;
};

// Find distance of two latlong
function distance(lat1, lon1, lat2, lon2, unit) {
  const radlat1 = Math.PI * lat1 / 180;
  const radlat2 = Math.PI * lat2 / 180;
  const theta = lon1 - lon2;
  const radtheta = Math.PI * theta / 180;
  let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit === 'K') { dist = dist * 1.609344; }
  if (unit === 'N') { dist = dist * 0.8684; }
  return dist;
}

/**
 * custom Routes
 */
app.use('/api/v1', require('./routes/index.routes'))

app.listen(3000);
