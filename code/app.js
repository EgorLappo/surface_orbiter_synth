// author: egor alimpiev -- egor at ccrma.stanford.edu
const chuck_from_port = 6449;
const chuck_to_port_mod = 6500;
const chuck_to_port_control = 6505;

const { spawn } = require("child_process");

var chuck_process = 0;
var chuck_file = "run.ck"

const osc = require("osc"),
    http = require("http");

const udpPort = new osc.UDPPort({
  localAddress: "localhost",
  localPort: chuck_from_port,
  metadata: true
});

udpPort.open();

const udpPortOut = new osc.UDPPort({
    localAddress: "localhost",
    localPort: 6551,
    metadata: true
});

udpPortOut.open();



let p5_server = http.createServer();
p5_server.listen(3000);
const p5_io = require("socket.io")(p5_server);

var clients = [];

function emit_on(oscMsg) {
    p5_io.emit('on', {"id": oscMsg["args"][0]["value"], "amp": oscMsg["args"][1]["value"]});
}

function emit_off(oscMsg) {
    p5_io.emit('off', {"id": oscMsg["args"][0]["value"]});
}

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
        //console.log("An OSC message just arrived!", oscMsg);
        // console.log("Remote info is: ", info);
        if (oscMsg["address"] == "/on") {
        emit_on(oscMsg);
        } else if (oscMsg["address"] == "/off") {
        emit_off(oscMsg);
  }
});

p5_io.on("connection", (socket) => {
    console.log("new connection!");
    clients.push(socket);

    socket.on("data", (data) => {
        //console.log("sending data...", data.id, data.x, data.y);
        udpPortOut.send({
            address: "/chuck_mod_params",
            args: [
                {
                    type: "i",
                    value: data.id
                },
                {   // x
                    type: "f",
                    value: data.x
                },
                {   // y
                    type: "f",
                    value: data.y
                }
            ]
        }, "localhost", chuck_to_port_mod);
    });

    socket.on("test", (data) => {console.log(data)});

    socket.on("chuck_on", (data) =>  {
        chuck_process = spawn("chuck", [chuck_file]);

        chuck_process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        chuck_process.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });
    });

    socket.on("chuck_off", (data) =>  {
        chuck_process.kill()
    });

    socket.on("mod_dest", (data) => {
        console.log("mod_dest");
        console.log(data);
        udpPortOut.send({
            address: "/chuck_mod_dest",
            args: [
                {
                    type: "i",
                    value: data.x
                },
                {   // y
                    type: "i",
                    value: data.y
                }
            ]
        }, "localhost", chuck_to_port_control);
    });

    socket.on("synth_params", (data) => {
        console.log("synth_params");
        console.log(data);
        udpPortOut.send({
            address: "/chuck_synth_params",
            args: [
                {
                    type: "f",
                    value: data.osc_gain
                },
                {
                    type: "f",
                    value: data.osc_width
                },
                {
                    type: "f",
                    value: data.filt_freq
                },
                {
                    type: "f",
                    value: data.filt_Q
                }
            ]
        }, "localhost", chuck_to_port_control);
    });

    socket.on("wvform", (data) => {
        console.log("wvform");
        console.log(data);
        udpPortOut.send({
            address: "/chuck_wvform",
            args: [
                {
                    type: "i",
                    value: data.wvform
                }
            ]
        }, "localhost", chuck_to_port_control);
    });

    socket.on("rec", (data) => {
        console.log("rec");
        let d = new Date();
        udpPortOut.send({
            address: "/chuck_rec",
            args: [
                {
                    type: "s",
                    value: d.toISOString()
                }
            ]
        }, "localhost", chuck_to_port_control);
    });
});





