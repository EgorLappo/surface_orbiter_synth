// author: egor alimpiev -- egor at ccrma.stanford.edu
const size = 500;
const x_init = size/2;
const y_init = size/2;
const runner_color = [255, 163, 191];
const runner_size = 20;

function mod(n) {
    return ((n % size) + size) % size;
}

class Runner {
    constructor(id, mode) {
        this.id = id;
        this.active = 0
        this.speed = 0;
        this.angle = 0;
        this.amp = 0;
        this.x = x_init;
        this.y = y_init;
        this.h_len = 7;
        this.history = [];

        // 0 => torus, 1 => projective space, 2 => Klein bottle
        this.mode = mode;
    }

    start(angle, speed, amp) {
        this.active = 1
        this.amp = amp
        this.speed = speed;
        this.angle = angle;
        this.history = [[this.x, this.y]];
    }

    torus_update() {
        var x_speed = this.speed*Math.sin(this.angle);
        var y_speed = -this.speed*Math.cos(this.angle);
        // update position
        this.x += x_speed;
        this.y += y_speed;
        if (this.x < 0) {
            this.x += size;
        }
        if (this.y < 0) {
            this.y += size;
        }
        this.x = mod(this.x);
        this.y = mod(this.y);

        // update history
        if (this.history.length < this.h_len) {
            this.history.push([this.x, this.y]);
        } else {
            this.history.push([this.x, this.y]);
            this.history.shift();
        }

    }

    proj_update() {
        var x_speed = this.speed*Math.sin(this.angle);
        var y_speed = -this.speed*Math.cos(this.angle);
        // update position
        this.x += x_speed;
        this.y += y_speed;
        if (this.x > size) {
            this.y = size - this.y;
            this.angle = 3.1415-this.angle;
        } else if (this.x < 0) {
            this.y = size - this.y;
            this.x += size;
            this.angle = 3.1415-this.angle;
        }
        if (this.y > size) {
            this.x = size - this.x;
            this.angle =  - this.angle;
        } else if (this.y < 0) {
            this.x = size - this.x;
            this.y += size;
            this.angle =  - this.angle;
        }

        this.x = mod(this.x);
        this.y = mod(this.y);

        // update history
        if (this.history.length < this.h_len) {
            this.history.push([this.x, this.y]);
        } else {
            this.history.push([this.x, this.y]);
            this.history.shift();
        }

    }

    klein_update() {
        var x_speed = this.speed*Math.sin(this.angle);
        var y_speed = -this.speed*Math.cos(this.angle);
        // update position
        this.x += x_speed;
        this.y += y_speed;
        if (this.x < 0) {
            this.x += size;
        }
        if (this.y > size) {
            this.x = size - this.x;
            this.angle =  - this.angle;
        } else if (this.y < 0) {
            this.x = size - this.x;
            this.y += size;
            this.angle =  - this.angle;
        }

        this.x = mod(this.x);
        this.y = mod(this.y);

        // update history
        if (this.history.length < this.h_len) {
            this.history.push([this.x, this.y]);
        } else {
            this.history.push([this.x, this.y]);
            this.history.shift();
        }

    }

    draw() {
        // draw point
        var c = color(runner_color[0],runner_color[1],runner_color[2]);
        fill(c);
        ellipse(this.x, this.y, this.amp*runner_size, this.amp*runner_size);
        for (var i = 0; i < this.history.length; i++) {
            var mult = (i+1)/(this.history.length + 2)+0.5;
            c = color(runner_color[0],runner_color[1],runner_color[2],255*mult);
            fill(c);
            ellipse(this.history[i][0], this.history[i][1], mult*this.amp*runner_size, mult*this.amp*runner_size);
        }

        return [this.x, this.y, this.amp]
    }

    data() {
        return {"id": this.id, "x": this.x, "y": this.y}
    }

    reset () {
        this.active = 0;
        this.angle = 0;
        this.speed = 0;
        this.amp = 0;
        this.x = x_init;
        this.y = y_init;
        this.history = [];
    }
}