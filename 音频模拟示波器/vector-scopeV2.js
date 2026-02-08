/**
 * VectorScope (XY 示波器) 组件
 * 
 * 功能：
 * - 封装 Web Audio API 的连接与分析
 * - 实现基于 Canvas 的 XY 模式绘图
 * - 提供 缩放、亮度、断线阈值 等控制接口
 * - 自动响应容器大小变化
 */
class VectorScope {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas with id ${canvasId} not found`);

        // alpha: false 可以让浏览器知道背景是不透明的，从而优化合成性能
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // 默认配置合并
        this.config = {
            fftSize: 4096,
            zoom: 1.0,          // 缩放倍率
            intensity: 30,      // 亮度增益 (Intensity)
            jumpThreshold: 100, // 断线阈值 (防止飞线)
            bgColor: '#000000', // 背景色
            lineColor: '0, 255, 0', // 线条颜色 (RGB格式，用于拼接 alpha)
            ...config
        };

        // 内部状态
        this.audioCtx = null;
        this.analyserL = null;
        this.analyserR = null;
        this.splitter = null;
        this.sourceNode = null;

        this.dataArrayL = null;
        this.dataArrayR = null;

        this.rafId = null;
        this.isAudioInit = false;

        this.width = 0;
        this.height = 0;

        // 初始化尺寸监听
        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    // --- 公共 API ---

    /**
     * 连接音频源 (<audio> 或 <video> 元素)
     */
    connectAudio(mediaElement) {
        // 浏览器策略要求：AudioContext 必须在用户交互（如播放）后才能 Resume
        mediaElement.addEventListener('play', () => {
            this._initAudioContext();

            if (!this.sourceNode) {
                try {
                    this.sourceNode = this.audioCtx.createMediaElementSource(mediaElement);
                    this._routeAudio();
                    this._startLoop();
                } catch (e) {
                    console.warn("MediaElement source already connected or CORS issue:", e);
                }
            }

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        });
    }

    /** 设置缩放 (0.5 ~ 5.0) */
    setZoom(val) {
        this.config.zoom = Number(val);
    }

    /** 设置亮度 (5 ~ 200) */
    setIntensity(val) {
        this.config.intensity = Number(val);
    }

    /** 设置断线阈值 (像素) */
    setJumpLimit(val) {
        this.config.jumpThreshold = Number(val);
    }

    // --- 私有方法 ---

    _resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.width = parent.clientWidth;
            this.height = parent.clientHeight;
        } else {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
        }
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    _initAudioContext() {
        if (this.isAudioInit) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();

        this.splitter = this.audioCtx.createChannelSplitter(2);
        this.analyserL = this.audioCtx.createAnalyser();
        this.analyserR = this.audioCtx.createAnalyser();

        this.analyserL.fftSize = this.config.fftSize;
        this.analyserR.fftSize = this.config.fftSize;

        const len = this.analyserL.frequencyBinCount;
        this.dataArrayL = new Uint8Array(len);
        this.dataArrayR = new Uint8Array(len);

        this.isAudioInit = true;
    }

    _routeAudio() {
        this.sourceNode.connect(this.splitter);
        this.splitter.connect(this.analyserL, 0); // 左声道
        this.splitter.connect(this.analyserR, 1); // 右声道
        this.sourceNode.connect(this.audioCtx.destination); // 输出到扬声器
    }

    _startLoop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        const loop = () => {
            this._draw();
            this.rafId = requestAnimationFrame(loop);
        };
        loop();
    }

    _draw() {
        if (!this.isAudioInit) return;

        this.analyserL.getByteTimeDomainData(this.dataArrayL);
        this.analyserR.getByteTimeDomainData(this.dataArrayR);

        // 清除背景 (无拖尾)
        this.ctx.fillStyle = this.config.bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.lineCap = 'round';

        const cx = this.width / 2;
        const cy = this.height / 2;
        // 缩放基准
        const baseScale = (Math.min(this.width, this.height) * 0.45) * this.config.zoom;
        const len = this.dataArrayL.length;
        const step = 1; // 采样步进，1为最高画质

        // 预计算起点
        let prevX = (this.dataArrayL[0] / 128.0 - 1.0) * baseScale + cx;
        let prevY = -(this.dataArrayR[0] / 128.0 - 1.0) * baseScale + cy;

        for (let i = step; i < len; i += step) {
            const vL = (this.dataArrayL[i] / 128.0) - 1.0;
            const vR = (this.dataArrayR[i] / 128.0) - 1.0;

            const x = vL * baseScale + cx;
            const y = -vR * baseScale + cy;

            const dx = x - prevX;
            const dy = y - prevY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 过滤飞线
            if (dist > this.config.jumpThreshold) {
                prevX = x;
                prevY = y;
                continue;
            }

            // 性能优化：静止点不绘制
            if (dist < 0.5) continue;

            // 亮度调制算法
            let alpha = this.config.intensity / dist;
            if (alpha > 1.0) alpha = 1.0;
            if (alpha < 0.05) alpha = 0.05;

            this.ctx.beginPath();
            // 使用配置的颜色 + 动态 alpha
            this.ctx.strokeStyle = `rgba(${this.config.lineColor}, ${alpha})`;
            this.ctx.lineWidth = 1 + alpha;

            this.ctx.moveTo(prevX, prevY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();

            prevX = x;
            prevY = y;
        }
    }
}