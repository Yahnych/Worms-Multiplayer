var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = 3000;

function getFiles(name, file) {
    app.get('/'+name, (req, res) => {
        res.sendFile(__dirname+'/'+file);
    })
}
getFiles('/', 'start.html')
getFiles('game.js', 'game.js');

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.hp = 100;
        this.connected = true;
    }
}
class Bullet {
    constructor(x, y, tx, ty, id) {
        this.x = x;
        this.y = y;
        this.richochets = 0;
        let d = Math.sqrt( (tx-x)*(tx-x)+(ty-y)*(ty-y));
        this.dx = (tx-x)/d;
        this.dy = (ty-y)/d;
        this.dx*=10;
        this.dy*=10;
        this.id = id;
        this.dmg = 10;
    }
    move() {
        this.x+=this.dx;
        this.y+=this.dy; 
    }
}
class Weapon {
    constructor(x ,y, type) {
        this.x = x;
        this.y = y;
        this.s = p.s;
        this.type = type;
        if(this.type == 'pistol') {
            this.w = 40;
            this.h = 21;
            this.dmg = 100;
        }
        if(this.type == 'rpg') {
            this.w = 69;
            this.h = 36;
            this.dmg = 200;
        }
        this.bullets = 1000;
        // this.bulletsHolding = bulletsHolding; // ms for the moment to shoot
        this.b = [];
    }
    shoot(tx, ty) {
        if(this.bullets>0) {
            this.bullets--;
            this.b.push(new Bullet(this.x+this.angle, this.y, tx, ty));
        }
    }
    move() {
        this.tx = mouseX;
        this.ty = mouseY;
        for(let i=0;i<this.b.length;i++) {
            if(this.type == 'pistol') {
                this.b[i].move(1);
            }
            if(this.type == 'rpg') {
                this.b[i].move(0.5);
            }
        }
        if(isKeyPressed[65] || isKeyPressed[37]) {this.x-=this.s}
        if(isKeyPressed[68] || isKeyPressed[39]) {this.x+=this.s}
    }
    draw() {
        this.angle = Math.atan2(this.ty-this.y, this.tx-this.x);
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.angle);
        context.fillStyle = "black";
        if(mouseX>this.x) {
            context.fillRect(0, 0, this.w, this.h);
        }else{
            context.fillRect(0, -30, this.w, this.h);
        }
        context.restore();
    }
}

let blocks = 400;
function createTerrain() {
    
    let height = [];
    function smooth(inp) {
        let newHeight = [];
        for(let i=0;i<inp.length-7;i++) {
            newHeight[i] = (inp[i]+inp[i+1]+inp[i+2]+inp[i+3]+inp[i+4]+inp[i+5]+inp[i+6]+inp[i+7])/8;
        }
        return newHeight;
    }
    const px = 40;
    height[0] = 450;
    for(let i=1;i<blocks;i++) {
        height[i] = height[i-1]+Math.floor(Math.random()*px-(px/2));
    }
    return height = smooth(height);
}

let p = [], terrain = createTerrain(), b = [];
console.log(terrain);
let clients = 0, turn = -1;
io.on('connection', (socket) => {
    let id = clients;
    for (let i=0;i<clients;i++){
        if (p[i].x != p[i].x){
            id = i;
            break;
        }
    }
    console.log("Client:",id," has joined.")
    for(let i=0;i<blocks;i++) {
        p[id] = new Player(Math.floor(Math.random()*(blocks*10)), Math.random()*terrain[i]);
    }
    console.log(p[id].y)
    clients++;
    socket.emit('init', p, terrain, id, turn);
    socket.broadcast.emit('players', p[id], id);

    socket.on('move', (p_) => {
        p[id] = p_;
        socket.broadcast.emit('players', p[id], id);
    });
    socket.on('shoot', (tx, ty, id_) => {
        b.push(new Bullet(p[id_].x, p[id_].y, tx, ty, id_));
    });

    socket.on('remove bullet', (id_, b_) => {
        b[id_] = b_;
        b[id_] = b[b.length-1];
        b.pop();
        io.emit('bullets', b);
    });

    socket.on("dead", function(id_) {
        p[id_].connected = false;
        io.emit("players", p[id_],id_,);
    });
 
    socket.on("disconnect", function(){
        p[id].connected = false;
        p[id].x = undefined;
        p[id].y = undefined;
        io.emit("players", p[id], id);
    });
});

function areColliding(Ax, Ay, Awidth, Aheight, Bx, By, Bwidth, Bheight) {
	if (Bx <= Ax + Awidth) {
		if (Ax <= Bx + Bwidth) {
			if (By <= Ay + Aheight) {
				if (Ay <= By + Bheight) {
					return 1;
				}
			}
		}
	}
	return 0;
}

function removeBullet(index) {
    b[index] = b[b.length-1];
    b.pop();
}

function update() {
    for(let i=0;i<b.length;i++) {
        b[i].move();
        for(let j=0;j<p.length;j++) {
            if(areColliding(b[i].x, b[i].y, 5, 5, p[j].x, p[j].y, p[j].w, p[j].h) && p[j].connected) {
                if(b[i].id!=p[j].id) {
                    p[j].hp-=b[i].dmg;
                    removeBullet(i);
                    io.emit("players", p[j], j);
                    break;
                }
            }
        }
        if(i >= b.length) break;
        // for(let j=0;j<terrain.length;j++) {
        //     if(b[i].x<0 || b[i].x>=j*5 || b[i].y<0 || b[i].y>=terrain[j]) {
        //         removeBullet(i);
        //         io.emit('bullets', b);
        //         break
        //     }
        // }
    }
    io.emit('bullets', b);
}
setInterval(update, 10);


http.listen(port, () => {
    console.log(`Server started at port ${port}`);
});