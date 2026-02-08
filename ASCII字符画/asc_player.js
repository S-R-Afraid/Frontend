/**
 * ASC Binary Protocol Player Library
 * Version: 2.2
 * Features: Auto-init from API/URL, Auto-scaling, CORS handling
 */

class ASCPlayer {
    /**
     * @param {string} canvasId 
     * @param {object} options 配置项
     * @param {string} [options.sourceType] - 'api' | 'url' (可选，自动加载模式)
     * @param {string} [options.sourceUrl] - API地址 或 文件地址
     * @param {string} [options.fontFamily] - 字体
     * @param {number} [options.fontAspectRatio] - 字体宽高比
     */
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas element "${canvasId}" not found`);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // === 配置初始化 ===
        this.config = {
            fontFamily: options.fontFamily || 'Courier New, monospace',
            fontAspectRatio: options.fontAspectRatio || 0.6,
            bgColor: options.bgColor || '#000000',
            isLoop: options.isLoop !== undefined ? options.isLoop : true
        };

        // 渲染状态
        this.renderMetrics = { scale: 1, offsetX: 0, offsetY: 0, baseFontSize: 20 };

        // 重置内部状态
        this.reset();

        // === 自动加载逻辑 (新功能) ===
        if (options.sourceType && options.sourceUrl) {
            if (options.sourceType === 'api') {
                this.loadFromApi(options.sourceUrl);
            } else if (options.sourceType === 'url') {
                this.loadUrl(options.sourceUrl);
            }
        }
    }

    reset() {
        this.stop();
        this.cursor = 0;
        this.frames = [];
        this.palette = [];
        this.currentFrameIndex = 0;
        this.metadata = {};

        // 清屏
        this.ctx.fillStyle = this.config.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    // --- 方法 A: 从 API 获取并播放 ---
    async loadFromApi(apiUrl) {
        try {
            this.updateStatus("正在请求 API...");
            // 添加时间戳防止缓存
            const res = await fetch(apiUrl + '?t=' + Date.now());
            const data = await res.json();

            if (data.success) {
                console.log("[ASCPlayer] API Loaded:", data.name);
                // 触发回调（如果有外部监听需求，这里可以扩展）
                if (this.onApiSuccess) this.onApiSuccess(data.url);

                // 加载实际文件
                await this.loadUrl(data.url);
            } else {
                this.updateStatus("API 错误: " + data.message);
            }
        } catch (e) {
            this.updateStatus("API 请求失败");
            console.error(e);
        }
    }

    // --- 方法 B: 直接加载 URL ---
    async loadUrl(url) {
        try {
            this.updateStatus(`正在下载...`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();

            this.updateStatus("正在解码...");
            await this.loadData(buffer);
            this.updateStatus("播放中");
        } catch (e) {
            console.error(e);
            this.updateStatus(`加载失败: ${e.message}`);
        }
    }

    // --- 核心解析逻辑 (保持不变) ---
    async loadData(buffer) {
        this.reset();
        this.view = new DataView(buffer);

        const magic = this.readString(4);
        if (magic === 'ASC2') {
            await this.parseASC2();
        } else if (magic === 'ASC3') {
            this.parseASC3();
        } else {
            throw new Error(`无效文件头: ${magic}`);
        }
    }

    // ... (readString, updateLayout, drawChar, parseASC3, parseASC2, play, loop, renderFrame 等方法保持不变) ...
    // 为了节省篇幅，这里省略重复的渲染代码，请直接复制上一版这些方法的实现即可
    // 必须包含 updateLayout, drawChar, parseASC3, parseASC2, play, loop, renderFrame, readString

    updateLayout(gridW, gridH) { /* ... 同上一版 ... */
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        const baseH = this.renderMetrics.baseFontSize;
        const baseW = baseH * this.config.fontAspectRatio;
        const contentW = gridW * baseW;
        const contentH = gridH * baseH;
        const scale = Math.min(this.canvas.width / contentW, this.canvas.height / contentH);
        this.renderMetrics.scale = scale;
        this.renderMetrics.offsetX = (this.canvas.width - contentW * scale) / 2;
        this.renderMetrics.offsetY = (this.canvas.height - contentH * scale) / 2;
        this.ctx.font = `${baseH}px ${this.config.fontFamily}`;
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = this.config.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    drawChar(charCode, r, g, b, gx, gy) { /* ... 同上一版 ... */
        const { scale, offsetX, offsetY, baseFontSize } = this.renderMetrics;
        const baseW = baseFontSize * this.config.fontAspectRatio;
        const x = offsetX + (gx * baseW * scale);
        const y = offsetY + (gy * baseFontSize * scale);
        const w = baseW * scale;
        const h = baseFontSize * scale;
        this.ctx.fillStyle = this.config.bgColor;
        this.ctx.fillRect(x, y, w + 0.8, h + 0.8);
        if (charCode !== 32) {
            this.ctx.fillStyle = `rgb(${r},${g},${b})`;
            this.ctx.setTransform(scale, 0, 0, scale, x, y);
            this.ctx.fillText(String.fromCharCode(charCode), 0, 0);
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }
    readString(len) { let s = ''; for (let i = 0; i < len; i++) s += String.fromCharCode(this.view.getUint8(this.cursor++)); return s; }
    parseASC3() { /* ... 同上一版 ... */
        const blk = this.view.getUint8(this.cursor++);
        const w = this.view.getUint32(this.cursor, true); this.cursor += 4;
        const h = this.view.getUint32(this.cursor, true); this.cursor += 4;
        const gw = Math.max(1, Math.floor(w / blk));
        const gh = Math.max(1, Math.floor(h / blk));
        this.updateLayout(gw, gh);
        let idx = 0; const total = gw * gh;
        while (idx < total && this.cursor < this.view.byteLength) {
            const op = this.view.getUint8(this.cursor++); const cnt = this.view.getUint16(this.cursor, true); this.cursor += 2;
            if (op === 0x00) {
                const c = this.view.getUint8(this.cursor++); const r = this.view.getUint8(this.cursor++); const g = this.view.getUint8(this.cursor++); const b = this.view.getUint8(this.cursor++);
                for (let i = 0; i < cnt; i++) { this.drawChar(c, r, g, b, idx % gw, Math.floor(idx / gw)); idx++; }
            } else {
                for (let i = 0; i < cnt; i++) { const c = this.view.getUint8(this.cursor++); const r = this.view.getUint8(this.cursor++); const g = this.view.getUint8(this.cursor++); const b = this.view.getUint8(this.cursor++); this.drawChar(c, r, g, b, idx % gw, Math.floor(idx / gw)); idx++; }
            }
        }
    }
    async parseASC2() { /* ... 同上一版 ... */
        const blk = this.view.getUint8(this.cursor++);
        const w = this.view.getUint32(this.cursor, true); this.cursor += 4;
        const h = this.view.getUint32(this.cursor, true); this.cursor += 4;
        const fps = this.view.getFloat32(this.cursor, true); this.cursor += 4;
        const count = this.view.getUint32(this.cursor, true); this.cursor += 4;
        const gw = Math.max(1, Math.floor(w / blk));
        const gh = Math.max(1, Math.floor(h / blk));
        this.metadata = { gw, gh, fps: (fps > 0 && fps < 200) ? fps : 10, count };
        this.updateLayout(gw, gh);
        const pCount = this.view.getUint16(this.cursor, true); this.cursor += 2;
        for (let i = 0; i < pCount; i++) { this.palette.push({ r: this.view.getUint8(this.cursor++), g: this.view.getUint8(this.cursor++), b: this.view.getUint8(this.cursor++) }); }
        for (let i = 0; i < count; i++) { const size = this.view.getUint32(this.cursor, true); this.cursor += 4; this.frames.push({ offset: this.cursor, size }); this.cursor += size; }
        this.play();
    }
    play() { this.isPlaying = true; this.lastFrameTime = performance.now(); this.loop(); }
    loop(ts) {
        if (!this.isPlaying) return;
        const interval = 1000 / this.metadata.fps;
        const elapsed = (ts || performance.now()) - this.lastFrameTime;
        if (elapsed > interval) {
            this.lastFrameTime = (ts || performance.now()) - (elapsed % interval);
            this.renderFrame(this.currentFrameIndex);
            this.currentFrameIndex++;
            if (this.currentFrameIndex >= this.metadata.count) {
                if (this.config.isLoop) this.currentFrameIndex = 0; else { this.isPlaying = false; return; }
            }
        }
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }
    renderFrame(idx) {
        if (idx >= this.frames.length) return;
        const frame = this.frames[idx]; let ptr = frame.offset; const end = ptr + frame.size; let gridIdx = 0; const { gw } = this.metadata; const maxGrid = gw * this.metadata.gh;
        while (ptr < end) {
            if (ptr + 3 > this.view.byteLength) break;
            const op = this.view.getUint8(ptr++); const cnt = this.view.getUint16(ptr, true); ptr += 2;
            if (op === 0x00) { gridIdx += cnt; } else if (op === 0x01) {
                const charPtr = ptr; ptr += cnt; const colPtr = ptr; ptr += cnt * 2; if (ptr > this.view.byteLength) break;
                for (let k = 0; k < cnt; k++) {
                    if (gridIdx >= maxGrid) break;
                    const c = this.view.getUint8(charPtr + k); const cIdx = this.view.getUint16(colPtr + k * 2, true);
                    const rgb = this.palette[cIdx] || { r: 255, g: 255, b: 255 };
                    this.drawChar(c, rgb.r, rgb.g, rgb.b, gridIdx % gw, Math.floor(gridIdx / gw)); gridIdx++;
                }
            }
        }
    }

    updateStatus(msg) {
        const el = document.getElementById('statusText');
        if (el) el.innerText = msg;
    }
}