// manages client operations for the whiteboard (UI)


// [[ Variables ]] //
const socket = io({ transports: ["websocket"], upgrade: true });

// general UI
var canvas = document.getElementById("canvas");

var moveBtn = document.getElementById("move");
var recentreBtn = document.getElementById("recentre");
var paintBtn = document.getElementById("paint");
var eraseBtn = document.getElementById("erase");
var lineBtn = document.getElementById("line");
var rectangleBtn = document.getElementById("rectangle");
var ellipseBtn = document.getElementById("ellipse");
var textBtn = document.getElementById("text");
var clearBtn = document.getElementById("clear");

// canvas elements
var ctx = canvas.getContext("2d");

// painting elements
var colourInput = document.getElementById("paint-colour");
var widthInput = document.getElementById("paint-width");
var textInput = document.getElementById("text-message")

var drawing = false;
var last = null;
var toolType = null;
var offset = { x: 0, y: 0 }
var requesting = false; // "debounce" for FULL state requests



// [[ Vector Functions ]] //

// returns the sum of the two given vectors (A + B)
function vadd(A, B) {
    return {x: A.x + B.x, y: A.y + B.y};
}

// returns the difference between the two given vector (A - B)
function vsub(A, B) {
    return {x: A.x - B.x, y: A.y - B.y};
}

// divides the given vector by a scalar value (V / n)
function vdiv(V, n) {
    return {x: V.x / n, y: V.y / n};
}

// returns the "absolute" of the given vector
function vabs(V) {
    return {x: Math.abs(V.x), y: Math.abs(V.y)}
}



// [[ Canvas Drawing ]] //

// returns the mouse's position on the canvas
// * affected by translations
function getRelativePositionOnCanvas(x_, y_) {
    let rect = canvas.getBoundingClientRect();

    return { 
        x: x_ - rect.left - offset.x, 
        y: y_ - rect.top  - offset.y
    };
}

// draws freely / a straight line on the canvas
// * free drawing is really just a series of short lines
function drawLine(line) {
    let { from, to, colour, width } = line;

    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
}

// draws a rectangle on the canvas
function drawRectangle(rectangle) {
    let { from, to, colour, width } = rectangle;

    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
    ctx.stroke();
}

// draws an ellipse to the canvas
function drawEllipse(ellipse) {
    let { centre, radius, colour, width } = ellipse;

    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, radius.x, radius.y, 0, 2 * Math.PI, 0);
    ctx.stroke();
}

// draws text on the canvas
function drawText(text) {
    let { from, content, colour, width } = text;

    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    ctx.font = `${width}px Segoe UI`;
    ctx.fillText(content, from.x, from.y);
}

// clears the specified region of the canvas (rectangle-based)
function clearRegion(x, y, w) {
    ctx.clearRect(x - w / 2, y - w / 2, w, w);
}

// clear the canvas entirely
// * affected by translations
function clearCanvas() {
    ctx.clearRect(-offset.x, -offset.y, canvas.width, canvas.height);
}



// [[ "On Draw" Functions ]] //

// when drawing is started on the canvas
function onDrawStart(x, y) {
    drawing = true;
    last = getRelativePositionOnCanvas(x, y);
}

// when drawing is actively being done as the mouse moves
// * free paints / erasures are actively drawn as the mouse moves
// * shapes are drawn when the mouse is up!
function onDrawMove(x, y) {
    if (!drawing) return;

    let target = getRelativePositionOnCanvas(x, y);
    let toEmit;

    // adjust offset according to mouse pan
    // * reset, then re-apply - universal change!
    if (toolType == "move") {
        offset = vadd(offset, vsub(target, last));
        last = target;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(offset.x, offset.y);
        
        requestFullState();

    // paint strokes are just smaller lines
    } else if (toolType == "paint") {
        let paint = {
            type: "paint",
            from: last,
            to: target,
            colour: colourInput.value,
            width: parseFloat(widthInput.value || 2),
            ts: Date.now()
        };

        drawLine(paint);
        toEmit = paint;
        last = target;

    } else if (toolType == "erase") {
        let erase = {
            type: "erase",
            from: last,
            colour: colourInput.value,
            width: parseFloat(widthInput.value || 2),
            ts: Date.now()
        };

        clearRegion(last.x, last.y, erase.width);
        toEmit = erase;
        last = target;
    }

    if (toEmit) socket.emit("draw", toEmit);
}

// when drawing is ended on the canvas
// * free paints / erasures are actively drawn as the mouse moves
// * shapes are drawn when the mouse is up!
function onDrawEnd(x, y) {
    if (!drawing) return;
    drawing = false;

    let target = getRelativePositionOnCanvas(x, y);
    let toEmit;

    // redraws one last time to not be so choppy
    // * circumvents typical debounce
    if (toolType == "move") {
        offset = vadd(offset, vsub(target, last));
        last = target;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(offset.x, offset.y);
        
        socket.emit("request_full_state");

    // a line is just an extended paint stroke
    } else if (toolType == "line") {
         let line = {
            type: "line",
            from: last,
            to: target,
            colour: colourInput.value,
            width: parseFloat(widthInput.value || 2),
            ts: Date.now()
        };

        drawLine(line);
        toEmit = line;

    } else if (toolType == "rectangle") {
        let rectangle = {
            type: "rectangle",
            from: last,
            to: target,
            colour: colourInput.value,
            width: parseFloat(widthInput.value || 2),
            ts: Date.now()
        }

        drawRectangle(rectangle);
        toEmit = rectangle;

    } else if (toolType == "ellipse") {
        let ellipse = {
            type: "ellipse",
            centre: vadd(last, vdiv(vsub(target, last), 2)),
            radius: vdiv(vabs(vsub(target, last)), 2),
            colour: colourInput.value,
            width: parseFloat(widthInput.value || 2),
            ts: Date.now()
        }

        drawEllipse(ellipse);
        toEmit = ellipse;
    
    } else if (toolType == "text") {
        let text = {
            type: "text",
            from: target,
            content: textInput.value,
            colour: colourInput.value,
            width: parseFloat(widthInput.value || 2),
            ts: Date.now()
        }

        drawText(text);
        toEmit = text;
    }

    if (toEmit) socket.emit("draw", toEmit);
}



// [[ Canvas Events ]]//

canvas.addEventListener("pointerdown",  (e) => onDrawStart(e.clientX, e.clientY) );
canvas.addEventListener("pointermove",  (e) => onDrawMove(e.clientX, e.clientY));
canvas.addEventListener("pointerup",    (e) => onDrawEnd(e.clientX, e.clientY) );
canvas.addEventListener("pointerleave", (e) => onDrawEnd(e.clientX, e.clientY) );



// [[ Paint Controls ]] //

// sets the tool type for the corresponding tools
moveBtn.addEventListener("click",       () => { toolType = "move";     });
paintBtn.addEventListener("click",      () => { toolType = "paint";     });
eraseBtn.addEventListener("click",      () => { toolType = "erase";     });
lineBtn.addEventListener("click",       () => { toolType = "line";      });
rectangleBtn.addEventListener("click",  () => { toolType = "rectangle"; });
ellipseBtn.addEventListener("click",    () => { toolType = "ellipse";   });
textBtn.addEventListener("click",       () => { toolType = "text";      });

// recentres the canvas on click
function recentreCanvas() {
    offset = { x: 0, y: 0 };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    requestFullState();
}

recentreBtn.addEventListener("click", recentreCanvas);

// clears the canvas on click
clearBtn.addEventListener("click", () => {
    clearCanvas();
    socket.emit("draw", { type: "clear", ts: Date.now() });
});



// [[ Socket Events ]] //

// draws the given drawable
function drawDrawable(drawable) {
    if (drawable.type == "paint") {
        drawLine(drawable);

    } else if (drawable.type == "erase") {
        clearRegion(drawable.from.x, drawable.from.y, drawable.width)

    } else if (drawable.type == "line") {
        drawLine(drawable);

    } else if (drawable.type == "rectangle") {
        drawRectangle(drawable);

    } else if (drawable.type == "ellipse") {
        drawEllipse(drawable);

    } else if (drawable.type == "text") {
        drawText(drawable);

    } else if (drawable.type == "clear") {
        clearCanvas();
    }
}

// draws the full state of the whiteboard
function drawFullState(state) {
    console.log("redrawing");
    clearCanvas();
    (state.drawables || []).forEach( drawDrawable );
    requesting = false;
}

// requests the full state of the whiteboard from the server
function requestFullState() {
    if (requesting) return;
    requesting = true;

    socket.emit("request_full_state");
}

// receive and draw any strokes from other users
socket.on("draw", (drawable) => { drawDrawable(drawable) });

// receive and draw the current canvas state
socket.on("full_state", (state) => { drawFullState(state) });



// [[ Set Up ]]//

// request whiteboard state on join
socket.emit("request_full_state");


