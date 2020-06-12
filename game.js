var socket = io();
endlessCanvas = true;
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

const bs = 10, blocks = 200;
let p = [], id = -1, height = [];
let b = [];
let turn, terrfunc, players = 0;
let waiting = true;

socket.on('init', (p_, terr, id_, turn_) => {
    p = p_;
    height = terr;
    id = id_;
});
socket.on('players', (p_, id_) => {
    p[id_] = p_;
});
socket.on('user', (p_, id_) => {
    p[id_].name = p_;
});
socket.on('bullets', (b_) => {
    b = b_;
});
socket.on('terrain', (terrain_) => {
    height = terrain_;
});
socket.on('clients', (clients) => {
    players = clients;
    if(players>0) {
        waiting = false;
        socket.emit('play');
    }
});
socket.on('play', (turn_) => {
    waiting = false;
    turn = turn_;
});
socket.on('turn', (turn_) => {
    turn = turn_;
});
let isDead = false;

let inveontoryGrid = [], images = [];
for(let x=0;x<2;x++) {
    inveontoryGrid[x] = [];
    for(let y=0;y<4;y++) {
        inveontoryGrid[x][y] = 0;
    }
}

inveontoryGrid[0][0] = 'Pistol';inveontoryGrid[1][0] = 'AK-47';
inveontoryGrid[0][1] = 'Lazer';inveontoryGrid[1][1] = 'Mine';
inveontoryGrid[0][2] = 'Granade';inveontoryGrid[1][2] = 'Air strike';
inveontoryGrid[0][3] = 'Dynamite';inveontoryGrid[1][3] = 'Bazooka';

for(let i=0;i<8;i++) {
    images[i] = new Image();
    images[i].src = 'imgs/inv/'+i+'.png';
}
let d = -200;
let invX = 0, invY = 210;
function update() {
    if(id == -1 && turn!=id) return;
    let isMoving = false, s = 3, isFly = true;
    if(isFly) {
        isMoving = true;
        p[id].y+=5;
    }
    if(showInventory) d+=8;
    if(showInventory==false) d -=8;
    if(d>10) d = 10;
    if(d<=-150) d = -150;
    if(isKeyPressed[65]) {p[id].x-=s;isMoving = true}
    if(isKeyPressed[68]) {p[id].x+=s;isMoving = true}
    if(p[id].x<=0) {p[id].x = 0; isMoving = true;}
    if(p[id].x>=blocks*bs-100) {p[id].x = blocks*bs-100; isMoving = true;}
    for(let i=0;i<blocks;i++) {
        if(areColliding(p[id].x, p[id].y, p[id].w, p[id].h, i*bs, height[i], bs, bs)) {
            p[id].y = height[i]-p[id].h;
            isFly = false;
        }
    }
    for(let i=0;i<blocks*2;i++) {
        for(let j=0;j<b.length;j++) {
            if(areColliding(i*(bs/2), height[i/2], bs/2, bs/2, b[j].x, b[j].y, 6, 6)) {
                socket.emit('remove bullet', j, b[j])
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
    if(turn == id) {
        p[id].time-=1;
    }
}
function timer() {
    if(turn == id && waiting == false) {
        p[id].time-=1;
        console.log(p[id].time, id)
        if(p[id].time<0) {
            socket.emit('end turn', id);
            p[id].time = 60;
        }
    }
}
setInterval(timer, 1000);

function drawWeapon(w, h, image) {
    let angle = Math.atan2(mouseY-p[id].y, mouseX-p[id].x);
    context.save();
    context.translate(p[id].x+(p[id].w/2), p[id].y+(p[id].h/2));
    context.rotate(angle);
    if(mouseX>p[id].x) {
        context.drawImage(image, 0, 0, w, h);
    }else{
        context.drawImage(image, -30, 0, w, h);
    }
    context.restore();
}
function drawWeapon2(w, h, image, image2) {
    let angle = Math.atan2(mouseY-p[id].y, mouseX-p[id].x);
    context.save();
    context.translate(p[id].x+(p[id].w/2), p[id].y+(p[id].h/2));
    context.rotate(angle);
    if(mouseX>p[id].x) {
        context.drawImage(image, 0, 0, w, h);
    }else{
        context.drawImage(image2, 0, -30, w, h);
    }
    context.restore();
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

let inbs = 60; 
function draw() {
    context.save();
        // context.translate();
        // context.strokeRect(0,0,800,600);
        if(waiting) {
            context.font = "40px Arial";
            context.fillStyle = "black";
            context.fillText("Waiting for players...", canvas.width/2-context.measureText("Waiting for players...").width/2, canvas.height/2);
            context.font = "20px Arial";
            context.fillText("Players:"+players+"/2", canvas.width/2-context.measureText("Players:"+players+"/2").width/2, canvas.height/2+50);
        }else{
            for(let i=0;i<p.length;i++) {
                if(p[i].connected) {
                    if(i==id) context.fillStyle = "red"; else context.fillStyle = "blue";
                    context.fillRect(p[i].x, p[i].y, p[i].w, p[i].h);
                    // context.fillRect(p[i].x+(p[i].w/2)-p[i].hp/2, p[i].y-15, p[i].hp, 5);
                    drawHealthbar(p[i].x+(p[i].w/2)-50, p[i].y-15, p[i].hp, 100);
                    context.font = "20px Arial";
                    context.fillStyle = "black";
                    context.fillText(p[i].name, p[i].x-(context.measureText(p[i].name).width)/2, p[i].y-35);
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
            context.fillStyle = 'black';
            invX=d;
            context.strokeRect(invX,invY-40,2*(inbs+.7),40);
            for(let x=0;x<2;x++) {
                for(let y=0;y<4;y++) {
                    context.font = '30px Arial';
                    context.lineWidth = 2;
                    if(areColliding(invX+x*(inbs+1), invY+y*(inbs+1), inbs, inbs, mouseX, mouseY, 0.5, 0.5)) {
                        context.fillText(inveontoryGrid[x][y],invX+(2*inbs-(context.measureText(inveontoryGrid[x][y]).width))/2, invY-10);
                        context.lineWidth = 5;
                    }else{
                        context.lineWidth = 2;
                    }
                    context.strokeRect(invX+x*(inbs+1), invY+y*(inbs+1), inbs, inbs);
                    context.drawImage(images[x*4+y], invX+x*(inbs+1), invY+y*(inbs+1), inbs, inbs);
                    context.lineWidth = 2;
                }
            }
            // inveontoryGrid[0][0] = 'Pistol';inveontoryGrid[1][0] = 'AK-47';
            // inveontoryGrid[0][1] = 'Lazer';inveontoryGrid[1][1] = 'Mine';
            // inveontoryGrid[0][2] = 'Granade';inveontoryGrid[1][2] = 'Air strike';
            // inveontoryGrid[0][3] = 'Dynamite';inveontoryGrid[1][3] = 'Bazooka';
        if(selected=='Pistol' || selected=='AK-47' || selected=='Bazooka' || selected=='Lazer') {
            let weaponImage = new Image(), weaponImage2 = new Image();
            weaponImage.src = 'imgs/'+selected+'.png';
            weaponImage2.src = 'imgs/'+selected+'1.png';
            drawWeapon2(50, 31, weaponImage, weaponImage2);
        }else if(selected!=undefined) {
            let weaponImage = new Image(), weaponImage2 = new Image();
            weaponImage.src = 'imgs/'+selected+'.png';
            drawWeapon(50, 31, weaponImage, weaponImage2);
        }
    }
    context.restore();
}

let showInventory = false;
function keyup(key) {
    if(key == 73 && waiting == false ) {
        showInventory = !showInventory;
    }
	console.log("KEY:",key);
}
let selected, clicks = 0;
function mouseup() {
    console.log("X:",mouseX,"Y:", mouseY);
    if(showInventory && waiting == false) {
            let x = Math.floor((mouseX-invX)/inbs);
            let y = Math.floor((mouseY-invY)/inbs);
            if(x>=0 && y>=0 && x<2 && y<4) {
            showInventory = false;
            selected = inveontoryGrid[x][y];
            clicks++;
            console.log(selected);
        }
    }
    if(selected!=undefined && waiting == false ) clicks++;
    if(p[id].connected && selected != undefined && clicks>2 && waiting == false) {
        socket.emit('shoot', mouseX, mouseY, id, selected);
    }
}