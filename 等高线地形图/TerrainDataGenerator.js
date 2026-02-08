// TerrainDataGenerator.js
class TerrainDataGenerator {
    constructor(width, depth, options = {}) {
        this.width = width;
        this.depth = depth;
        // 默认参数
        this.seed = options.seed || Math.random();
        this.roughness = options.roughness || 60; // 崎岖度
        this.amplitude = options.amplitude || 30; // 高度振幅

        // 初始化噪声库 (需确保外部已加载 SimplexNoise)
        if (typeof SimplexNoise === 'undefined') {
            console.error('SimplexNoise library is required!');
        } else {
            this.simplex = new SimplexNoise(this.seed.toString());
        }

        this.minH = 0;
        this.maxH = 0;
    }

    /**
     * 获取指定 UV 坐标处的高度
     * @param {number} u - 0~1
     * @param {number} v - 0~1
     */
    getHeight(u, v) {
        const x = u * this.width;
        const z = v * this.depth;

        // 叠加多层噪声以产生自然感
        let y = 0;
        y += this.simplex.noise2D(x / this.roughness, z / this.roughness) * this.amplitude;
        y += this.simplex.noise2D(x / (this.roughness * 0.5), z / (this.roughness * 0.5)) * (this.amplitude * 0.5);

        return y;
    }

    /**
     * 预计算地形统计数据（如最高/最低点），用于颜色归一化
     * @param {number} segments - 采样精度
     */
    calculateStats(segments = 100) {
        let min = Infinity;
        let max = -Infinity;

        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const h = this.getHeight(i / segments, j / segments);
                if (h < min) min = h;
                if (h > max) max = h;
            }
        }
        this.minH = min;
        this.maxH = max;
    }

    updateConfig(options) {
        if (options.seed !== undefined) {
            this.seed = options.seed;
            this.simplex = new SimplexNoise(this.seed.toString());
        }
        if (options.roughness !== undefined) this.roughness = options.roughness;
        if (options.amplitude !== undefined) this.amplitude = options.amplitude;
    }
}
