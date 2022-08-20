// author: egor alimpiev -- egor at ccrma.stanford.edu
var socket;
var chuck_status = 0;
var rec_status = 0;
var pi = 3.1416;

// --------------------
// knob default values
var speed = 0.3;
var max_speed = 120;
var speed_random = 0;
var angle = pi/4;
var angle_random = 0;

var x_send = 0.7;
var x_phase = 0;
var y_send = 0.7;
var y_phase = 0;

var osc_gain = 0.5;
var osc_width = 0.5;
var filt_freq = 5000;
var filt_Q = 1.0;
// --------------------

// --------------------
// button group default values
// waveform: 0,1,2 - saw, triangle, square
var wvform = 0;
// destinations:
// 0 - oscillator gain
// 1 - oscillator frequency/pitch
// 2 - oscillator width
// 3 - filter frequency
// 4 - filter resonance
var x_dest = 3;
var y_dest = 0;
// --------------------

const n_runners = 20;
// 0,1,2 - torus, projective space, Klein bottle
var runner_mode = "0";

var runners = [];
for (var i = 0; i < n_runners; i++) {
    var r = new Runner(i, runner_mode);
    runners.push(r);
}

function setup() {
    createCanvas(size, size);
    background(255);
    colorMode(RGB);

    //set up the connection
    socket = io('http://localhost:3000', { transports : ['websocket'] });

    socket.on('on',
        // When we receive a note on signal, launch a runner
        function(data) {
            console.log("Got note with data %0", data);
            // console.log("runner %0", runners[data.id]);
            var r_angle = angle + 2*pi*angle_random*(Math.random() - 0.5);
            var r_speed = min([max_speed, max([speed*max_speed + max_speed*speed_random*(Math.random() - 0.5), 0.05])]);
            if (speed === 0) {
                r_speed = 0;
            }
            runners[data.id].start(r_angle, r_speed, data.amp);
        }
    );

    socket.on('off',
        // when we receive a note off signal, reset, deactivate
        function(data) {
            runners[data.id].reset();
        }
    );

    // set up the initial knob values
    select("#runner-angle").elt.value = angle;
    select("#angle-random").elt.value = angle_random;
    select("#runner-speed").elt.value = speed;
    select("#speed-random").elt.value = speed_random;

    select("#x-send").elt.value = x_send;
    select("#x-phase").elt.value = x_phase;
    select("#y-send").elt.value = y_send;
    select("#y-phase").elt.value = speed_random;

    select("#osc-gain").elt.value = osc_gain;
    select("#osc-width").elt.value = osc_width;
    select("#filter-freq").elt.value = filt_freq;
    select("#filter-Q").elt.value = filt_Q;

    // set up sending the synth params on fiddling with the knobs
    function emit_synth_params() {
        socket.emit("synth_params", {"osc_gain": osc_gain, "osc_width": osc_width, "filt_freq": filt_freq, "filt_Q":filt_Q});
    }

    select("#osc-gain").elt.oninput = function () {
        osc_gain = parseFloat(select("#osc-gain").elt.value);
        emit_synth_params();
    };
    select("#osc-width").elt.oninput = function () {
        osc_width = parseFloat(select("#osc-width").elt.value);
        emit_synth_params();
    };
    select("#filter-freq").elt.oninput = function () {
        filt_freq = parseFloat(select("#filter-freq").elt.value);
        emit_synth_params();
    };
    select("#filter-Q").elt.oninput = function () {
        filt_Q = parseFloat(select("#filter-Q").elt.value);
        emit_synth_params();
    };

    // set up the chuck launching button behavior
    select("#run-chuck").elt.classList.add("btn-outline-success");
    select("#run-chuck").elt.onclick = function () {
        if (chuck_status === 0) {
            select("#run-chuck").elt.classList.remove("btn-outline-success");
            select("#run-chuck").elt.classList.add("btn-outline-danger");
            select("#run-chuck").elt.value = "Stop ChucK";
            chuck_status = 1;
            socket.emit("chuck_on", "msg");
        } else {
            select("#run-chuck").elt.classList.remove("btn-outline-danger");
            select("#run-chuck").elt.classList.add("btn-outline-success");
            select("#run-chuck").elt.value = "Run ChucK";
            chuck_status = 0;
            socket.emit("chuck_off", "msg");
            for (var i = 0; i < runners.length; i++) {
                runners[i].active = 0;
            }
        }
    };

    // set up recording
    select("#rec").elt.classList.add("btn-outline-success");
    select("#rec").elt.onclick = function () {
        if (rec_status === 0) {
            select("#rec").elt.classList.remove("btn-outline-success");
            select("#rec").elt.classList.add("btn-outline-danger");
            select("#rec").elt.value = "Stop Recording";
            rec_status = 1;
            socket.emit("rec", "on");
        } else {
            select("#rec").elt.classList.remove("btn-outline-danger");
            select("#rec").elt.classList.add("btn-outline-success");
            select("#rec").elt.value = "Start Recording";
            rec_status = 0;
            socket.emit("rec", "off");
        }
    };

    // setup the radio button group behavior

    // selectors initial setup
    if (wvform === 0) {
        select("#osc-saw").elt.checked = true;
    //} else if (wvform === 1) {
    //    select("#osc-tri").elt.checked = true;
    } else if (wvfrm === 2) {
        select("#osc-sqr").elt.checked = true;
    }
    if (runner_mode === "0") {
        select("#s-torus").elt.checked = true;
    } else if (runner_mode === "1") {
        select("#s-rp2").elt.checked = true;
    } else if (runner_mode === "2") {
        select("#s-kb").elt.checked = true;
    }
    if (x_dest === 0) {
        select("#x-dest-0").elt.checked = true;
        select("#y-dest-0").elt.disabled = true;
    } else if (x_dest === 1) {
        select("#x-dest-1").elt.checked = true;
        select("#y-dest-1").elt.disabled = true;
    } else if (x_dest === 2) {
        select("#x-dest-2").elt.checked = true;
        select("#y-dest-2").elt.disabled = true;
    } else if (x_dest === 3) {
        select("#x-dest-3").elt.checked = true;
        select("#y-dest-3").elt.disabled = true;
    } else if (x_dest === 4) {
        select("#x-dest-4").elt.checked = true;
        select("#y-dest-4").elt.disabled = true;
    }
    if (y_dest === 0) {
        select("#y-dest-0").elt.checked = true;
        select("#x-dest-0").elt.disabled = true;
    } else if (y_dest === 1) {
        select("#y-dest-1").elt.checked = true;
        select("#x-dest-1").elt.disabled = true;
    } else if (y_dest === 2) {
        select("#y-dest-2").elt.checked = true;
        select("#x-dest-2").elt.disabled = true;
    } else if (y_dest === 3) {
        select("#y-dest-3").elt.checked = true;
        select("#x-dest-3").elt.disabled = true;
    } else if (y_dest === 4) {
        select("#y-dest-4").elt.checked = true;
        select("#x-dest-4").elt.disabled = true;
    }

    // selectors onclick behavior
    function emit_wvform() {
        socket.emit("wvform", {"wvform": parseFloat(wvform)})
    }

    function handle_wvform_click() {
        let wvforms = document.querySelectorAll('input[name="wvform"]');
        let val;
        for (const wvf of wvforms) {
            if (wvf.checked === true) {
                val = wvf.value;
                break;
            }
        }
        if (val !== wvform) {
            wvform = val;
            // emit to chuck
            emit_wvform();
        }
    }

    function handle_surface_click() {
        let surfaces = document.querySelectorAll('input[name="surface"]');
        let val;
        for (const s of surfaces) {
            if (s.checked === true) {
                val = s.value;
                break;
            }
        }
        if (val !== runner_mode) {
            runner_mode = val;
            for (var i = 0; i < n_runners; i++) {
                runners[i].mode = runner_mode;
            }
        }
    }

    function emit_mod_dest() {
        socket.emit("mod_dest", {"x": parseFloat(x_dest), "y": parseFloat(y_dest)})
    }

    function handle_x_dest_click() {
        let xdbs = document.querySelectorAll('input[name="x-dest"]');
        let val;
        for (const xdb of xdbs) {
            if (xdb.checked === true) {
                val = xdb.value;
                break;
            }
        }
        if (val !== x_dest) {
            select("#y-dest-"+x_dest).elt.disabled = false;
            select("#y-dest-"+val).elt.disabled = true;
            x_dest = val;
            // emit to chuck
            emit_mod_dest();
        }
    }

    function handle_y_dest_click() {
        let ydbs = document.querySelectorAll('input[name="y-dest"]');
        let val;
        for (const ydb of ydbs) {
            if (ydb.checked === true) {
                val = ydb.value;
                break;
            }
        }
        if (val !== y_dest) {
            select("#x-dest-"+y_dest).elt.disabled = false;
            select("#x-dest-"+val).elt.disabled = true;
            y_dest = val;
            // emit to chuck
            emit_mod_dest();
        }
    }

    select("#osc-saw").elt.onclick = handle_wvform_click;
    //select("#osc-tri").elt.onclick = handle_wvform_click;
    select("#osc-sqr").elt.onclick = handle_wvform_click;
    select("#s-torus").elt.onclick = handle_surface_click;
    select("#s-rp2").elt.onclick = handle_surface_click;
    select("#s-kb").elt.onclick = handle_surface_click;
    select("#x-dest-0").elt.onclick = handle_x_dest_click;
    select("#x-dest-1").elt.onclick = handle_x_dest_click;
    select("#x-dest-2").elt.onclick = handle_x_dest_click;
    select("#x-dest-3").elt.onclick = handle_x_dest_click;
    select("#x-dest-4").elt.onclick = handle_x_dest_click;
    select("#y-dest-0").elt.onclick = handle_y_dest_click;
    select("#y-dest-1").elt.onclick = handle_y_dest_click;
    select("#y-dest-2").elt.onclick = handle_y_dest_click;
    select("#y-dest-3").elt.onclick = handle_y_dest_click;
    select("#y-dest-4").elt.onclick = handle_y_dest_click;

    frameRate(30);
}

var ran_once = false;

function draw() {
    background(101, 125, 143);
    noStroke();

    // see what is dialed on the knobs
    angle = parseFloat(select("#runner-angle").elt.value);
    angle_random = parseFloat(select("#angle-random").elt.value);
    speed = parseFloat(select("#runner-speed").elt.value);
    speed_random = parseFloat(select("#speed-random").elt.value);
    x_send = parseFloat(select("#x-send").elt.value);
    x_phase = parseFloat(select("#x-phase").elt.value);
    y_send = parseFloat(select("#y-send").elt.value);
    y_phase = parseFloat(select("#y-phase").elt.value);

    if (ran_once) {
        var fr = 30;
        var x_speed = Math.abs(max_speed*speed*Math.sin(angle));
        var y_speed = Math.abs(max_speed*speed*Math.cos(angle));

        var x_bpm = 60*fr*x_speed/500;
        var y_bpm = 60*fr*y_speed/500;

        select("#x-bpm").elt.innerHTML = Number(x_bpm).toFixed(1);
        select("#y-bpm").elt.innerHTML = Number(y_bpm).toFixed(1);
    }
    select("#angle_val").elt.innerHTML = Number(angle * (180/pi)).toFixed(1);

    // draw active runners
    for (let i = 0; i < runners.length; i++) {
        if (runners[i].active === 1) {
            inf = runners[i].draw();
            //console.log(runners[i].x, runners[i].y, runners[i].angle, runners[i].speed*Math.sin(runners[i].angle), -runners[i].speed*Math.cos(runners[i].angle));
            if (runner_mode === "0") {
                runners[i].torus_update();
            }
            if (runner_mode === "1") {
                runners[i].proj_update();
            }
            if (runner_mode === "2") {
                runners[i].klein_update();
            }
        }
    }

    // send info on these runners
    for (let i = 0; i < runners.length; i++) {
        if (runners[i].active === 1) {
            socket.emit("data", process_data(runners[i].data()))
            console.log(process_data(runners[i].data()).x,process_data(runners[i].data()).y);
        }
    }

    ran_once = true;
}

// process data by scaling, adding phase and amplitude
function process_data(data) {
    return {"id": data.id, "x": x_send*Math.sin(2*3.1416*data.x/size + x_phase), "y": y_send*Math.sin(2*3.1416*data.y/size + y_phase)}
    //return {"id": data.id, "x": x_send*Math.sin(3.1416*data.x/size + x_phase), "y": y_send*Math.sin(3.1416*data.y/size + y_phase)}
}