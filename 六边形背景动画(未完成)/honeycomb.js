/*
 Honeycomb Hex Animation
 Vanilla JavaScript + Canvas
 Original idea by Okazz 2025
 Refactored to pure JS (no p5.js)
*/

/* ===================== 基础工具函数 ===================== */

const TAU = Math.PI * 2;

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function norm(v, a, b) {
    return (v - a) / (b - a);
}

function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.hypot(dx, dy);
}

/* ===================== 颜色工具 ===================== */

function hexToRGB(hex) {
    const v = parseInt(hex.slice(1), 16);
    return {
        r: (v >> 16) & 255,
        g: (v >> 8) & 255,
        b: v & 255
    };
}

function lerpColor(c1, c2, t) {
    return `rgb(${lerp(c1.r, c2.r, t) | 0},${lerp(c1.g, c2.g, t) | 0},${lerp(c1.b, c2.b, t) | 0})`;
}

/* ===================== 几何绘制 ===================== */

function drawHex(ctx, x, y, w, a) {
    const r = w / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const ang = i * TAU / 6 + a;
        const px = x + Math.cos(ang) * r;
        const py = y + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}

/* ===================== 全局参数 ===================== */

const palette = ['#e6302b', '#fbd400', '#36ad63', '#2B50AA', '#f654a9'];

let canvas, ctx;
let width = 900, height = 900;
let centerX, centerY;
let shapes = [];
let frameCount = 0;
let bgColor = '#000';
let shapeColor = '#fff';
let toggle = 0;

/* ===================== 初始化 & 主循环 ===================== */

function init() {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    centerX = width / 2;
    centerY = height / 2;

    createHoneycomb();
    requestAnimationFrame(loop);
}

function loop() {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    for (const s of shapes) {
        s.run(ctx);
    }

    frameCount++;

    if (frameCount % 380 === 0) {
        shapes.length = 0;
        toggle ^= 1;
        bgColor = toggle ? '#fff' : '#000';
        shapeColor = toggle ? '#000' : '#fff';
        createHoneycomb();
    }

    requestAnimationFrame(loop);
}

/* ===================== 蜂巢生成 ===================== */

function createHoneycomb() {
    const hexSize = width / 16;
    let y = 0;
    let row = 0;

    while (y <= height + hexSize) {
        let x = 0;
        while (x <= width + hexSize) {
            const offsetX = row % 2 === 0 ? 0 : hexSize * 0.75;
            createHexAnimator(x + offsetX, y, hexSize);
            x += hexSize * 1.5;
        }
        y += hexSize * Math.sqrt(3) / 4;
        row++;
    }
}

function createHexAnimator(x, y, w) {
    const type = Math.ceil(Math.random() * 4);
    const d = dist(x, y, centerX, centerY);
    const maxD = Math.hypot(width / 2, height / 2);
    const t = -Math.floor(lerp(0, 250, d / maxD));

    const clr = shapeColor;
    let obj;

    if (type === 1) obj = new HexAnimation01(x, y, w, 0, t, clr);
    if (type === 2) obj = new HexAnimation02(x, y, w, 0, t, clr);
    if (type === 3) obj = new HexAnimation03(x, y, w, 0, t, clr);
    if (type === 4) obj = new HexAnimation04(x, y, w, 0, t, clr);

    shapes.push(obj);
}

/* ===================== 动画类 ===================== */

class HexAnimation01 {
    constructor(x, y, w, a, t, clr) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.a = a;
        this.timer = t;

        this.t1 = Math.floor(Math.random() * 60 + 20);
        this.t2 = this.t1 + Math.floor(Math.random() * 60 + 20);

        this.curW = 0;

        this.color1 = hexToRGB(clr);
        this.color2 = hexToRGB(palette[Math.floor(Math.random() * palette.length)]);
        this.curColor = clr;
    }

    show(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.curColor;
        drawHex(ctx, 0, 0, this.curW, this.a);
        ctx.restore();
    }

    update() {
        if (this.timer > 0 && this.timer < this.t1) {
            const n = norm(this.timer, 0, this.t1 - 1);
            this.curW = lerp(0, this.w / 2, easeInOutQuad(n));
            this.curColor = lerpColor(this.color1, this.color2, n);
        } else if (this.timer > this.t1 && this.timer < this.t2) {
            const n = norm(this.timer, this.t1, this.t2 - 1);
            this.curW = lerp(this.w / 2, this.w, easeInOutQuad(n));
            this.curColor = lerpColor(this.color2, this.color1, n);
        }
        this.timer++;
    }

    run(ctx) {
        this.show(ctx);
        this.update();
    }
}

class HexAnimation02 extends HexAnimation01 {
    constructor(...args) {
        super(...args);
        this.rotation = Math.floor(Math.random() * 4) * (TAU / 4);
        this.shift = this.w * 2;
        this.sweep = 0;
    }

    show(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.curColor;
        drawHex(ctx, this.shift, 0, this.curW, this.sweep);
        ctx.restore();
    }

    update() {
        if (this.timer > 0 && this.timer < this.t1) {
            const n = norm(this.timer, 0, this.t1 - 1);
            this.curW = lerp(0, this.w, Math.sqrt(n));
            this.sweep = lerp(0, Math.PI, easeInOutQuad(n));
            this.curColor = lerpColor(this.color1, this.color2, n);
        } else if (this.timer > this.t1 && this.timer < this.t2) {
            const n = norm(this.timer, this.t1, this.t2 - 1);
            this.shift = lerp(this.w * 2, 0, easeInOutQuad(n));
            this.curColor = lerpColor(this.color2, this.color1, n);
        }
        this.timer++;
    }
}

class HexAnimation03 extends HexAnimation02 {
    constructor(...args) {
        super(...args);
        this.baseRot = this.rotation;
        this.targetRot = (Math.random() < 0.5 ? -1 : 1) * Math.PI;
    }

    update() {
        if (this.timer > 0 && this.timer < this.t1) {
            const n = norm(this.timer, 0, this.t1 - 1);
            this.curW = lerp(0, this.w / 2, easeInOutQuad(n));
            this.shift = lerp(0, this.w, easeInOutQuad(n));
            this.curColor = lerpColor(this.color1, this.color2, n);
        } else if (this.timer > this.t1 && this.timer < this.t2) {
            const n = norm(this.timer, this.t1, this.t2 - 1);
            this.shift = lerp(this.w, 0, easeInOutQuad(n));
            this.rotation = this.baseRot + lerp(0, this.targetRot, easeInOutQuad(n));
            this.curW = lerp(this.w / 2, this.w, easeInOutQuad(n));
            this.curColor = lerpColor(this.color2, this.color1, n);
        }
        this.timer++;
    }
}

class HexAnimation04 extends HexAnimation01 {
    constructor(...args) {
        super(...args);
        this.shift = 0;
        this.scale = 0;
        this.angle = 0;
        this.targetAngle = (Math.random() < 0.5 ? -1 : 1) * Math.PI;
    }

    show(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.curColor;

        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(this.shift, this.shift);
            ctx.lineTo(this.shift + this.w * this.scale, this.shift);
            ctx.lineTo(this.shift + this.w * this.scale * Math.cos(TAU / 6), this.shift + this.w * this.scale * Math.sin(TAU / 6));
            ctx.closePath();
            ctx.fill();
            ctx.rotate(TAU / 6);
        }
        ctx.restore();
    }

    update() {
        if (this.timer > 0 && this.timer < this.t1) {
            const n = norm(this.timer, 0, this.t1 - 1);
            this.shift = lerp(0, this.w / 4, easeInOutQuad(n));
            this.scale = lerp(0, 0.5, easeInOutQuad(n));
            this.angle = lerp(0, this.targetAngle, easeInOutQuad(n));
            this.curColor = lerpColor(this.color1, this.color2, n);
        } else if (this.timer > this.t1 && this.timer < this.t2) {
            const n = norm(this.timer, this.t1, this.t2 - 1);
            this.shift = lerp(this.w / 4, 0, easeInOutQuad(n));
            this.scale = lerp(0.5, 1, easeInOutQuad(n));
            this.curColor = lerpColor(this.color2, this.color1, n);
        }
        this.timer++;
    }
}

/* ===================== 启动 ===================== */

init();
