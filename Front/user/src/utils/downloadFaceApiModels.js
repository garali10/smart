const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, '../../public/models');

// Create the models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  console.log('Creating models directory...');
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Face detection models
const tinyFaceDetectorModels = [
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json'
];

// Face landmark models
const faceLandmarkModels = [
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-weights_manifest.json'
];

// Face recognition models
const faceRecognitionModels = [
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_recognition_model-weights_manifest.json'
];

// All models to download
const allModels = [
  ...tinyFaceDetectorModels.map(model => ({ 
    fileName: model,
    url: `https://github.com/justadudewhohacks/face-api.js/blob/master/weights/tiny_face_detector_model-${model.includes('weights_manifest') ? 'weights_manifest.json' : 'shard1'}`
  })),
  ...faceLandmarkModels.map(model => ({ 
    fileName: model,
    url: `https://github.com/justadudewhohacks/face-api.js/blob/master/weights/face_landmark_68_model-${model.includes('weights_manifest') ? 'weights_manifest.json' : 'shard1'}`
  })),
  ...faceRecognitionModels.map(model => ({ 
    fileName: model,
    url: `https://github.com/justadudewhohacks/face-api.js/blob/master/weights/face_recognition_model-${model.includes('weights_manifest') ? 'weights_manifest.json' : model.includes('shard2') ? 'shard2' : 'shard1'}`
  }))
];

// Function to download a file
const downloadFile = (url, filePath) => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${filePath}`);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filePath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirects
        console.log(`Redirecting to ${response.headers.location}`);
        downloadFile(response.headers.location, filePath)
          .then(resolve)
          .catch(reject);
      } else {
        reject(`Failed to download ${url}: ${response.statusCode}`);
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
};

// Download all models
const downloadAllModels = async () => {
  try {
    console.log('Downloading face-api.js models...');
    
    for (const model of allModels) {
      const filePath = path.join(modelsDir, model.fileName);
      await downloadFile(model.url, filePath);
      console.log(`Downloaded ${model.fileName}`);
    }
    
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
};

downloadAllModels(); 