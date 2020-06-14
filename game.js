var socket = io();
let musicc = new Audio('music.mp3'), menu = 0;

function changeVolume() {
    let slider = document.getElementById('myRange');
    musicc.volume = slider.value/100;
}

let joined = false;
function startgame() {
    showedMenu = false;
    let nickname = document.getElementById('nickname').value;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('canvas-id').style.display = 'block';
    if(joined == false) {
        socket.emit('nickname', nickname);
        menu = 1;
    }else{
        socket.emit('change nickname', id, nickname);
    }
}

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
let b = [], w = [];
let turn, terrfunc, players = 0;
let waiting = true;
let clientTimer = -1;
let showInventory = false;
let isGranade = false;
let cam = {x:0, y:0, dir:0}

if(true) {
socket.on('init', (p_, terr, id_, turn_, w_) => {
    joined = true;
    p = p_;
    w = w_;
    height = terr;
    id = id_;
    for(let i=0;i<blocks;i++) {
        if(areColliding(p[id].x, p[id].y, p[id].w, p[id].h, i*bs, height[i], bs, bs)) {
            p[id].y = height[i]-p[id].h;
            isFly = false;
            socket.emit('move', p[id])
        }
    }
});
socket.on('players', (p_, id_) => {
    p[id_] = p_;
    p[id_].id = id_;
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
socket.on('disconnected', (id_) => {
    updates = 10000, realtime = 11;
    p[id_] = p[p.length-1];
    p.pop();
    if(id>id_) {
        id--;
        socket.emit('new id', id);
    }
});
socket.on('clients', (clients) => {
    players = clients;
    if(players>=2) {
        waiting = false;
        socket.emit('play');
    }else{
        if(menu!=2) {
            waiting = true; 
        }
    }
});
socket.on('play', (turn_) => {
    waiting = false;
    turn = turn_;
    seconds = 10;
});
socket.on('turn', (turn_) => {
    if(b.length == 0) {
        turn = turn_;
    }
    if(turn != id) {
        selected = undefined
    }
});
socket.on('timer', (time) => {
    clientTimer = time;
});
}
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
let updates = 10000, realtime = 10, dcam = 0;
function update() {
    if(id == -1 || menu == 0) return;
    console.log(p)
    if(waiting) {
        socket.emit('dead');
    }
    for(let i=0;i<p.length;i++) {
        if(i == turn) {
            cam.x = p[i].x-canvas.width/2+p[i].w;
            if(cam.x<=0) cam.x = 0;
            if(cam.x>=blocks*bs-100) cam.x = blocks*bs-100;
            if(p[i].y>450) {
                cam.y = 25;
            }else{
                cam.y = 0;
            }
        }
    }
    if(showedMenu == false && turn == id) {
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
        if(isMoving) {
            socket.emit('move', p[id]);
        }
        if(p[id].hp<=0 || p[id].y>500) {
            p[id].connected = false;
            menu = 2;
            socket.emit('dead', id);
            id = -1
        }
    }
}
let seconds = 10;
function timer() {
    if(turn == id) {
        seconds--
        socket.emit('timer', seconds);
        if(seconds<0) {
            socket.emit('end turn', id);
            seconds = 10;
        }
    }
}
setInterval(timer, 1000);

function drawWeapon(w, h, image) {
    context.save();
    let angle = Math.atan2((cam.y+mouseY)-p[id].y, (cam.x+mouseX)-p[id].x);
    context.translate(p[id].x+(p[id].w/2), p[id].y+(p[id].h/2));
    context.rotate(angle);
    if(cam.x+mouseX>p[id].x) {
        context.drawImage(image, 0, 0, w, h);
    }else{
        context.drawImage(image, -30, 0, w, h);
    }
    context.restore();
}
function drawWeapon2(w, h, image, image2) {
    context.save();
    let angle = Math.atan2((cam.y+mouseY)-p[id].y, (cam.x+mouseX)-p[id].x);
    context.translate(p[id].x+(p[id].w/2), p[id].y+(p[id].h/2));
    context.rotate(angle);
    if(cam.x+mouseX>p[id].x) {
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
    for(let i=0;i<w.length;i++) {
        context.fillRect(w[i].x, w[i].y, w[i].w, w[i].h);
    }
    context.fillStyle = 'black';
    for(let i=0;i<blocks-2;i+=2) {
        for(let j=0;j<1;j+=.1) {
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

function drawWithCamera() {
    context.save();
    context.translate(-cam.x, -cam.y)
        if(menu == 1) {
            for(let i=0;i<p.length;i++) {
                if(p[i].connected) {
                    if(i==id) context.fillStyle = "red"; else context.fillStyle = "blue";
                    context.fillRect(p[i].x, p[i].y, p[i].w, p[i].h);
                    drawHealthbar(p[i].x+(p[i].w/2)-50, p[i].y-15, p[i].hp, 100);
                    context.font = "20px Arial";
                    context.fillStyle = "black";
                    if(p[i].name == '') {
                        context.fillText(p[i].id, p[i].x-(context.measureText(p[i].id).width)/2, p[i].y-35);
                    }else{
                        context.fillText(p[i].name, p[i].x-(context.measureText(p[i].name).width)/2, p[i].y-35);
                    }
                }
            }
            context.fillStyle = 'black';
            for(let i=0;i<b.length;i++) {
                context.fillRect(b[i].x, b[i].y, 6, 6);
            }
            for(let i=0;i<w.length;i++) {
                context.fillRect(w[i].x, w[i].y, w[i].w, w[i].h);
            }
            for(let i=0;i<blocks;i+=1) {
                for(let j=0;j<1;j+=.1) {
                    let a = {x:i*bs, y:height[i]}
                    let b = {x:(i-1)*bs, y:height[i-1]}
                    let c = {x:(i-2)*bs, y:height[i-2]}
                    // let d = {x:(i+3)*bs, y:height[i+3]}
                    let e = p3curve(a, b, c, j);
                    context.fillRect(e.x, e.y, bs, bs);
                }
            }
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

let inbs = 60; 
function draw() {
    if(menu == 0 || showedMenu) return;
    context.save();
    context.translate(0,0);
        context.strokeRect(0, 0, canvas.width, canvas.height);
        if(waiting) {
            context.font = "40px Arial";
            context.fillStyle = "black";
            context.fillText("Waiting for players...", canvas.width/2-context.measureText("Waiting for players...").width/2, canvas.height/2);
            context.font = "20px Arial";
            context.fillText("Players:"+players+"/2", canvas.width/2-context.measureText("Players:"+players+"/2").width/2, canvas.height/2+50);
        }else if(menu == 1){
            context.fillStyle = 'blue';
            context.fillRect(0,500,blocks*bs+500,canvas.height);
            context.font = "20px Arial";
            context.fillStyle = "black";
            for(let i=0;i<p.length;i++) {
                if(p[i].connected) {
                    context.fillText("Your id:"+id, canvas.width-context.measureText("Your id:"+id).width, canvas.height-20);
                    if(i == turn) {
                        if(p[i].name == '') {
                            context.fillText("On turn:"+p[i].id,10, 130);
                        }else{
                            context.fillText("On turn:"+p[i].name,10, 130);
                        }
                    }
                }
            }
            drawWithCamera();
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
                    context.drawImage(images[y*2+x], invX+x*(inbs+1), invY+y*(inbs+1), inbs, inbs);
                    context.lineWidth = 2;
                }
            }
        
        if(id == turn) {
            context.fillText("Time:"+seconds, canvas.width-200, 40);
        }else{
            context.fillText("Time:"+clientTimer, canvas.width-200, 40);
        }
    }
    if(menu == 2) {
        context.fillStyle = 'red';
        context.font = '35px Arial';
        context.fillText("You died click F5 to restart.", canvas.width/2-context.measureText("You died click F5 to restart.").width/2, canvas.height/2-40);
    }
    context.restore();
}
let showedMenu = false;
function keyup(key) {
    if(key == 27 && joined) {
        showedMenu = !showedMenu;
        if(showedMenu) {
            document.getElementById('menu').style.display = 'block';
        }else{
            document.getElementById('menu').style.display = 'none';
            document.getElementById('canvas-id').style.display = 'block';
        }
    }
    if(key == 73 && waiting == false && turn==id && menu==1 && p[id].connected) {
        showInventory = !showInventory;
    }
}
let selected, clicks = 0;
function mouseup() {
    if(id==-1 || p[id].connected == false || menu == 0) return;
    let x,y;
    x = Math.floor((mouseX-invX)/inbs);
    y = Math.floor((mouseY-invY)/inbs);
    if(showInventory && waiting == false && ( (x == 0 && y == 0) || (x == 1 && y == 0) || (x == 0 && y == 1) || (x == 1 && y == 3))) {
            showInventory = false;
            selected = inveontoryGrid[x][y];
            clicks++;
    }
    if(selected!=undefined && waiting == false ) clicks++;
    if(p[id].connected && selected != undefined && clicks>2 && waiting == false) {
        clicks = 0;
        seconds = 10;
        showInventory = false;
        socket.emit('shoot', cam.x+mouseX, cam.y+mouseY, id, selected);
        selected = undefined;
    }
}