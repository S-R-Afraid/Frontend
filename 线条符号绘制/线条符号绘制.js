class SymmetricTile {
    constructor({
        canvasId,
        gridSize = 6,
        edgesMax = 20,
        edgesAttempts = 40,
        edgesBreak = 4,
        symmetry = 'xy'
    }) {
        this.canvas = document.getElementById(canvasId)
        this.ctx = this.canvas.getContext('2d')

        this.gridSize = Math.max(2, gridSize)
        this.edgesMax = edgesMax
        this.edgesAttempts = edgesAttempts
        this.edgesBreak = edgesBreak
        this.symmetry = symmetry

        this.dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]

        this.resize()
        window.addEventListener('resize', () => {
            this.resize()
            this.draw()
        })
        this.canvas.addEventListener('mousedown', () => this.regenerate())

        this.computeDomain()
        this.regenerate()
    }

    resize() {
        this.canvas.width = innerWidth
        this.canvas.height = innerHeight
    }

    computeDomain() {
        const n = this.gridSize
        const halfNodes = Math.floor(n / 2) + 1

        if (this.symmetry === 'none' || this.symmetry.startsWith('rot')) {
            this.domainW = n
            this.domainH = n
        } else if (this.symmetry === 'x') {
            this.domainW = n
            this.domainH = halfNodes
        } else if (this.symmetry === 'y') {
            this.domainW = halfNodes
            this.domainH = n
        } else {
            this.domainW = halfNodes
            this.domainH = halfNodes
        }

        this.start = [
            Math.floor(this.domainW / 2),
            Math.floor(this.domainH / 2)
        ]
    }

    rand(arr) {
        return arr[Math.floor(Math.random() * arr.length)]
    }

    generatePoints() {
        let x = this.start[0]
        let y = this.start[1]

        const points = [[x, y]]
        const edges = {}

        const getEdges = (a, b) => {
            const k = a + '-' + b
            if (!edges[k]) edges[k] = []
            return edges[k]
        }

        let i = 0
        let count = 0
        let needStart = false

        while (i < this.edgesAttempts && count < this.edgesMax) {
            if (needStart) {
                points.push([x, y])
                needStart = false
            }

            const visited = getEdges(x, y)
            const opts = this.dirs.filter(([dx, dy]) => {
                const nx = x + dx, ny = y + dy
                if (nx < 0 || nx >= this.domainW) return false
                if (ny < 0 || ny >= this.domainH) return false
                if (visited.some(p => p[0] === nx && p[1] === ny)) return false
                return true
            })

            if (!opts.length) {
                points.push(false)
                x = Math.floor(Math.random() * this.domainW)
                y = Math.floor(Math.random() * this.domainH)
                needStart = true
                i++
                continue
            }

            const [dx, dy] = this.rand(opts)
            const px = x, py = y
            x += dx; y += dy

            visited.push([x, y])
            getEdges(x, y).push([px, py])

            points.push([x, y])
            count++
            i++

            if (this.edgesBreak && i % this.edgesBreak === 0) {
                points.push(false)
                x = Math.floor(Math.random() * this.domainW)
                y = Math.floor(Math.random() * this.domainH)
                needStart = true
            }
        }

        return points
    }

    draw() {
        const ctx = this.ctx
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        if (!this.points) return

        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const S = Math.min(innerWidth, innerHeight) * 0.85
        const ox = (innerWidth - S) / 2
        const oy = (innerHeight - S) / 2
        const cx = ox + S / 2
        const cy = oy + S / 2

        const step = S / (this.gridSize - 1)

        const map = (x, y) => [
            ox + x * step,
            oy + y * step
        ]

        const transforms = this.getTransforms(cx, cy)

        for (const tf of transforms) {
            ctx.beginPath()
            let started = false
            for (let i = 1; i < this.points.length; i++) {
                const p1 = this.points[i - 1]
                const p2 = this.points[i]
                if (!p1 || !p2) {
                    started = false
                    continue
                }
                let [x1, y1] = map(p1[0], p1[1])
                let [x2, y2] = map(p2[0], p2[1])

                    ;[x1, y1] = tf(x1, y1)
                    ;[x2, y2] = tf(x2, y2)

                if (!started) {
                    ctx.moveTo(x1, y1)
                    started = true
                }
                ctx.lineTo(x2, y2)
            }
            ctx.stroke()
        }
    }

    getTransforms(cx, cy) {
        const id = (x, y) => [x, y]
        const rot = a => (x, y) => {
            const dx = x - cx, dy = y - cy
            const c = Math.cos(a), s = Math.sin(a)
            return [cx + dx * c - dy * s, cy + dx * s + dy * c]
        }
        const flipX = (x, y) => [x, 2 * cy - y]
        const flipY = (x, y) => [2 * cx - x, y]

        switch (this.symmetry) {
            case 'none': return [id]
            case 'x': return [id, flipX]
            case 'y': return [id, flipY]
            case 'xy': return [id, flipX, flipY, (x, y) => flipX(...flipY(x, y))]
            case 'rot2': return [id, rot(Math.PI)]
            case 'rot4': return [id, rot(Math.PI / 2), rot(Math.PI), rot(Math.PI * 1.5)]
            default: return [id]
        }
    }

    regenerate() {
        this.points = this.generatePoints()
        this.draw()
    }
}