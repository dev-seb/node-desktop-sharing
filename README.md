# node-desktop-sharing

This example shows how to share desktop through websocket with nodejs.

You will need two computers :
 - Server : Serving the web page and streaming its screen to the client
 - Client : Web browser receiving video stream from server and sending user events 

## Installation

Install websocket and robotjs dependencies :

```
npm install
```

Install ffmpeg and add binary to your path depending on your OS.

## Demo

On Server :

``` 
npm start
```

On Client : 

Just load `<server-host>:8080` in your favorite browser.

You should be able to view server's screen and control desktop using keyboard and mouse events.

## How it works

### Server side :

Create HTTP Server :

```javascript
    let httpServer = http.createServer();
    httpServer.listen(8080);
```

Create WebSocket Server :

```javascript
    let wsServer = new WebSocketServer({
        httpServer: httpServer,
        autoAcceptConnections: false
    });
    wsServer.on('request', function(request) {
        wsClient = request.accept('udp', request.origin);
    });
```

Capture screen with ffmpeg, and send video data to client through WebSocket :

```javascript
    let args = [
        "-threads", "0", "-video_size", "1920x1080",
        "-f", videoFormat, "-i", videoInput, "-vf", "crop=1920:1080:0:0",
        "-vcodec", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
        "-vsync", "drop", "-g", "5", "-b", "1M", "-keyint_min", "250",
        "-pix_fmt", "yuv420p", "-s", "1280x720", "-movflags", "frag_keyframe+empty_moov",
        "-an",
        "-f", "mp4",
        "-"
    ];
    let ffmpeg = spawn("ffmpeg", args);
    ffmpeg.stdout.on('data', function(data) {
        wsClient.sendBytes(data);
    });
```

Handle User Events :

```javascript
    wsClient.on('message', function(message) {
        // Receive event from client
        let event = JSON.parse(message.utf8Data);
        // ...
    });
```

### Client side :

Receive video from WebSocket and render with MediaSource to a video element :

```javascript
    var mediaSource = null;
    var buffer = null;
    var queue = [];

    // WebSocket
    var websocket = new WebSocket('ws://' + document.location.hostname + ':8080', 'udp');
    websocket.binaryType = "arraybuffer";
    websocket.addEventListener('message', function (event) {
        if(buffer && typeof event.data === 'object') {
            if (buffer.updating || queue.length > 0) {
                queue.push(event.data);
            } else {
                buffer.appendBuffer(event.data);
            }
        }
    });

    // MediaSource
    mediaSource = new MediaSource();
    mediaSource.addEventListener('sourceopen', function() {
        // Buffer
        buffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.420028"');
        buffer.mode = 'sequence';
        buffer.addEventListener('updateend', function() {
            if (buffer && queue.length > 0 && !buffer.updating) {
                buffer.appendBuffer(queue.shift());
            }
        });
    });

    // Video element
    var video = document.getElementById('video');
    video.src = window.URL.createObjectURL(mediaSource);
    video.play();
```

Handle User Events :

```javascript
    // Bind Key listeners
    window.addEventListener("keyup", handleEvent);
    window.addEventListener("keydown", handleEvent);
    
    // Bind Mouse listeners
    video.addEventListener("click", handleEvent);
    video.addEventListener("dblclick", handleEvent);
    video.addEventListener("mousemove", handleEvent);
    video.addEventListener("mouseup", handleEvent);
    video.addEventListener("mousedown", handleEvent);
    video.addEventListener("mouseswheel", handleEvent);
    video.addEventListener("wheel", handleEvent);
    
    // Bind Touch listeners
    video.addEventListener("touchmove", handleEvent);
    video.addEventListener("touchstart", handleEvent);
    video.addEventListener("touchend", handleEvent);
    
    // Send event to server
    function handleEvent(event) {
        websocket.send(JSON.stringify(event));
    }
```