import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10";

const mpHands = window,
    drawingUtils = window,
    controls = window,
    controls3d = window;

// 1 - Testing if the web browser is supported (only Chrome client)
testSupport([
    { client: 'Chrome' },
]);

function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector(),
        detectedDevice = deviceDetector.parse(navigator.userAgent);
    
    let isSupported = false;
    for (const device of supportedDevices) {
        if (device.client !== undefined) {
            const re = new RegExp(`^${device.client}$`);
            if (!re.test(detectedDevice.client.name)) {
                continue;
            }
        }
        if (device.os !== undefined) {
            const re = new RegExp(`^${device.os}$`);
            if (!re.test(detectedDevice.os.name)) {
                continue;
            }
        }
        isSupported = true;
        break;
    }
    if (!isSupported) {
        alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
            `is not well supported at this time, continue at your own risk.`);
    }
}

// 2 - Getting necessary HTML elements
const videoElement = document.getElementById('input-video'),
    canvasElement = document.getElementById('output-canvas'),
    controlsElement = document.getElementById('control-panel'),
    volumeElement = document.getElementById('volume'),
    canvasCtx = canvasElement.getContext('2d');

// 3 - Defining the config for mediapipe (where should it look for files)
const config = { 
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}`;
    } 
};

// Optimization: turning off the animated spinner after its hiding animation is done
const spinner = document.getElementById('loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

// 4 - Creating the 3D rotating grid that shows landmarks
const landmarkContainer = document.getElementById('landmark-grid-container'),
    grid = new controls3d.LandmarkGrid(landmarkContainer, {
        connectionColor: 0xCCCCCC,
        definedColors: [
            { name: 'Left', value: 0xffa500 }, 
            { name: 'Right', value: 0x00ffff }
        ],
        range: 0.2,
        fitToGrid: false,
        labelSuffix: 'm',
        landmarkSize: 2,
        numCellsPerAxis: 4,
        showHidden: false,
        centered: false,
});

const fpsControl = new controls.FPS();

// 5 - Function that triggers after finished loading, draws the hand landmark points.
function onResults(results) {
    // 5.1 - Hide the spinner.
    document.body.classList.add('loaded');

    // 5.2 - Update the frame rate.
    fpsControl.tick();

    // 5.3 - Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // 5.3.1 - Iterating through hands
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const classification = results.multiHandedness[i],
                isRightHand = classification.label === 'Right',
                landmarks = results.multiHandLandmarks[i];
            
            // drawing connections between landmarks
            drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, { color: isRightHand ? '#00FF00' : '#FF0000' });
            
            // drawing landmark points
            drawingUtils.drawLandmarks(canvasCtx, landmarks, {
                color: isRightHand ? '#00FF00' : '#FF0000',
                fillColor: isRightHand ? '#FF0000' : '#00FF00',
                radius: (data) => drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1)
            });

            const calculateFingerDistance = (p1, p2) => {
                const diffs = [
                    100 * (p1.x - p2.x),
                    100 * (p1.y - p2.y),
                    100 * (p1.z - p2.z)
                ];
    
                return Math.sqrt(diffs.reduce((prev, curr) => prev + curr^2, 0));
            }

            const fingerDistanceToVolume = (dist) => {
                if (dist <= 2 || isNaN(dist)) {
                    return '0%';
                }

                return Math.min(Math.floor(100.0/4.0 * dist), 100.0) + '%';
            }
    
            const thumb = landmarks[4],
                indexFinger = landmarks[8];
            
            let fingerDistance = -1;

            if (thumb?.x && indexFinger?.x) {
                fingerDistance = calculateFingerDistance(thumb, indexFinger);
                volumeElement.textContent = fingerDistanceToVolume(fingerDistance);
            }
        }
    }

    canvasCtx.restore();

    // 5.3.2 - Iterating through hands (but in 3D world dimensions to show on grid)
    if (results.multiHandWorldLandmarks) {
        const landmarks = results.multiHandWorldLandmarks.reduce((prev, current) => [...prev, ...current], []);
        
        const colors = [];
        let connections = [];

        for (let i = 0; i < results.multiHandWorldLandmarks.length; ++i) {
            const offset = i * mpHands.HAND_CONNECTIONS.length,
                offsetConnections = mpHands.HAND_CONNECTIONS.map((connection) => [connection[0] + offset, connection[1] + offset]),
                classification = results.multiHandedness[i];
            
            connections = connections.concat(offsetConnections);

            colors.push({
                list: offsetConnections.map((unused, j) => j + offset),
                color: classification.label,
            });
        }

        grid.updateLandmarks(landmarks, connections, colors);
    }
    else {
        grid.updateLandmarks([]);
    }
}

const hands = new mpHands.Hands(config);
hands.onResults(onResults);

// 6 - Creating the control panel (display: none, we do not use it in our application)
// but it might be changed / used in the future
new controls
    .ControlPanel(controlsElement, {
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.75
})
    .add([
    fpsControl,
    new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new controls.SourcePicker({
        onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
                height = window.innerHeight;
                width = height / aspect;
            }
            else {
                width = window.innerWidth;
                height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await hands.send({ image: input });
        },
    }),
    new controls.Slider({
        title: 'Max Number of Hands',
        field: 'maxNumHands',
        range: [1, 4],
        step: 1
    }),
    new controls.Slider({
        title: 'Model Complexity',
        field: 'modelComplexity',
        discrete: ['Lite', 'Full'],
    }),
    new controls.Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01
    }),
    new controls.Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01
    }),
])
    .on(x => {
    const options = x;
    videoElement.classList.toggle('selfie', options.selfieMode);
    hands.setOptions(options);
});