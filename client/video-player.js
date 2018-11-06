/**
 * Video Player
 */

function VideoPlayer() {

    this.init = function(websocket, element) {

        var mediaSource = null;
        var buffer = null;
        var queue = [];

        // WebSocket
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
        element.src = window.URL.createObjectURL(mediaSource);
        element.play();
    };

}