// author: egor alimpiev -- egor at ccrma.stanford.edu
// ---------------------------------------------------------------------------------------------------------------------
// OSCILLATOR CLASS

class Oscillator extends Chugraph
{
    SawOsc sw => Gain m;
    SqrOsc sq => m;
    TriOsc t => m;
    m => outlet;

    0.0 => float gn;
    440.0 => float fr;
    0.5 => float o_width;
    0 => int status;

    0.0 => t.gain => sq.gain;
    1.0 => sw.gain;

    fun float gain(float g) {
        g => gn => m.gain;
        return gn;
    }

    fun float gain() {
        return gn;
    }

    fun float freq(float f) {
        f => fr => sq.freq => sw.freq => t.freq;
        return fr;
    }

    fun float freq() {
            return fr;
    }

    fun float width(float wth) {
        wth => o_width => sq.width => sw.width => t.width;
        return o_width;
    }

    fun float width() {
        return o_width;
    }

    fun void connect(int type) {
        0.0 => t.gain => sq.gain => sw.gain;
        type => status;
        if (status == 0) {
            1.0 => sw.gain;
            <<< "connecting saw", sw.gain(), t.gain(), sq.gain() >>>;
        } else if (status == 1) {
            1.0 => t.gain;
            <<< "connecting tri", sw.gain(), t.gain(), sq.gain() >>>;
        } else if (status == 2) {
            1.0 => sq.gain;
            <<< "connecting sqr", sw.gain(), t.gain(), sq.gain() >>>;
        }
    }
}
// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// INIT

// bpm = 108
60 => float bpm;
(60.0/bpm)::second => dur beat => dur eighth;
2*beat => dur quarter;
2*quarter => dur half;
2*half=> dur whole;
beat/2 => dur sixteenth;
[sixteenth, quarter, eighth, half, whole] @=> dur durations[];

// default parameters
20 => int n_voices;
//150::ms => dur A_default;
10::ms => dur A_default;
10::ms => dur D_default;
0.5 => float S_default;
300::ms => dur R_default;
0.9 => float mod_amount;

0.5 => float osc_gain;
0.5 => float osc_width;
float osc_freqs[n_voices];
1.0 => float filt_Q;
5000 => float filt_freq;

// 0 = saw; 1 => triangle; 2 => square;
0 => int wvform;

// store recording process id; -1 ifnot recording
-1 => int recording;

// parameters available for modulation:
// 0 - oscillator gain
// 1 - oscillator frequency/pitch
// 2 - oscillator width
// 3 - filter frequency
// 4 - filter resonance

3 => int x_mod_dest;
0 => int y_mod_dest;

[-5, -2, 0, 3, 5, 7, 10] @=> int melody_scale[];
69 - 12 => int A;

// define OSC receiver, emitter
"localhost" => string hostname;
6449 => int port;
OscOut xmit;
xmit.dest( hostname, port );

// connect all the voices
Oscillator oscillators[n_voices];
LPF filters[n_voices];
ADSR envelopes[n_voices];
Gain master => NRev r => dac;
0.05 => master.gain;
0.07 => r.mix;

for( 0 => int i; i < n_voices ; i++ ) {
    oscillators[i] => filters[i] => envelopes[i] => master;
    envelopes[i].set(A_default,D_default,S_default,R_default);
    10.0 => osc_freqs[i];
    wvform => oscillators[i].connect;
    0 => oscillators[i].gain;
    filt_freq => filters[i].freq;
}

// MIDI
1 => int device;
MidiIn min;
MidiMsg msg;
if( !min.open( device ) ) me.exit();

class NoteEvent extends Event
{
    int note;
    int velocity;
}


NoteEvent on;
Event off_ev[128];
Event @ us[128];

// handler shred for a single voice
fun void handler(int id)
{
    int note;

    // inifinite time loop
    while( true )
    {
        on => now;
        on.note => note;
        osc_gain => oscillators[id].gain;
        Std.mtof(note) => oscillators[id].freq;
        oscillators[id].freq() => osc_freqs[id];
        //<<< Std.mtof(note), oscillators[id].freq(), oscillators[id].gain() >>>;

        envelopes[id].keyOn();

        xmit.start( "/on" );
        id => xmit.add;
        // "amplitude"
        osc_gain => xmit.add;
        xmit.send();

        off_ev[note] => now;
        envelopes[id].keyOff();
        0 => oscillators[id].gain;

        xmit.start( "/off" );
        id => xmit.add;
        xmit.send();
        500::ms => now;
    }
}

// spork handlers, one for each voice
for( 0 => int i; i < 20; i++ ) spork ~ handler(i);

// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// PLAYING LOOP

spork ~ listen_and_update();
spork ~ listen_for_control();

while( true )
{
    // wait on midi event
    min => now;

    // get the midimsg
    while( min.recv( msg ) )
    {
        // catch only noteon
        if( msg.data1 == 128 ) {
            off_ev[msg.data2].broadcast();
            continue;
        }

        // check velocity
        if( msg.data3 > 0 )
        {
            // store midi note number
            msg.data2 => on.note;
            // store velocity
            msg.data3 => on.velocity;
            // signal the event
            on.signal();
            // yield without advancing time to allow shred to run
            me.yield();
        }
        else
        {
            if( us[msg.data2] != null ) us[msg.data2].signal();
        }
    }
}


// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// OSC SETUP

fun float bound(float val, float min_val, float max_val) {
    return Math.max(Math.min(val, max_val),min_val);
}

fun void listen_for_control() {
    OscIn oin_control;
    OscMsg msg_control;
    6505 => oin_control.port;
    oin_control.listenAll();

    while(true) {
        oin_control => now;

        oin_control.recv(msg_control);
        msg_control.address => string address;

        if (address == "/chuck_mod_dest") {
            msg_control.getInt(0) => x_mod_dest;
            msg_control.getInt(1) => y_mod_dest;
            // <<< x_mod_dest, y_mod_dest >>>;
        } else if (address == "/chuck_synth_params") {
            // available parameters
            // 0 - oscillator gain
            // 1 - oscillator width
            // 2 - filter frequency
            // 3 - filter resonance
            // <<< "got param update" >>>;
            msg_control.getFloat(0) => osc_gain;
            msg_control.getFloat(1) => osc_width;
            msg_control.getFloat(2) => filt_freq;
            msg_control.getFloat(3) => filt_Q;
        } else if (address == "/chuck_wvform") {
            msg_control.getInt(0) => int wave;
            <<< wave >>>;
            for ( 0 => int j; j < n_voices; j++ ) {
                wave => oscillators[j].connect;
            }
        } else if (address == "/chuck_rec") {
            if (recording == -1) {
                <<< "rec.ck start" >>>;
                msg_control.getString(0) => string name;
                Machine.add("rec.ck:"+name) => recording;
            } else {
                <<< "rec.ck stop" >>>;
                Machine.remove(recording);
                -1 => recording;
            }
        }
    }
}

fun void listen_and_update() {
    OscIn oin_param;
    OscMsg msg_param;
    6500 => oin_param.port;
    // receive msg as (voice_id, x_value, y_value) with values scaled from -1 to 1
    oin_param.addAddress( "/chuck_mod_params, i f f" );

    while( true )
    {
        oin_param => now;
        while( oin_param.recv(msg_param) )
        {

            msg_param.getInt(0) => int id;
            msg_param.getFloat(1) => float x;
            msg_param.getFloat(2) => float y;

            // parameters available for modulation:
            // 0 - oscillator gain
            // 1 - oscillator frequency/pitch
            // 2 - oscillator width
            // 3 - filter frequency
            // 4 - filter resonance

            //<<< id, x, y >>>;

            osc_gain => oscillators[id].gain;
            osc_freqs[id] => oscillators[id].freq;
            osc_width => oscillators[id].width;
            filt_freq => filters[id].freq;
            filt_Q => filters[id].Q;

            if (x_mod_dest == 0) {
                bound(osc_gain + mod_amount*osc_gain*x, 0.0, 1.0) => oscillators[id].gain;
            } else if (x_mod_dest == 1) {
                bound(osc_freqs[id] + mod_amount*osc_freqs[id]*x, 0.0, 14000.0) => oscillators[id].freq;
            } else if (x_mod_dest == 2) {
                bound(osc_width + mod_amount*osc_width*x, 0.0, 1.0) => oscillators[id].width;
            } else if (x_mod_dest == 3) {
                bound(filt_freq + mod_amount*filt_freq*x, 0.0, 14000.0) => filters[id].freq;
            } else if (x_mod_dest == 4) {
                bound(filt_Q + mod_amount*filt_Q*x, 0.2, 8.0) => filters[id].Q;
            }

            if (y_mod_dest == 0) {
                bound(osc_gain + mod_amount*osc_gain*y, 0.0, 1.0) => oscillators[id].gain;
            } else if (y_mod_dest == 1) {
                bound(osc_freqs[id] + mod_amount*osc_freqs[id]*y, 0.0, 14000.0) => oscillators[id].freq;
            } else if (y_mod_dest == 2) {
                bound(osc_width + mod_amount*osc_width*y, 0.0, 1.0) => oscillators[id].width;
            } else if (y_mod_dest == 3) {
                bound(filt_freq + mod_amount*filt_freq*y, 0.0, 14000.0) => filters[id].freq;
            } else if (x_mod_dest == 4) {
                bound(filt_Q + 3*mod_amount*filt_Q*y, 0.2, 8.0) => filters[id].Q;
            }
        }
    }
}