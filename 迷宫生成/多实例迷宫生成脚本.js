/*
用法：
导入本脚本后，在 HTML 页面中添加一个 div 元素，并在该元素上添加 id 属性，然后在script里初始化它。

示例：
<div id="example1" style="display:contents;"></div>
<script>
// ==========================================
        // 实例化展示
        // ==========================================
        const container = document.getElementById('example1');
        new DungeonWidget(container, {
            title: "限制房间门数量 (Limit Doors)",
            width: 61,             // 地图宽度
            height: 41,            // 地图高度
            speed: 50,             // 动画延迟
            attempts: 200,         // 尝试放置房间次数
            roomChance: 5,         // 房间回路概率
            corrChance: 20,        // 走廊回路概率
            removeDeadEnds: true,  // 移除死胡同
            instant: false,        // 动画/瞬间
            targetStage: 4,        // 目标阶段
            maxRoomDoors: 2,        // 房间最大出口数，设置为 1 则房间只有一个出口，设置为 2 则最多两个
        });
</script>
*/

(function(){
    // ==========================================
    // 全局常量
    // ==========================================
    const TILE = { WALL: 0, FLOOR: 1, DOOR_ROOM: 2, DOOR_CORRIDOR: 3 };
    const DIRS = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const BEIGE_COLOR = '#F5F5DC';

    function getRandomColor(seed) {
        const hue = (seed * 137.508) % 360;
        return `hsl(${hue}, 60%, 35%)`;
    }

    // ==========================================
    // Dungeon 组件类
    // ==========================================
    class DungeonWidget {
        constructor(container, config = {}) {
            // 【修复关键点】使用 !== undefined 判断，防止 0 被当作 false 处理
            this.config = {
                title: config.title || "",
                width: config.width || 61,
                height: config.height || 41,
                speed: config.speed !== undefined ? config.speed : 5,
                attempts: config.attempts !== undefined ? config.attempts : 200,
                
                // 修复：之前使用 || 写法导致输入 0 时会变成默认值
                roomChance: config.roomChance !== undefined ? config.roomChance : 5,
                corrChance: config.corrChance !== undefined ? config.corrChance : 20,
                
                removeDeadEnds: config.removeDeadEnds !== undefined ? config.removeDeadEnds : true,
                instant: config.instant !== undefined ? config.instant : false,
                targetStage: config.targetStage || 4,
                maxRoomDoors: config.maxRoomDoors !== undefined ? config.maxRoomDoors : 4
            };

            this.runId = 0;
            this.isInstant = false;
            this.scale = 10;
            this.grid = [];
            this.regions = [];
            this.regionParents = [];
            this.regionColors = [];
            this.regionIsRoom = [];
            this.roomDoorCounts = [];
            this.maxRegionId = -1;

            this.root = document.createElement('div');
            this.root.className = 'dungeon-widget';
            
            let hint = "点击重新生成";
            if (this.config.targetStage === 1) hint += " (仅房间)";
            this.root.title = hint;
            
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
                ${this.config.title ? `<div class="widget-label">${this.config.title}</div>` : ''}
                <div class="canvas-container">
                    <canvas></canvas>
                </div>
            `;
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
                    this.drawFull(true);
                });
                observer.observe(this.canvasContainer);
            }
        }

        resize() {
            const cw = this.canvasContainer.clientWidth || 400;
            const ch = this.canvasContainer.clientHeight || 300;
            const padding = 10;

            const scaleX = (cw - padding) / this.config.width;
            const scaleY = (ch - padding) / this.config.height;
            let bestScale = Math.floor(Math.min(scaleX, scaleY));

            if (bestScale < 1) bestScale = 1;
            if (bestScale > 30) bestScale = 30;

            this.scale = bestScale;
            this.canvas.width = this.config.width * this.scale;
            this.canvas.height = this.config.height * this.scale;
        }

        resetData() {
            this.grid = [];
            this.regions = [];
            this.regionParents = [];
            this.regionColors = [];
            this.regionIsRoom = [];
            this.roomDoorCounts = [];
            this.maxRegionId = -1;

            for (let y = 0; y < this.config.height; y++) {
                this.grid[y] = new Array(this.config.width).fill(TILE.WALL);
                this.regions[y] = new Array(this.config.width).fill(-1);
            }
            this.drawFull(true);
        }

        createRegion(isRoom) {
            this.maxRegionId++;
            const id = this.maxRegionId;
            this.regionParents[id] = id;
            if (id === 0) this.regionColors[id] = BEIGE_COLOR;
            else this.regionColors[id] = getRandomColor(id + this.runId);
            this.regionIsRoom[id] = isRoom;
            this.roomDoorCounts[id] = 0;
            return id;
        }

        findSet(i) {
            if (this.regionParents[i] === i) return i;
            this.regionParents[i] = this.findSet(this.regionParents[i]);
            return this.regionParents[i];
        }

        unionSets(i, j) {
            const rootI = this.findSet(i);
            const rootJ = this.findSet(j);
            if (rootI !== rootJ) {
                const cI = this.regionColors[rootI];
                const cJ = this.regionColors[rootJ];
                if (cI === BEIGE_COLOR) this.regionParents[rootJ] = rootI;
                else if (cJ === BEIGE_COLOR) this.regionParents[rootI] = rootJ;
                else this.regionParents[rootJ] = rootI;
                return true;
            }
            return false;
        }

        getCellColor(rId) {
            if (rId === -1) return '#000';
            return this.regionColors[this.findSet(rId)];
        }

        drawFull(force = false) {
            if (this.isInstant && !force) return;
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            for (let y = 0; y < this.config.height; y++) {
                for (let x = 0; x < this.config.width; x++) {
                    this.drawCell(x, y, null, true);
                }
            }
        }

        drawCell(x, y, color = null, ignoreInstant = false) {
            if (this.isInstant && !ignoreInstant) return;
            const tile = this.grid[y][x];
            const px = x * this.scale;
            const py = y * this.scale;
            const s = this.scale;

            if (tile === TILE.WALL) {
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(px, py, s, s);
            } else if (tile === TILE.DOOR_ROOM) {
                this.ctx.fillStyle = '#cf6679';
                this.ctx.fillRect(px, py, s, s);
                if (s > 4) { 
                    this.ctx.strokeStyle = '#000'; 
                    this.ctx.lineWidth = 1; 
                    this.ctx.strokeRect(px, py, s, s); 
                }
            } else if (tile === TILE.DOOR_CORRIDOR) {
                this.ctx.fillStyle = '#03dac6';
                this.ctx.fillRect(px, py, s, s);
            } else {
                this.ctx.fillStyle = color || this.getCellColor(this.regions[y][x]);
                this.ctx.fillRect(px, py, s, s);
            }
        }

        async wait(ms) {
            if (this.isInstant) return;
            if (ms <= 0) await new Promise(r => requestAnimationFrame(r));
            else await new Promise(r => setTimeout(r, ms));
        }

        check(id) { if (this.runId !== id) throw 'STOP'; }

        async generate(instant) {
            this.runId++;
            const myId = this.runId;
            this.isInstant = instant;

            if (this.config.width % 2 === 0) this.config.width++;
            if (this.config.height % 2 === 0) this.config.height++;
            this.resize();
            this.resetData();

            try {
                await this.placeRooms(myId);
                if (this.config.targetStage <= 1) throw 'DONE';

                await this.fillMazes(myId);
                if (this.config.targetStage <= 2) throw 'DONE';

                await this.connectRegions(myId);
                if (this.config.targetStage <= 3) throw 'DONE';

                await this.removeDeadEnds(myId);
                throw 'DONE';

            } catch (e) {
                if (e === 'DONE') {
                    if (this.isInstant) {
                        this.isInstant = false;
                        this.drawFull(true);
                    }
                } else if (e !== 'STOP') {
                    console.error(e);
                }
            }
        }

        async placeRooms(id) {
            for (let i = 0; i < this.config.attempts; i++) {
                this.check(id);
                const size = (Math.floor(Math.random() * 3) + 1) * 2 + 1;
                const rect = Math.floor(Math.random() * (1 + size / 2)) * 2;
                let w = size, h = size;
                if (Math.random() < 0.5) w += rect; else h += rect;

                const x = Math.floor(Math.random() * (this.config.width - w) / 2) * 2 + 1;
                const y = Math.floor(Math.random() * (this.config.height - h) / 2) * 2 + 1;

                if (x < 1 || y < 1 || x + w >= this.config.width || y + h >= this.config.height) continue;

                let collide = false;
                for (let ry = y - 1; ry < y + h + 1; ry++) {
                    for (let rx = x - 1; rx < x + w + 1; rx++) {
                        if (this.grid[ry][rx] !== TILE.WALL) { collide = true; break; }
                    }
                }
                if (collide) continue;

                const rId = this.createRegion(true);
                for (let ry = y; ry < y + h; ry++) {
                    for (let rx = x; rx < x + w; rx++) {
                        this.grid[ry][rx] = TILE.FLOOR;
                        this.regions[ry][rx] = rId;
                    }
                }
                if (!this.isInstant && this.config.speed > 10) {
                    this.drawFull(); await this.wait(this.config.speed);
                }
            }
            if (!this.isInstant) this.drawFull();
        }

        async fillMazes(id) {
            for (let y = 1; y < this.config.height; y += 2) {
                for (let x = 1; x < this.config.width; x += 2) {
                    if (this.grid[y][x] === TILE.WALL) {
                        this.check(id);
                        const rId = this.createRegion(false);
                        await this.growMaze(id, x, y, rId);
                    }
                }
            }
        }

        async growMaze(id, sx, sy, rId) {
            const stack = [{ x: sx, y: sy }];
            this.grid[sy][sx] = TILE.FLOOR;
            this.regions[sy][sx] = rId;

            let frames = 0;
            while (stack.length > 0) {
                const curr = stack[stack.length - 1];
                const neighbors = [];
                for (let d of DIRS) {
                    const nx = curr.x + d.x * 2, ny = curr.y + d.y * 2;
                    if (nx > 0 && ny > 0 && nx < this.config.width - 1 && ny < this.config.height - 1 && this.grid[ny][nx] === TILE.WALL) {
                        neighbors.push({ x: nx, y: ny, dx: d.x, dy: d.y });
                    }
                }
                if (neighbors.length > 0) {
                    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.grid[curr.y + next.dy][curr.x + next.dx] = TILE.FLOOR;
                    this.regions[curr.y + next.dy][curr.x + next.dx] = rId;
                    this.grid[next.y][next.x] = TILE.FLOOR;
                    this.regions[next.y][next.x] = rId;
                    stack.push({ x: next.x, y: next.y });

                    if (frames++ % 20 === 0) this.check(id);
                    if (!this.isInstant && this.config.speed > 0 && frames % (this.scale < 6 ? 20 : 5) === 0) {
                        this.drawFull(); await this.wait(this.config.speed / 2);
                    }
                } else { stack.pop(); }
            }
            if (!this.isInstant) this.drawFull();
        }

        async connectRegions(id) {
            let conns = [];
            for (let y = 1; y < this.config.height - 1; y++) {
                for (let x = 1; x < this.config.width - 1; x++) {
                    if (this.grid[y][x] === TILE.WALL) {
                        let rs = [];
                        if (this.grid[y][x - 1] !== 0 && this.grid[y][x + 1] !== 0) rs = [this.regions[y][x - 1], this.regions[y][x + 1]];
                        else if (this.grid[y - 1][x] !== 0 && this.grid[y + 1][x] !== 0) rs = [this.regions[y - 1][x], this.regions[y + 1][x]];
                        if (rs.length === 2) conns.push({ x: x, y: y, rA: rs[0], rB: rs[1] });
                    }
                }
            }
            conns.sort(() => Math.random() - 0.5);

            let keep = true;
            while (keep) {
                this.check(id);
                let bestI = -1, type = 'NONE', targetRoot = -1;
                const maxD = this.config.maxRoomDoors;

                for (let i = 0; i < conns.length; i++) {
                    const c = conns[i];
                    if (!c) continue;

                    let crowd = false;
                    for (let d of DIRS) {
                        let t = this.grid[c.y + d.y][c.x + d.x];
                        if (t === TILE.DOOR_ROOM || t === TILE.DOOR_CORRIDOR) { crowd = true; break; }
                    }
                    if (crowd) { conns[i] = null; continue; }

                    if (this.regionIsRoom[c.rA] && this.roomDoorCounts[c.rA] >= maxD) {
                        conns[i] = null; continue;
                    }
                    if (this.regionIsRoom[c.rB] && this.roomDoorCounts[c.rB] >= maxD) {
                        conns[i] = null; continue;
                    }

                    const rootA = this.findSet(c.rA), rootB = this.findSet(c.rB);
                    const beigeA = (this.regionColors[rootA] === BEIGE_COLOR);
                    const beigeB = (this.regionColors[rootB] === BEIGE_COLOR);

                    if (rootA !== rootB) {
                        if ((beigeA && !beigeB) || (!beigeA && beigeB)) {
                            bestI = i; type = 'MERGE'; targetRoot = beigeA ? rootB : rootA;
                            break;
                        }
                    } else {
                        if (beigeA && beigeB) {
                            const isRoomA = this.regionIsRoom[c.rA], isRoomB = this.regionIsRoom[c.rB];
                            let valid = false;
                            
                            if (!isRoomA && !isRoomB) {
                                if (Math.random() < this.config.corrChance / 100) valid = true;
                            } else {
                                if (Math.random() < this.config.roomChance / 100) valid = true;
                            }
                            if (valid && !this.wouldFormArtifact(c.x, c.y)) {
                                bestI = i; type = 'LOOP'; break;
                            }
                            if (!valid) conns[i] = null;
                        }
                    }
                }

                if (bestI !== -1) {
                    const c = conns[bestI];
                    conns[bestI] = null;
                    const rA = c.rA, rB = c.rB;

                    if (this.regionIsRoom[rA]) this.roomDoorCounts[rA]++;
                    if (this.regionIsRoom[rB]) this.roomDoorCounts[rB]++;

                    if (type === 'LOOP' && !this.regionIsRoom[rA] && !this.regionIsRoom[rB])
                        this.grid[c.y][c.x] = TILE.DOOR_CORRIDOR;
                    else
                        this.grid[c.y][c.x] = TILE.DOOR_ROOM;

                    this.drawCell(c.x, c.y);

                    if (type === 'MERGE') {
                        await this.animateFlood(c.x, c.y, targetRoot);
                        this.unionSets(rA, rB);
                        if (!this.isInstant) { this.drawFull(); await this.wait(this.config.speed); }
                    } else {
                        await this.wait(this.config.speed / 4);
                    }
                } else {
                    const rem = conns.filter(x => x !== null);
                    if (rem.length === 0 || rem.length === conns.length) keep = false;
                    conns = rem;
                }
            }
        }

        async animateFlood(sx, sy, targetRoot) {
            if (this.isInstant) return;
            let q = [{ x: sx, y: sy }];
            let vis = {}; 
            vis[`${sx},${sy}`] = true;
            this.drawCell(sx, sy, BEIGE_COLOR);

            while (q.length > 0) {
                let nq = [];
                for (let i = 0; i < q.length; i++) {
                    const curr = q[i];
                    for (let d of DIRS) {
                        const nx = curr.x + d.x, ny = curr.y + d.y;
                        if (nx >= 0 && ny >= 0 && nx < this.config.width && ny < this.config.height) {
                            const k = `${nx},${ny}`;
                            if (!vis[k] && this.grid[ny][nx] !== TILE.WALL) {
                                if (this.findSet(this.regions[ny][nx]) === targetRoot) {
                                    vis[k] = true;
                                    nq.push({ x: nx, y: ny });
                                    this.drawCell(nx, ny, BEIGE_COLOR);
                                }
                            }
                        }
                    }
                }
                q = nq;
                if (this.config.speed > 0) await this.wait(Math.max(5, this.config.speed / 2));
                else await this.wait(0);
            }
        }

        async removeDeadEnds(id) {
            if (!this.config.removeDeadEnds) return;

            let done = false;
            while (!done) {
                done = true;
                this.check(id);
                let change = false;
                for (let y = 1; y < this.config.height - 1; y++) {
                    for (let x = 1; x < this.config.width - 1; x++) {
                        if (this.grid[y][x] !== TILE.FLOOR) continue;
                        let exits = 0;
                        for (let d of DIRS) {
                            if (this.grid[y + d.y][x + d.x] !== TILE.WALL) exits++;
                        }

                        if (exits <= 1) {
                            this.grid[y][x] = TILE.WALL;
                            this.regions[y][x] = -1;
                            if (!this.isInstant) {
                                this.ctx.fillStyle = '#000'; this.ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
                            }
                            change = true; done = false;
                            if (!this.isInstant && this.config.speed > 0) await this.wait(Math.max(1, this.config.speed / 5));
                        }
                    }
                }
                if (!this.isInstant && change && this.config.speed > 0) await this.wait(this.config.speed);
            }

            for (let y = 1; y < this.config.height - 1; y++) {
                for (let x = 1; x < this.config.width - 1; x++) {
                    let t = this.grid[y][x];
                    if (t === TILE.DOOR_ROOM || t === TILE.DOOR_CORRIDOR) {
                        let v = false;
                        if (this.grid[y][x - 1] !== 0 && this.grid[y][x + 1] !== 0) v = true;
                        if (this.grid[y - 1][x] !== 0 && this.grid[y + 1][x] !== 0) v = true;
                        if (!v) {
                            this.grid[y][x] = TILE.WALL;
                            if (!this.isInstant) {
                                this.ctx.fillStyle = '#000'; this.ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
                                if (this.config.speed > 0) await this.wait(10);
                            }
                        }
                    }
                }
            }
            if (!this.isInstant) this.drawFull();
        }

        wouldFormArtifact(x, y) {
            const isEmpty = (tx, ty) => {
                if (tx === x && ty === y) return true;
                if (tx < 0 || ty < 0 || tx >= this.config.width || ty >= this.config.height) return false;
                return this.grid[ty][tx] !== TILE.WALL;
            };
            if (isEmpty(x - 1, y - 1) && isEmpty(x, y - 1) && isEmpty(x - 1, y)) return true;
            if (isEmpty(x + 1, y - 1) && isEmpty(x, y - 1) && isEmpty(x + 1, y)) return true;
            if (isEmpty(x - 1, y + 1) && isEmpty(x, y + 1) && isEmpty(x - 1, y)) return true;
            if (isEmpty(x + 1, y + 1) && isEmpty(x, y + 1) && isEmpty(x + 1, y)) return true;
            return false;
        }
    }

    window.DungeonWidget = DungeonWidget;
    
})();