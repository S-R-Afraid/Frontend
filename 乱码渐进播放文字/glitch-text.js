// ===============================
// 自动容器样式初始化
// ===============================
function initContainerStyle(el) {
    if (el.__glitch_inited__) return;
    el.__glitch_inited__ = true;

    const style = el.style;

    style.whiteSpace = 'pre-wrap';
    style.transition = 'height 0.3s ease';
    style.overflow = 'hidden';
    style.margin = '15px 0';
    style.minHeight = '1.5em';
    style.lineHeight = '1.2';
    style.textAlign = 'center';
    // 确保是块级元素，避免 inline 高度异常
    if (getComputedStyle(el).display === 'inline') {
        style.display = 'block';
    }
}

//用于判断是不是字体直链
function isFontFile(url) {
    return /\.(woff2?|ttf|otf)(\?.*)?$/i.test(url);
}
//字体加载函数
async function loadFontForElement(el, fontConfig) {
    if (!fontConfig || !fontConfig.url || !fontConfig.name) return;

    const { name, url } = fontConfig;

    // 注入前隐藏，防止 FOUT
    el.style.visibility = 'hidden';

    if (isFontFile(url)) {
        // 1. 字体文件直链
        const font = new FontFace(name, `url(${url})`);
        await font.load();
        document.fonts.add(font);
    } else {
        // 2. CSS（Google Fonts 等）
        const cssText = await fetch(url).then(r => r.text());
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
    }

    // 等待字体系统就绪
    await document.fonts.ready;

    // 应用字体（带 fallback）
    el.style.fontFamily = `'${name}', ${el.style.fontFamily || 'sans-serif'}`;

    // 恢复显示
    el.style.visibility = '';
}

// ===============================
// 核心类：TextScramble
// ===============================
class TextScramble {
    constructor(el, chars) {
        this.el = el;
        this.chars = chars || "░▒▓▖▗▘▙▚▛▜▝▞▟";
        this.update = this.update.bind(this);
    }

    setText(newHtml, config = {}) {
        const oldText = this.el.innerText;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHtml;
        const targetVisibleText = tempDiv.innerText;

        const length = Math.max(oldText.length, targetVisibleText.length);
        const promise = new Promise(resolve => this.resolve = resolve);

        this.queue = [];
        this.finalHtml = newHtml;

        const start_time = config.start_time || 40;
        const end_time = config.end_time || 40;

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = targetVisibleText[i] || '';
            const start = Math.floor(Math.random() * start_time);
            const end = start + Math.floor(Math.random() * end_time);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0; i < this.queue.length; i++) {
            let { from, to, start, end, char } = this.queue[i];

            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.el.innerHTML = this.finalHtml;
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// ===============================
// 工厂函数：createGlitch
// ===============================
function createGlitch(selector, options = {}) {
    const el = document.querySelector(selector);
    if (!el) return;

    initContainerStyle(el);

    if (options.color) el.style.color = options.color;
    if (options.fontSize) el.style.fontSize = options.fontSize;
    if (options.fontWeight) el.style.fontWeight = options.fontWeight;

    if (options.webFont) {
        loadFontForElement(el, options.webFont)
            .finally(() => startGlitch(el, options));
    } else {
        if (options.fontFamily) {
            el.style.fontFamily = options.fontFamily;
        }
        startGlitch(el, options);
    }
}

function startGlitch(el, options) {
    const phrases = options.phrases || ["Text"];

    // 高度预计算
    if (phrases.length > 0) {
        const ghost = el.cloneNode(true);
        ghost.style.visibility = 'hidden';
        ghost.style.position = 'absolute';
        ghost.style.top = '-9999px';
        ghost.style.left = '-9999px';
        ghost.style.width = getComputedStyle(el).width;
        ghost.style.height = 'auto';
        ghost.style.minHeight = '0';

        el.parentNode.appendChild(ghost);

        let maxHeight = 0;
        phrases.forEach(p => {
            ghost.innerHTML = p;
            maxHeight = Math.max(maxHeight, ghost.offsetHeight);
        });

        el.parentNode.removeChild(ghost);
        el.style.minHeight = `${maxHeight}px`;
    }

    const fx = new TextScramble(el, options.obfu_chars);
    let counter = 0;
    const disp_time = options.disp_time || 2000;
    const loop = options.loop !== false;

    const next = () => {
        fx.setText(phrases[counter], {
            start_time: options.start_time,
            end_time: options.end_time
        }).then(() => {
            setTimeout(next, disp_time);
        });

        if (!loop && counter < phrases.length - 1) {
            counter++;
        } else if (loop) {
            counter = (counter + 1) % phrases.length;
        }
    };

    setTimeout(next, options.delay || 0);
}

