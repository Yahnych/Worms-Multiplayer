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
getFiles('loading.gif', 'imgs/loading.gif');
for(let i=0;i<16;i++) {
    getFiles('imgs/inv/'+i+'.png', 'imgs/inv/'+i+'.png');
}

class Player {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.name = '';
        this.time = 60;
        this.id = id;
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
        this.type = 'none';
    }
    move() {
        this.x+=this.dx;
        this.y+=this.dy; 
    }
    remove() {
        if(this.x<=0 || this.y<=0 || this.x>=4000 || this.y>=1000) {
            return 1;
        }
        return 0;
    }
}
let blocks = 200;
function createTerrain() {
    
    let height = [];
    function smooth(inp) {
        let newHeight = [];
        for(let i=0;i<inp.length-7;i++) {
            newHeight[i] = (inp[i]+inp[i+1]+inp[i+2]+inp[i+3]+inp[i+4]+inp[i+5]+inp[i+6]+inp[i+7])/8;
        }
        return newHeight;
    }
    const px = 70;
    height[0] = 500;
    for(let i=1;i<blocks;i++) {
        height[i] = height[i-1]+Math.floor(Math.random()*px-(px/2));
    }
    return height = smooth(height);
}

let p = [], terrain = createTerrain(), b = [];
// console.log(terrain);
let clients = 0, turn = 0;
io.on('connection', (socket) => {
    let id = clients;
    for (let i=0;i<clients;i++){
        if (p[i].x != p[i].x){
            id = i;
            break;
        }
    }
    if(id == clients) clients++;
    console.log("ID:"+id+" has joined", "Clients:"+clients);
    p[id] = new Player();
    let a = Math.floor(Math.random()*blocks);
    for(let i=0;i<blocks;i++) {
        if(i == a) {
            p[id] = new Player(i*10, terrain[a], id);
        }
    }
    if(p[id].y == undefined) {
        a = Math.floor(Math.random()*blocks);
        p[id].y = terrain[a];
    }
    socket.emit('init', p, terrain, id, turn);
    socket.broadcast.emit('players', p[id], id);
    io.emit('clients', clients);
    socket.on('play', () => {
        io.emit('play', turn);
    });
    socket.on('move', (p_) => {
        p[id] = p_;
        socket.broadcast.emit('players', p[id], id);
    });
    socket.on('end turn', (id_) => {
        if(turn == id_) {
            turn++;
            io.emit('turn', turn);
            console.log(id_+" finish the turn.")
        }
        if(turn>clients-1) {
            turn = 0;
        }
    });
    socket.on('shoot', (tx, ty, id_, type_) => {
        b.push(new Bullet(p[id_].x+15, p[id_].y+15, tx, ty, id_));
    });

    socket.on('remove bullet', (id_, b_) => {
        b[id_] = b_;
        b[id_] = b[b.length-1];
        b.pop();
        io.emit('bullets', b);
    });

    socket.on('terrain', (terrain_) => {
        terrain = terrain_;
        socket.broadcast.emit('terrain', terrain);
    })

    socket.on("dead", function(id_) {
        p[id_].connected = false;
        io.emit("players", p[id_],id_,);
    });
 
    socket.on("disconnect", function(){
        p[id].connected = false;
        p[id].x = undefined;
        p[id].y = undefined;
        clients--;
        io.emit('clients', clients);
        console.log("Disconnected:"+clients);
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
        if(b[i].x<=0 || b[i].x>=4000 || b[i].y<=0 || b[i].y>=4000) {
            b[i] = b[b.length-1];
            b.pop();
            break;
        }
        for(let j=0;j<p.length;j++) {
            if(areColliding(b[i].x, b[i].y, 5, 5, p[j].x, p[j].y, p[j].w, p[j].h) && p[j].connected && p[j].id!=b[i].id) {
                if(b[i].id!=p[j].id) {
                    p[j].hp-=b[i].dmg;
                    removeBullet(i);
                    io.emit("players", p[j], j);
                    break;
                }
            }
        }
        if(i >= b.length) break;
    }
    io.emit('bullets', b);
}
setInterval(update, 10);


http.listen(port, () => {
    console.log(`Server started at port ${port}`);
});