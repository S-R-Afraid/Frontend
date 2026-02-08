// ContourVisualizer.js
class ContourVisualizer {
    constructor(containerId, terrainGenerator, options = {}) {
        this.container = document.getElementById(containerId);
        this.terrain = terrainGenerator;

        // 配置项
        this.density = options.density || 4.0;
        this.thickness = options.thickness || 0.15;
        this.colorArray = options.colors || ['#ffffff']; // 默认为白色

        // Three.js 核心对象
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mesh = null;
        this.uniforms = null;

        this.initThreeJS();
        this.createTerrainMesh();
        this.animate();

        // 监听窗口调整
        window.addEventListener('resize', () => this.onResize(), false);
    }

    initThreeJS() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // 相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        this.camera.position.set(0, 100, 150);

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // 鼠标控制 (OrbitControls)
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
        }
    }

    /**
     * 内部工具：生成渐变纹理
     */
    _createGradientTexture(colors) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');

        if (colors.length === 1) {
            ctx.fillStyle = colors[0];
            ctx.fillRect(0, 0, 256, 1);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 256, 0);
            colors.forEach((c, i) => {
                gradient.addColorStop(i / (colors.length - 1), c);
            });
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 1);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
    }

    createTerrainMesh() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        // 1. 预计算地形极值
        this.terrain.calculateStats();

        // 2. 创建几何体
        const segments = 200;
        const geometry = new THREE.PlaneGeometry(this.terrain.width, this.terrain.depth, segments, segments);
        const positionAttribute = geometry.attributes.position;
        const uvs = geometry.attributes.uv;

        for (let i = 0; i < positionAttribute.count; i++) {
            const u = uvs.getX(i);
            const v = uvs.getY(i);
            const h = this.terrain.getHeight(u, v);
            positionAttribute.setZ(i, h);
        }
        geometry.computeVertexNormals();

        // 3. 生成纹理
        const gradTexture = this._createGradientTexture(this.colorArray);

        // 4. Shader 材质
        this.uniforms = {
            uGradientTexture: { value: gradTexture },
            uLines: { value: 10.0 / this.density },
            uThickness: { value: this.thickness },
            uMinHeight: { value: this.terrain.minH },
            uMaxHeight: { value: this.terrain.maxH }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            transparent: true,
            side: THREE.DoubleSide,
            vertexShader: `
                varying float vHeight;
                void main() {
                    vHeight = position.z;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uGradientTexture;
                uniform float uLines;
                uniform float uThickness;
                uniform float uMinHeight;
                uniform float uMaxHeight;
                varying float vHeight;

                void main() {
                    // 等高线裁切
                    float linePhase = fract(vHeight / uLines);
                    float halfThick = uThickness * 0.5;
                    if (linePhase > halfThick && linePhase < (1.0 - halfThick)) {
                        discard; 
                    }

                    // 颜色采样
                    float normalizedH = (vHeight - uMinHeight) / (uMaxHeight - uMinHeight);
                    normalizedH = clamp(normalizedH, 0.0, 1.0);
                    gl_FragColor = texture2D(uGradientTexture, vec2(normalizedH, 0.5));
                }
            `
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.mesh);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}
