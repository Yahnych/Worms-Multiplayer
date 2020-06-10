var socket = io();
function lerp(a, b, t) {
	return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
}

function p3curve(a, b, c, t) {
	let l0 = lerp(a, b, t);
	let l1 = lerp(b, c, t);
	return lerp(l0, l1, t);
}

function p4curve(a, b, c, d, t) {
	let l0 = p3curve(a, b, c, t);
	let l1 = p3curve(b, c, d, t);
	return lerp(l0, l1, t);
}

const bs = 10, blocks = 100;
let p = [], id = -1, height = [];
let b = [];
let turn, terrfunc;

socket.on('init', (p_, terr, id_, turn_) => {
    p = p_;
    height = terr;
    id = id_;
    turn = turn_;
});
socket.on('turn', (turn_) => {
    turn = turn_;
});
socket.on('players', (p_, id_) => {
    p[id_] = p_;
});
socket.on('bullets', (b_) => {
    b = b_;
});
let isDead = false;
function update() {
    if(id == -1 && turn!=id) return;
    let isMoving = false, s = 3, isFly = true;
    if(isFly) {
        isMoving = true;
        p[id].y+=s;
    }
    if(isKeyPressed[65]) {p[id].x-=s;isMoving = true}
    if(isKeyPressed[68]) {p[id].x+=s;isMoving = true}
    if(p[id].x<=0) {p[id].x = 0; isMoving = true;}
    if(p[id].x>=blocks*bs-100) {p[id].x = blocks*bs-100; isMoving = true;}
    for(let i=0;i<blocks;i++) {
        if(areColliding(p[id].x, p[id].y, p[id].w, p[id].h, i*bs, height[i], bs, bs)) {
            p[id].y = height[i]-p[id].h;
            isFly = false;
        }
        for(let j=0;j<b.length;j++) {
            if(areColliding(i*bs, height[i], bs, bs, b[j].x, b[j].y, 3, 3)) {
                socket.emit('remove bullet', b[j], j);
            }
        }
    }
    if(isMoving) {
        socket.emit('move', p[id]);
    }
    if(p[id].hp<=0) {
        p[id].connected = false;
        socket.emit('dead', id);
    }
}

function drawHealthbar(x, y, helth, maxHelth) {
    context.fillStyle = "red";
    context.fillRect(x,y,maxHelth, 10);
    context.fillStyle = "green";
    context.fillRect(x,y,helth,10);
}

function minimap() {
    context.save();
    context.scale(0.1, 0.1);
    context.strokeRect(0,0,2000, canvas.height);
    for(let i=0;i<p.length;i++) {
        if(p[i].connected) {
            if(i==id) context.fillStyle = "red"; else context.fillStyle = "blue";
            context.fillRect(p[i].x, p[i].y, p[i].w, p[i].h);
            // context.fillRect(p[i].x+(p[i].w/2)-p[i].hp/2, p[i].y-15, p[i].hp, 5);
            drawHealthbar(p[i].x+(p[i].w/2)-50, p[i].y-15, p[i].hp, 100)
        }
    }
    context.fillStyle = 'black';
    for(let i=0;i<blocks-2;i+=2) {
        for(let j=0;j<1;j+=.05) {
            let a = {x:i*bs, y:height[i]}
            let b = {x:(i+1)*bs, y:height[i+1]}
            let c = {x:(i+2)*bs, y:height[i+2]}
            // let d = {x:(i+3)*bs, y:height[i+3]}
            let e = p3curve(a, b, c, j);
            context.fillRect(e.x, e.y, bs, bs);
        }
    }
    for(let i=0;i<blocks;i++) {
    }
    context.restore();
}

function draw() {
    context.save();
    // context.translate();
    // context.strokeRect(0,0,800,600);
    for(let i=0;i<p.length;i++) {
        if(p[i].connected) {
            if(i==id) context.fillStyle = "red"; else context.fillStyle = "blue";
            context.fillRect(p[i].x, p[i].y, p[i].w, p[i].h);
            // context.fillRect(p[i].x+(p[i].w/2)-p[i].hp/2, p[i].y-15, p[i].hp, 5);
            drawHealthbar(p[i].x+(p[i].w/2)-50, p[i].y-15, p[i].hp, 100)
        }
    }
    context.fillStyle = 'black';
    for(let i=0;i<b.length;i++) {
        context.beginPath();
        context.arc(b[i].x, b[i].y, 3, 0, 2*Math.PI);
        context.fill();
    }
    for(let i=0;i<blocks;i+=1) {
        for(let j=0;j<1;j+=.05) {
            let a = {x:i*bs, y:height[i]}
            let b = {x:(i-1)*bs, y:height[i-1]}
            let c = {x:(i-2)*bs, y:height[i-2]}
            // let d = {x:(i+3)*bs, y:height[i+3]}
            let e = p3curve(a, b, c, j);
            context.fillRect(e.x, e.y, bs, bs);
        }
    }
    minimap();
    context.restore();
}

function keyup(key) {
	console.log("KEY:",key);
}
function mouseup() {
    console.log("X:",mouseX,"Y:", mouseY);
    if(p[id].connected && turn!=id) {
        socket.emit('shoot', mouseX, mouseY, id);
    }
}