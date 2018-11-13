/**
 * Event Handler
 */

function EventHandler() {

    var self = this;

    this.websocket = null;
    this.element = null;
    this.elementLeft = 0;
    this.elementTop = 0;
    this.keyModifier = null;
    this.mouseModifier = null;
    this.buttons = {0: 'left', 1: 'middle', 2: 'right'};

    this.init = function(websocket, element) {
        // Init WebSocket
        this.websocket = websocket;
        // Bind Key listeners
        window.addEventListener("keyup", this.handleEvent);
        window.addEventListener("keydown", this.handleEvent);
        // Bind Mouse listeners
        //element.addEventListener("click", this.handleEvent);
        element.addEventListener("dblclick", this.handleEvent);
        element.addEventListener("mousemove", this.handleEvent);
        element.addEventListener("mouseup", this.handleEvent);
        element.addEventListener("mousedown", this.handleEvent);
        element.addEventListener("mouseswheel", this.handleEvent);
        element.addEventListener("wheel", this.handleEvent);
        // Bind Touch listeners
        element.addEventListener("touchmove", this.handleEvent);
        element.addEventListener("touchstart", this.handleEvent);
        element.addEventListener("touchend", this.handleEvent);
        // Init element
        var rect = element.getBoundingClientRect();
        this.elementLeft = rect.left;
        this.elementTop = rect.top;
        this.element = element;
    };

    this.handleEvent = function(event) {
        var type = event.type;
        switch(type) {
            case 'keydown':
            case 'keyup': {
                var key = event.key.toLowerCase();
                if(key === ' ') key = 'space';
                key = key.replace('arrow', '');
                self.sendInput({
                    type: type,
                    key: key,
                    modifier: self.keyModifier
                });
                if(event.keyCode >= 16 && event.keyCode <= 18) {
                    self.keyModifier = type === 'keydown' ? key : null;
                }
                break;
            }
            case 'click':
            case 'dblclick': {
                var button = self.buttons[event.button] || null;
                self.sendInput({
                    type: type,
                    button: button
                });
                break;
            }
            case 'mousedown':
            case 'mouseup': {
                var button = self.buttons[event.button] || null;
                self.sendInput({
                    type: type,
                    button: button,
                    x: event.x - self.elementLeft,
                    y: event.y - self.elementTop
                });
                self.mouseModifier = type === 'mousedown' ? button : null;
                break;
            }
            case 'mousemove': {
                self.sendInput({
                    type: type,
                    x: event.x - self.elementLeft,
                    y: event.y - self.elementTop,
                    modifier: self.mouseModifier
                });
                break;
            }
            case 'mousewheel':
            case 'wheel': {
                self.sendInput({
                    type: type,
                    x: event.deltaX * -1,
                    y: event.deltaY * -1
                });
                break;
            }
            case 'touchestart':
            case 'toucheend': {
                if(event.touches.length > 0) {
                    var touch = event.touches[0];
                    self.sendInput({
                        type: type,
                        x: touch.clientX - self.elementLeft,
                        y: touch.clientY - self.elementTop
                    });
                    self.mouseModifier = type === 'touchstart' ? event.button : null;
                }
                break;
            }
            case 'touchmove': {
                if(event.touches.length > 0) {
                    var touch = event.touches[0];
                    self.sendInput({
                        type: type,
                        x: touch.ClientX - self.elementLeft,
                        y: touch.ClientY - self.elementTop,
                        modifier: self.mouseModifier
                    });
                }
                break;
            }
        }
        event.preventDefault();
        return false;
    };

    this.sendInput = function(message) {
        console.log(message);
        if(this.websocket) {
            this.websocket.send(JSON.stringify(message));
        }
    };

}
