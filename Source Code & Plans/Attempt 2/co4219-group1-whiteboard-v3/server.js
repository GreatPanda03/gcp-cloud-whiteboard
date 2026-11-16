// manages server operations for the whiteboard
//   (data management & propagation)


// [[ Variables ]] //
const express = require("express");

// network elements
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

// ports & redis
const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const STATE_KEY = "whiteboard:state_list";

const publisher = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
const subscriber = publisher.duplicate();



// [ Data Management Subfunctions ] //

// returns all drawables from the memory store
async function getAllDrawables() {
    try {
        let snapshot = await publisher.lRange(STATE_KEY, 0, -1);
        let drawables = snapshot.map(s => JSON.parse(s));
        return drawables;

    } catch (err) {
        console.error("[DATA] Failed to fetch drawables from Redis:", err);
        return [];
    }
}

// saves the given drawable and emits it to all clients
async function handleDrawable(drawable) {

    // could clear cache on drawable type "clear"?
    // * not good for undo / redo potential though...
    // * leave it out for now

    try {
        await publisher.rPush(STATE_KEY, JSON.stringify(drawable));
        io.emit("draw", drawable);
    } catch (err) {
        console.error("[DATA] Failed to handle drawable:", err);
    }
}



// [[ Server Functions ]] //

// basic health check endpoint
app.get("/health", (req, res) => res.send("ok"));

// starts the server
async function initialise() {

    // prepares the redis adapter for socket.io
    //   to read from the memory store 
    publisher.on("error", e => console.error("Redis PUB error", e));
    subscriber.on("error", e => console.error("Redis SUB error", e));

    await publisher.connect();
    await subscriber.connect();

    io.adapter(createAdapter(publisher, subscriber));
    console.log("Connected Socket.IO Redis adapter");

    // acknowledges and prepares the connected client
    // * current canvas state, any drawing, etc.
    io.on("connection", async socket => {
        console.log("Socket connected:", socket.id);

        let drawables = await getAllDrawables();
        socket.emit("full_state", { drawables });

        socket.on("draw", handleDrawable);

        socket.on("request_full_state", async () => {
            let drawables = await getAllDrawables();
            socket.emit("full_state", { drawables });
        });

        // disconnects the client from the whiteboard
        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    // listens to any client connections
    server.listen(PORT, () => {
        console.log(`Whiteboard server listening on port ${PORT}`);
        console.log(`Redis -> ${REDIS_HOST}:${REDIS_PORT}`);
    });
}



// [[ Set Up ]] //
initialise();
