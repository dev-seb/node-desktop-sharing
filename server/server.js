let os = require('os');
let http = require('http');
let net = require('net');
let path = require('path');
let express = require('express');
let robot = require("robotjs");

let WebSocketServer = require('websocket').server;
let spawn = require('child_process').spawn;

let wsClient = null;

function startServer()
{
    // Website
    let website = express();
    website.use(express.static(path.resolve(__dirname, '../client/')));
    website.get('/', function(req, res){
        res.sendFile('index.html');
    });

    // HTTP Server
    let httpServer = http.createServer(website);
    httpServer.listen(8080);

    // Websocket Server
    let wsServer = new WebSocketServer({
        httpServer: httpServer,
        autoAcceptConnections: false
    });
    wsServer.on('request', function(request) {
        wsClient = request.accept('udp', request.origin);
        wsClient.on('message', function(message) {
            // Receive data from client
            let event = JSON.parse(message.utf8Data);
            handleEvent(event);
        });
        startScreenCasting();
    });
}

function startScreenCasting() {
    // Select input depending on server OS
    var videoFormat = '';
    var videoInput  = '';
    switch(os.type()) {
        case 'Linux':
            videoFormat = 'x11grab';
            videoInput  = ':0.0';
            break;
        case 'Windows_NT':
            videoFormat = 'gdigrab';
            videoInput  = 'desktop';
            break;
        case 'Darwin':
            videoFormat = 'avfoundation';
            videoInput = '1';
    }
    // Start sending stream
    let args = [
        //-f", "alsa", "-i", "hw:0", "-ac", "2", "-acodec", "aac",
        "-video_size", "1920x1080",
        "-f", videoFormat, "-i", videoInput,
        "-filter:v", "crop=1920:1080:0:0", "-framerate", "25",
        "-vcodec", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-profile:v", "main",
        "-g", "25", "-r", "25", "-b:v", "2M", "-keyint_min", "250", "-s", "1280x720",
        "-strict", "experimental", "-pix_fmt", "yuv420p", "-movflags", "frag_keyframe+empty_moov",
        "-an",
        "-f", "mp4",
        "-"
    ];
    let ffmpeg = spawn("ffmpeg", args);
    ffmpeg.stdout.on('data', function(data) {
        if (wsClient != null) {
            // Send data to client
            wsClient.sendBytes(data);
        }
    });
    ffmpeg.stderr.on('data', function (data) {
        console.log(data);
    });
}

function handleEvent(event) {
    console.log(event);
    let type = event.type;
    switch(type) {
        case 'keydown':
        case 'keyup': {
            let key = event.key;
            let state = type === 'keydown' ? 'down' : 'up';
            if(key.length === 1 && state === 'down') {
                robot.keyTap(key, event.modifier);
            }
            else {
                if(event.modifier) {
                    robot.keyToggle(key, state, event.modifier);
                }
                else {
                    robot.keyToggle(key, state);
                }
            }
            break;
        }
        case 'click':
        case 'dblclick': {
            let button = event.button;
            let double = type === 'dblclick';
            robot.mouseClick(button, double);
            break;
        }
        case 'mousedown':
        case 'mouseup': {
            let button = event.button;
            let state = type === 'mousedown' ? 'down' : 'up';
            robot.mouseToggle(state, button);
            break;
        }
        case 'mousemove': {
            let modifier = event.modifier;
            if(modifier === 'left') {
                robot.dragMouse(event.x, event.y);
            }
            else {
                robot.moveMouse(event.x, event.Y);
            }
            break;
        }
        case 'mousewheel':
        case 'wheel': {
            robot.scrollMouse(event.x, event.y);
            break;
        }
        case 'touchestart':
        case 'toucheend': {
            let state = type === 'mousedown' ? 'down' : 'up';
            robot.mouseToggle(state, 'left');
            break;
        }
        case 'touchmove': {
            robot.dragMouse(event.x, event.y);
            break;
        }
    }
}

startServer();