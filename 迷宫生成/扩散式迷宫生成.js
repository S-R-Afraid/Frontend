/*
用法：
这是“生长型”地牢生成器，已重命名以免与标准地牢生成器冲突。

示例：
<div id="dungeon-gen" style="display:contents;"></div>
    <script>
        var container = document.getElementById('dungeon-gen');
        new GrowingDungeonWidget(container, {
            title: "生长型地牢 (Growing Tree)",
            width: 61,
            height: 41,
            speed: 20,              // 动画速度
            maxFeatures: 100,       // 最大房间/走廊数量（防止无限生成）
            roomChance: 60,         // 生成房间的概率 (剩余是走廊)
            minRoomSize: 3,         // 房间最小边长
            maxRoomSize: 9,         // 房间最大边长
            minCorridor: 3,         // 走廊最小长度
            maxCorridor: 9,         // 走廊最大长度
            instant: false          // 是否瞬间生成
        });
    </script>
*/

(function(){
    // ==========================================
    // 全局常量 (由于在闭包内，不会与另一个脚本冲突)
    // ==========================================
    const TILE = { WALL: 0, FLOOR: 1, DOOR: 2 };
    const DIRS = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    
    const COLORS = {
        WALL: '#2b2b2b',
        FLOOR: '#e0e0e0',
        DOOR: '#ff5722',
        CANDIDATE: '#4caf50' 
    };

    // ==========================================
    // GrowingDungeonWidget 组件类
    // ==========================================
    class GrowingDungeonWidget {
        constructor(container, config = {}) {
            this.config = {
                title: config.title || "生长型地牢",
                width: config.width || 51,
                height: config.height || 41,
                speed: config.speed !== undefined ? config.speed : 20,
                maxFeatures: config.maxFeatures || 100, 
                roomChance: config.roomChance !== undefined ? config.roomChance : 60,
                minRoomSize: config.minRoomSize || 3,
                maxRoomSize: config.maxRoomSize || 7,
                minCorridor: config.minCorridor || 3,
                maxCorridor: config.maxCorridor || 7,
                instant: config.instant !== undefined ? config.instant : false,
            };

            this.runId = 0;
            this.isInstant = false;
            this.scale = 10;
            
            this.grid = []; 
            this.walls = []; 
            this.featuresCount = 0;

            this.root = document.createElement('div');
            this.root.className = 'dungeon-widget growing-widget'; // 添加额外的类名以便区分样式
            this.root.style.fontFamily = 'sans-serif';
            container.appendChild(this.root);

            this.renderUI();

            this.canvas = this.root.querySelector('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.canvasContainer = this.root.querySelector('.canvas-container');

            this.bindEvents();
            this.initResizeObserver();

            setTimeout(() => {
                this.resize();
                this.generate(this.config.instant); 
            }, 50);
        }

        renderUI() {
            this.root.innerHTML = `
                <div style="margin-bottom:5px; font-weight:bold; color:#333;">${this.config.title}</div>
                <div class="canvas-container" style="position:relative; border:1px solid #ccc; background:${COLORS.WALL};">
                    <canvas></canvas>
                    <div id="status-msg" style="position:absolute; top:5px; left:5px; color:#fff; font-size:12px; background:rgba(0,0,0,0.5); padding:2px 5px; pointer-events:none;"></div>
                </div>
                <div style="font-size:12px; color:#666; margin-top:5px;">点击画布重新生成 (Shift+点击: 瞬间完成)</div>
            `;
            this.statusMsg = this.root.querySelector('#status-msg');
        }

        bindEvents() {
            this.root.addEventListener('click', (e) => {
                let runInstant = this.config.instant;
                if (e.shiftKey) runInstant = !runInstant;
                this.generate(runInstant);
            });
        }

        initResizeObserver() {
            if ('ResizeObserver' in window) {
                const observer = new ResizeObserver(() => {
                    this.resize();
                    this.drawFull();
                });
                observer.observe(this.canvasContainer);
            }
        }

        resize() {
            const cw = this.canvasContainer.clientWidth || 400;
            const ch = this.canvasContainer.clientHeight || 300;
            
            // 计算最佳缩放比例
            const scaleX = cw / this.config.width;
            const scaleY = ch / this.config.height;
            let bestScale = Math.floor(Math.min(scaleX, scaleY));

            if (bestScale < 1) bestScale = 1;
            if (bestScale > 30) bestScale = 30;

            this.scale = bestScale;
            this.canvas.width = this.config.width * this.scale;
            this.canvas.height = this.config.height * this.scale;
        }

        // ==========================================
        // 核心逻辑
        // ==========================================

        resetData() {
            this.grid = [];
            this.walls = [];
            this.featuresCount = 0;

            for (let y = 0; y < this.config.height; y++) {
                this.grid[y] = new Array(this.config.width).fill(TILE.WALL);
            }
            this.drawFull();
        }

        async generate(instant) {
            this.runId++;
            const myId = this.runId;
            this.isInstant = instant;
            
            if (this.config.width % 2 === 0) this.config.width--;
            if (this.config.height % 2 === 0) this.config.height--;

            this.resize();
            this.resetData();
            this.updateStatus("初始化...");

            try {
                const cx = Math.floor(this.config.width / 2);
                const cy = Math.floor(this.config.height / 2);
                const startRoomSize = 5;
                const startRoom = { x: cx - 2, y: cy - 2, w: startRoomSize, h: startRoomSize };
                
                this.placeFeature(startRoom.x, startRoom.y, startRoom.w, startRoom.h, TILE.FLOOR);
                this.featuresCount++;

                while (this.walls.length > 0 && this.featuresCount < this.config.maxFeatures) {
                    this.check(myId);

                    const randIndex = Math.floor(Math.random() * this.walls.length);
                    const wall = this.walls[randIndex];
                    
                    this.walls[randIndex] = this.walls[this.walls.length - 1];
                    this.walls.pop();

                    const isRoom = Math.random() * 100 < this.config.roomChance;
                    const feature = this.createFeatureDefinition(wall, isRoom);

                    if (feature) {
                        if (this.checkSpace(feature)) {
                            if (!this.isInstant && this.config.speed > 5) {
                                this.drawCell(wall.x, wall.y, COLORS.CANDIDATE); 
                                await this.wait(this.config.speed / 2);
                            }

                            this.grid[wall.y][wall.x] = TILE.DOOR;
                            this.drawCell(wall.x, wall.y);

                            this.placeFeature(feature.x, feature.y, feature.w, feature.h);
                            this.featuresCount++;

                            this.updateStatus(`生成中... 元素: ${this.featuresCount}`);
                            
                            if (!this.isInstant) await this.wait(this.config.speed);
                        }
                    }
                }
                
                this.updateStatus("完成!");
                this.drawFull();

            } catch (e) {
                if (e !== 'STOP') console.error(e);
            }
        }

        createFeatureDefinition(wall, isRoom) {
            const dir = wall.dir; 
            let w, h, x, y;

            if (isRoom) {
                w = this.randomOdd(this.config.minRoomSize, this.config.maxRoomSize);
                h = this.randomOdd(this.config.minRoomSize, this.config.maxRoomSize);
                
                if (dir.y !== 0) { 
                    y = (dir.y === -1) ? (wall.y - h) : (wall.y + 1);
                    const minRx = wall.x - w + 1;
                    const maxRx = wall.x;
                    x = Math.floor(Math.random() * (maxRx - minRx + 1)) + minRx;
                } else { 
                    x = (dir.x === -1) ? (wall.x - w) : (wall.x + 1);
                    const minRy = wall.y - h + 1;
                    const maxRy = wall.y;
                    y = Math.floor(Math.random() * (maxRy - minRy + 1)) + minRy;
                }
            } else {
                const len = this.randomOdd(this.config.minCorridor, this.config.maxCorridor);
                if (dir.y !== 0) { 
                    w = 1; h = len;
                    x = wall.x;
                    y = (dir.y === -1) ? (wall.y - len) : (wall.y + 1);
                } else { 
                    w = len; h = 1;
                    y = wall.y;
                    x = (dir.x === -1) ? (wall.x - len) : (wall.x + 1);
                }
            }
            return { x, y, w, h };
        }

        checkSpace(feat) {
            if (feat.x < 1 || feat.y < 1 || 
                feat.x + feat.w > this.config.width - 1 || 
                feat.y + feat.h > this.config.height - 1) {
                return false;
            }
            
            const buffer = 1; 
            for (let cy = feat.y - buffer; cy < feat.y + feat.h + buffer; cy++) {
                for (let cx = feat.x - buffer; cx < feat.x + feat.w + buffer; cx++) {
                    if (cx < 0 || cy < 0 || cx >= this.config.width || cy >= this.config.height) continue;
                    if (cx >= feat.x && cx < feat.x + feat.w && cy >= feat.y && cy < feat.y + feat.h) continue;
                    if (this.grid[cy][cx] !== TILE.WALL) return false;
                }
            }
            return true;
        }

        placeFeature(x, y, w, h, type = TILE.FLOOR) {
            for (let iy = y; iy < y + h; iy++) {
                for (let ix = x; ix < x + w; ix++) {
                    this.grid[iy][ix] = type;
                }
            }
            if (!this.isInstant) this.drawRect(x, y, w, h, COLORS.FLOOR);

            for (let iy = y; iy < y + h; iy++) {
                for (let ix = x; ix < x + w; ix++) {
                    for (let d of DIRS) {
                        const wx = ix + d.x;
                        const wy = iy + d.y;
                        if (wx > 0 && wy > 0 && wx < this.config.width - 1 && wy < this.config.height - 1) {
                            if (this.grid[wy][wx] === TILE.WALL) {
                                this.walls.push({ x: wx, y: wy, dir: { x: d.x, y: d.y } });
                            }
                        }
                    }
                }
            }
        }
        
        randomOdd(min, max) {
            let v = Math.floor(Math.random() * (max - min + 1)) + min;
            if (v % 2 === 0) v = (Math.random() > 0.5) ? v + 1 : v - 1;
            if (v < min) v = min;
            return v;
        }

        drawFull() {
            if (this.isInstant) return;
            this.ctx.fillStyle = COLORS.WALL;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            for (let y = 0; y < this.config.height; y++) {
                for (let x = 0; x < this.config.width; x++) {
                    const t = this.grid[y][x];
                    if (t !== TILE.WALL) this.drawCell(x, y);
                }
            }
        }

        drawCell(x, y, color = null) {
            const t = this.grid[y][x];
            let c = COLORS.WALL;
            if (color) c = color;
            else if (t === TILE.FLOOR) c = COLORS.FLOOR;
            else if (t === TILE.DOOR) c = COLORS.DOOR;
            this.ctx.fillStyle = c;
            this.ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
        }
        
        drawRect(x, y, w, h, color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x * this.scale, y * this.scale, w * this.scale, h * this.scale);
        }

        updateStatus(msg) {
            if (this.statusMsg) this.statusMsg.innerText = msg;
        }

        async wait(ms) {
            if (this.isInstant) return;
            await new Promise(r => setTimeout(r, ms));
        }

        check(id) { if (this.runId !== id) throw 'STOP'; }
    }

    // 关键修改：暴露为不同的名称
    window.GrowingDungeonWidget = GrowingDungeonWidget;
})();