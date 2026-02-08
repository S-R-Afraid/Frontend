/**
 * lissajous.js
 * 包含李萨如系统的核心类定义
 * 依赖: p5.js
 */

class LissajousSystem {
    /**
     * @param {string} containerId - 挂载画布的 DOM ID
     * @param {Object} options - 配置对象
     */
    constructor(containerId, options = {}) {
        // 默认配置
        const defaults = {
            colCount: 8,
            rowCount: 5,
            baseSpeed: 0.015,
            circleScale: 0.75,
            keepPath: false, // 初始是否保留路径
            pointSize: 5,
            strokeWeight: 1.5,
            hueStartX: 0,   // X轴颜色起始色相
            hueStartY: 340  // Y轴颜色起始色相
        };

        // 合并配置
        this.config = Object.assign({}, defaults, options);
        this.containerId = containerId;

        // 内部状态
        this.curves = [];
        this.xControllers = [];
        this.yControllers = [];
        this.angle = 0;
        this.cycleCount = 0;
        this.w = 0;
        this.h = 0;

        // 创建 p5 实例
        // 注意：这里需要确保 p5 库已在 HTML 中加载
        if (typeof p5 === 'undefined') {
            console.error("Error: p5.js is not loaded.");
            return;
        }
        this.myp5 = new p5(this.sketch.bind(this), containerId);
    }

    // p5 实例模式的核心 sketch 函数
    sketch(p) {
        this.p = p;

        p.setup = () => {
            const container = document.getElementById(this.containerId);
            const w = container.offsetWidth;
            const h = container.offsetHeight;

            p.createCanvas(w, h);
            p.colorMode(p.RGB);
            this.initialize();
        };

        p.draw = () => {
            p.background(18, 18, 18);

            let d = this.w * this.config.circleScale;
            let r = d / 2;

            p.noFill();

            // 1. 绘制控制器
            this.drawControllers(p, r, d);

            // 2. 绘制曲线
            let stopRecording = this.config.keepPath && this.cycleCount >= 1;

            for (let j = 0; j < this.config.rowCount; j++) {
                for (let i = 0; i < this.config.colCount; i++) {
                    let cx = this.xControllers[i].currentVal;
                    let cy = this.yControllers[j].currentVal;

                    let curveObj = this.curves[j][i];

                    if (!stopRecording) {
                        curveObj.addPoint(cx, cy);
                    }
                    curveObj.show(cx, cy);
                }
            }

            // 3. 更新角度
            this.angle -= this.config.baseSpeed;

            // 4. 周期检测
            if (this.angle < -p.TWO_PI) {
                this.angle = 0;
                this.cycleCount++;

                if (!this.config.keepPath) {
                    this.cycleCount = 0;
                    this.resetCurves();
                }
            }
        };

        p.windowResized = () => {
            const container = document.getElementById(this.containerId);
            if (container && (container.offsetWidth !== p.width || container.offsetHeight !== p.height)) {
                p.resizeCanvas(container.offsetWidth, container.offsetHeight);
                this.initialize();
            }
        };
    }

    initialize() {
        const p = this.p;
        this.w = p.width / (this.config.colCount + 1);
        this.h = p.height / (this.config.rowCount + 1);
        let cellSize = Math.min(this.w, this.h);
        this.w = cellSize;
        this.h = cellSize;

        this.curves = [];
        this.xControllers = [];
        this.yControllers = [];
        this.angle = 0;
        this.cycleCount = 0;

        // 初始化 X轴
        for (let i = 0; i < this.config.colCount; i++) {
            p.colorMode(p.HSB);
            let hue = p.map(i, 0, this.config.colCount, this.config.hueStartX, this.config.hueStartX + 300) % 360;
            let c = p.color(hue, 80, 100);
            p.colorMode(p.RGB);

            this.xControllers.push({
                speed: i + 1,
                color: c,
                cx: (i + 1) * this.w + this.w / 2,
                cy: this.w / 2,
                currentVal: 0
            });
        }

        // 初始化 Y轴
        for (let j = 0; j < this.config.rowCount; j++) {
            p.colorMode(p.HSB);
            let hue = p.map(j, 0, this.config.rowCount, this.config.hueStartY, this.config.hueStartY + 100) % 360;
            let c = p.color(hue, 80, 100);
            p.colorMode(p.RGB);

            this.yControllers.push({
                speed: j + 1,
                color: c,
                cx: this.w / 2,
                cy: (j + 1) * this.h + this.h / 2,
                currentVal: 0
            });
        }

        for (let j = 0; j < this.config.rowCount; j++) {
            let row = [];
            for (let i = 0; i < this.config.colCount; i++) {
                let c1 = this.xControllers[i].color;
                let c2 = this.yControllers[j].color;
                let blended = p.lerpColor(c1, c2, 0.5);
                row.push(new Curve(p, blended, this.config.strokeWeight, this.config.pointSize));
            }
            this.curves.push(row);
        }
    }

    drawControllers(p, r, d) {
        for (let i = 0; i < this.config.colCount; i++) {
            let ctrl = this.xControllers[i];
            this.drawSingleController(p, ctrl, r, d, true);
        }
        for (let j = 0; j < this.config.rowCount; j++) {
            let ctrl = this.yControllers[j];
            this.drawSingleController(p, ctrl, r, d, false);
        }
    }

    drawSingleController(p, ctrl, r, d, isVertical) {
        p.stroke(p.red(ctrl.color), p.green(ctrl.color), p.blue(ctrl.color), 80);
        p.strokeWeight(1);
        p.ellipse(ctrl.cx, ctrl.cy, d, d);

        let ox = r * p.cos(this.angle * ctrl.speed - p.HALF_PI);
        let oy = r * p.sin(this.angle * ctrl.speed - p.HALF_PI);

        if (isVertical) {
            ctrl.currentVal = ctrl.cx + ox;
            p.stroke(255, 30);
            p.line(ctrl.cx + ox, 0, ctrl.cx + ox, p.height);
        } else {
            ctrl.currentVal = ctrl.cy + oy;
            p.stroke(255, 30);
            p.line(0, ctrl.cy + oy, p.width, ctrl.cy + oy);
        }

        p.stroke(ctrl.color);
        p.strokeWeight(5);
        p.point(ctrl.cx + ox, ctrl.cy + oy);
    }

    resetCurves() {
        for (let row of this.curves) {
            for (let curve of row) {
                curve.reset();
            }
        }
    }

    bindButton(btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        this.updateButtonUI(btn);
        btn.addEventListener('click', () => {
            this.toggleMode(btn);
        });
    }

    toggleMode(btnElement) {
        this.config.keepPath = !this.config.keepPath;
        this.updateButtonUI(btnElement);
        this.initialize();
    }

    updateButtonUI(btn) {
        if (this.config.keepPath) {
            btn.innerText = "当前模式: 保留图案";
            btn.classList.add('active');
        } else {
            btn.innerText = "当前模式: 自动重绘";
            btn.classList.remove('active');
        }
    }
}

class Curve {
    constructor(p5Instance, color, weight, pSize) {
        this.p = p5Instance;
        this.color = color;
        this.weight = weight;
        this.pSize = pSize;
        this.path = [];
    }

    addPoint(x, y) {
        this.path.push({ x, y });
    }

    reset() {
        this.path = [];
    }

    show(cx, cy) {
        const p = this.p;
        p.stroke(this.color);
        p.strokeWeight(this.weight);
        p.noFill();

        p.beginShape();
        for (let v of this.path) {
            p.vertex(v.x, v.y);
        }
        p.endShape();

        p.stroke(255);
        p.strokeWeight(this.pSize);
        p.point(cx, cy);
    }
}