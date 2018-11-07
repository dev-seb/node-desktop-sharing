let os = require('os');
let http = require('http');
let net = require('net');
let path = require('path');
let express = require('express');
let robot = require("robotjs");

let WebSocketServer = require('websocket').server;
let spawn = require('child_process').spawn;

let wsClient = null;
let ffmpeg = null;

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
    wsServer.on('close', function() {
       if(ffmpeg) {
           ffmpeg.stdin.pause();
           ffmpeg.kill();
       }
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
        "-hide_banner",
        //"-loglevel", "verbose",
        "-threads", "0",
        "-video_size", "1920x1080",
        "-f", videoFormat, "-i", videoInput,
        "-vf", "crop=1920:1080:0:0",
        "-vcodec", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-vsync", "drop",
        "-g", "5",
        "-b", "1M",
        "-keyint_min", "250",
        "-pix_fmt", "yuv420p",
        "-s", "1280x720",
        "-movflags", "frag_keyframe+empty_moov",
        "-an",
        "-f", "mp4",
        "-"
    ];
    /**
     * TODO: test HW acceleration with h264_nvenc
     * TODO: test fshow as input on Windows
     */
    console.log("ffmpeg " + args.join(" "));
    ffmpeg = spawn("ffmpeg", args);
    ffmpeg.stdout.on('data', function(data) {
        if (wsClient != null) {
            // Send data to client
            wsClient.sendBytes(data);
        }
    });
    ffmpeg.stderr.on('data', function (data) {
        //console.log(data);
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