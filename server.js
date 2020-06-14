var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const port = 3000;

function getFiles(name, file) {
    app.get('/'+name, (req, res) => {
        res.sendFile(__dirname+'/'+file);
    })
}
getFiles('', 'start.html')
getFiles('game.js', 'game.js');
getFiles('imgs/Pistol.png', 'imgs/Pistol.png');
getFiles('imgs/Pistol1.png', 'imgs/Pistol1.png');
getFiles('imgs/Bazooka.png', 'imgs/Bazooka.png');
getFiles('imgs/Bazooka1.png', 'imgs/Bazooka1.png');
getFiles('imgs/Lazer.png', 'imgs/Lazer.png');
getFiles('imgs/Lazer1.png', 'imgs/Lazer1.png');
getFiles('imgs/AK-47.png', 'imgs/AK-47.png');
getFiles('imgs/AK-471.png', 'imgs/AK-471.png');
getFiles('imgs/Air strike.png', 'imgs/Air strike.png');
getFiles('imgs/Granade.png', 'imgs/Granade.png');
getFiles('imgs/Dynamite.png', 'imgs/Dynamite.png');
getFiles('imgs/Mine.png', 'imgs/Mine.png');
getFiles('imgs/crosshair.png', 'imgs/crosshair.png');
getFiles('imgs/plane.png', 'imgs/plane.png');
getFiles('imgs/characters/worm1.png', 'imgs/characters/worm1.png');
getFiles('imgs/characters/worm2.png', 'imgs/characters/worm2.png');
getFiles('imgs/characters/worm3.png', 'imgs/characters/worm3.png');
getFiles('music.mp3', 'music.mp3');
getFiles('font.otf', 'font.otf');
getFiles('mycss.css', 'mycss.css');
getFiles('info', 'info.html');
for(let i=0;i<8;i++) {
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
    constructor(x, y, tx, ty, id, dmg, type) {
        this.x = x;
        this.y = y;
        this.richochets = 0;
        let d = Math.sqrt( (tx-x)*(tx-x)+(ty-y)*(ty-y));
        this.dx = (tx-x)/d;
        this.dy = (ty-y)/d;
        this.dx*=10;
        this.dy*=10;
        this.id = id;
        this.dmg = dmg;
        this.bullets = 0;
        this.time = 10;
        this.type = type;
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
class Wall{
    constructor(){
        this.x = Math.floor(Math.random()*blocks*10);
        this.y = Math.floor(Math.random()*100);
        if (Math.random() < 0.5){
            this.w = 100;
            this.h = 10;
        }else{
            this.w = 10;
            this.h = 100;
        }
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
    height[0] = 490;
    for(let i=1;i<blocks;i++) {
        let a = height[i-1]+Math.floor(Math.random()*px-(px/2));
        if(a<200 || a>500) {
            a = height[i-1];
        }
        height[i] = a;
    }
    return height = smooth(height);
}
let w = [];
for (let i=0; i<10; ++i){
    w[i] = new Wall();
}

let p = [], terrain = createTerrain(), b = [];
let clients = 0, turn = 0, playing = false, ids = [];
io.on('connection', (socket) => {
    // ids.push(id);
    let id;
    socket.on('nickname', (name) => {
        playing = true;
            id = clients;
            ids.push(id);
            for (let i=0;i<clients;i++){
                if (p[i].x != p[i].x){
                    id = i;
                    break;
                }
            }
            if(id == clients) clients++;
            console.log("ID:"+id+" has joined", "Clients:"+clients);
            let a = Math.floor(Math.random()*blocks);
            for(let i=0;i<blocks;i++) {
                if(i == a) {
                    p[id] = new Player(i*10, terrain[a]-35, id);
                    p[id].playing = true;
                }
            }
            if(p[id].y == undefined) {
                a = Math.floor(Math.random()*blocks);
                p[id].y = terrain[a];
            }
            p[id].name = name;
            if(p[id].connected) {
                socket.emit('init', p, terrain, id, turn, w);
                socket.broadcast.emit('players', p[id], id);
                io.emit('clients', clients);
            }
    });
    socket.on('change nickname', (id_, nick) => {
        p[id_].name = nick
        io.emit('players', p[id_], id_);
    })
    socket.on("disconnect", () => {
        if(playing && p[id] != undefined) {
            p[id].x = undefined;
            p[id].y = undefined
            p[id].connected = false;
            playing = false;
            clients--;
            console.log("Disconnected:"+id+" clients:"+clients);
            for(let i=0;i<p.length;i++) {
                if(id>clients-1) turn = 0; io.emit('turn');
                if(id<turn+1 && turn) p[i].id--; io.emit('players', p[i], p[i].id);io.emit('turn');
            }
            p[id] = p[p.length-1];
            p.pop();
            io.emit('clients', clients)
            io.emit("disconnected", id);
            console.log(clients)
        }
    });
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
            if(turn>clients-1) {
                turn = 0;
            }
            io.emit('turn', turn);
        }
    });
    socket.on('timer', (time) => {
        socket.broadcast.emit('timer', time); 
    });
    socket.on('shoot', (tx, ty, id_, type_) => {
        if(turn == id_ && id_!=undefined) {
            turn++;
            if(turn>clients-1 && playing && p[id_].connected) {
                turn = 0;
            }
            if(type_ == 'Pistol') {
                b.push(new Bullet(p[id_].x+15, p[id_].y+15, tx, ty, id_, 10, type_));
            }
            if(type_ == 'AK-47') {
                let ms = 0;
                let a = () => {
                    if(ms>100) {
                        return;
                    }
                    ms++;
                    if(ms%10==0) {
                        b.push(new Bullet(p[id_].x+15, p[id_].y+15, tx, ty, id_, 5, type_));
                    }
                    
                }
                setInterval(a,10);
            }
            if(type_ == 'Bazooka') {
                b.push(new Bullet(p[id_].x+15, p[id_].y+15, tx, ty, id_, 100, type_));
            }
            if(type_ == 'Lazer') {
                let ms = 0;
                let a = () => {
                    if(ms>100) return;
                    ms++;
                    if(ms%5 == 0) {
                        b.push(new Bullet(p[id_].x+15, p[id_].y+15, tx, ty, id_, 1, type_));
                    }
                }
                setInterval(a,10);
            }
            io.emit('turn', turn);
        }
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
        if(p[id_] != undefined) {
            p[id_].x = undefined;
            p[id_].y = undefined
            p[id_].connected = false;
            playing = false;
            clients--;
            io.emit('clients', clients);
            if(id_>id) turn++;
            if(turn>clients-1) turn = 0;
            p[id_] = p[p.length-1];
            p.pop();
            io.emit("disconnected", id_);
        }
    });
    
    socket.on('new id', (id_) => {
        id = id_;
        socket.broadcast.emit('players', p[id], id);
    })
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
        if(b[i]==undefined) break;
        if(b[i].x<=0 || b[i].x>=4000 || b[i].y<=0 || b[i].y>=4000 ) {
            b[i] = b[b.length-1];
            b.pop();
            break;
        }else{
            b[i].move();
        }
        for(let j=0;j<w.length;j++) {
            if(areColliding(b[i].x, b[i].y, 6, 6, w[j].x, w[j].y, w[j].w, w[j].h)) {
                if(b[i].type == "Lazer") {
                    if(w[j].w == 10) {
                        b[i].dx *= -1;
                    }else{
                        b[i].dy *= -1;
                    }
                }else{
                    b[i] = b[b.length-1];
                    b.pop();
                    break;
                }
                return;
            }
        }
        for(let j=0;j<p.length;j++) {
            if(b[i]!=undefined && areColliding(b[i].x, b[i].y, 6, 6, p[j].x, p[j].y, p[j].w, p[j].h) && p[j].connected && p[j].id!=b[i].id) {
                if(b[i].id!=p[j].id) {
                    p[j].hp-=b[i].dmg;
                    removeBullet(i);
                    io.emit("players", p[j], j);
                    break;
                }
            }
        }
        for(let j=0;j<blocks;j++) {
            if(b[i]!=undefined && areColliding(j*(10), terrain[j], 10, 10, b[i].x, b[i].y, 6, 6)) {
                if(b[i].type == 'Bazooka') {
                    if(b[i]!=undefined && areColliding(j*(10), terrain[j], 10, 10, b[i].x, b[i].y, 6, 6)) {
                        terrain[j] += 100;
                        terrain[j-1] += 90;
                        terrain[j+1] += 90;
                        terrain[j-2] += 80;
                        terrain[j+2] += 80;
                        terrain[j-3] += 70;
                        terrain[j+3] += 70;
                        terrain[j-4] += 60;
                        terrain[j+4] += 60;
                        terrain[j-5] += 50;
                        terrain[j+5] += 50;
                        terrain[j-6] += 40;
                        terrain[j+6] += 40;
                        terrain[j-7] += 30;
                        terrain[j+7] += 30;
                        terrain[j-8] += 20;
                        terrain[j+8] += 20;
                        terrain[j-9] += 10;
                        terrain[j+9] += 10;
                        io.emit('terrain', terrain);
                    }
                }
                b[i] = b[b.length-1];
                b.pop();
                break;
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