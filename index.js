const WebSocket = require("ws")

let token = process.env.TOKEN;
let prefix = process.env.PREFIX;
let sequence = 0;
let session_id = "";
let heartRec = true;
let socket = "wss://gateway.discord.gg/?v=9&encoding=json";

const identifyPayload = {
    op: 2,
    d: {
        token: "token",
        properties: {
            $os: "linux",
            $browser: "github.com/9xN",
            $device: "github.com/9xN",
        },
    },
};

const heartPayload = {
    op: 1,
    d: "sequence",
};

const resumePayload = {
    op: 6,
    d: {
        token: "token",
        session_id: "session_id",
        seq: "sequence",
    },
};

async function connect() {
    const ws = new WebSocket(socket);
    ws.on("open", function() {
        console.log("Discord client connected");
        ws.on("message", function incoming(message) {
            evaluate(JSON.parse(message), ws);
        });
    });
    ws.on("close", function(code, reason) {
        console.log(`Discord client disconnected with code:${code}\nReason: ${reason}`);
        heartRec = true;
        reconnect(ws);
    });
}

async function evaluate(message, ws) {
    const opcode = message.op;
    switch (opcode) {
        case 10:
            const heartbeat_interval = message.d.heartbeat_interval;
            heartbeat(heartbeat_interval, ws);
            if (session_id) resume(ws);
            else identify(ws);
            break;
        case 11:
            heartRec = true;
            break;
        case 0:
            let t = message.t;
            sequence = message.s;
            if (t === "READY") {
                session_id = message.d.session_id;
            }
            if (t === "MESSAGE_CREATE") {

                const args = message.d.content.slice(prefix.length).trim().split(/ +/g);
                const command = args.shift().toLowerCase();

                if (command === "ping") {
                    console.log("pong")
                }
            }
            break;
        case 1:
            heartPayload.d = sequence;
            ws.send(JSON.stringify(heartPayload));
            break;

    }
}

async function heartbeat(interval, ws) {
    const timer = setInterval(function() {
        if (heartRec) {
            heartPayload.d = sequence;
            ws.send(JSON.stringify(heartPayload));
            heartRec = false;
        } else {
            heartRec = true;
            clearInterval(timer);
            reconnect(ws);
        }
    }, interval);
}

async function identify(ws) {
    identifyPayload.d.token = token;
    ws.send(JSON.stringify(identifyPayload));
}

async function resume(ws) {
    resumePayload.d.token = token;
    resumePayload.d.session_id = session_id;
    resumePayload.d.seq = sequence;
    ws.send(JSON.stringify(resumePayload));
}

async function reconnect(ws) {
    ws.close();
    connect();
}

connect();
