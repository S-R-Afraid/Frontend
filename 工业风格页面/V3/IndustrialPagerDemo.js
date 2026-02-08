//hover角标动画
const indicator = document.getElementById('corner-indicator');
let currentTarget = null;
let lastTarget = null;

// 移动角标到目标元素
function moveIndicatorTo(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();

    indicator.style.width = r.width + 'px';
    indicator.style.height = r.height + 'px';
    indicator.style.transform = `translate(${r.left}px, ${r.top}px)`;
    indicator.style.opacity = '1';
}

// ---------- 监听 hover ----------
document.addEventListener('pointerenter', e => {
    const el = e.target.closest('[data-selectable]');
    if (!el || el === currentTarget) return;

    lastTarget = currentTarget;
    currentTarget = el;

    // 如果有上一个元素，平滑过渡
    if (lastTarget) {
        moveIndicatorTo(currentTarget);
    } else {
        moveIndicatorTo(el);
    }
}, true);

// ---------- 页面滚动跟随 ----------
function bindScrollTracking() {
    const scrollables = document.querySelectorAll('.page-scroll, .page');
    scrollables.forEach(sc => {
        sc.addEventListener('scroll', () => {
            if (currentTarget && sc.contains(currentTarget)) moveIndicatorTo(currentTarget);
        }, { passive: true });
    });
}
bindScrollTracking();

// ---------- 窗口 resize ----------
window.addEventListener('resize', () => {
    if (currentTarget) moveIndicatorTo(currentTarget);
});

// ---------- 翻页时清除角标 ----------
function clearIndicator() {
    currentTarget = null;
    lastTarget = null;
    indicator.style.opacity = '0';
}






/*翻页工具函数 */
function getActiveScroller() {
    const page = document.querySelector('.page.active');
    return page ? page.querySelector('.page-scroll') : null;
}

function atTop(el) {
    return el.scrollTop <= 0;
}

function atBottom(el) {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
}

/* 翻页逻辑 */
const pages = [...document.querySelectorAll('.page')];
let index = 0;

function updatePages() {
    pages.forEach((p, i) => {
        p.classList.remove('active', 'prev');
        if (i === index) p.classList.add('active');
        if (i < index) p.classList.add('prev');
    });
    document.querySelector('#progress span').style.width =
        (index / (pages.length - 1)) * 100 + '%';

    /* 页面切换时，强制释放角标 */
    clearIndicator();
}

window.addEventListener('wheel', e => {
    const scroller = getActiveScroller();
    if (!scroller) return;

    const delta = e.deltaY;
    const canScroll = scroller.scrollHeight > scroller.clientHeight;

    if (delta > 0) {
        // 向下滚
        if (!canScroll || atBottom(scroller)) {
            if (index < pages.length - 1) {
                e.preventDefault();
                index++;
                updatePages();
            }
        }
    } else if (delta < 0) {
        // 向上滚
        if (!canScroll || atTop(scroller)) {
            if (index > 0) {
                e.preventDefault();
                index--;
                updatePages();
            }
        }
    }
}, { passive: false });


//触摸翻页
let touchStartY = 0;

window.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', e => {
    if (e.changedTouches.length !== 1) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY;
    const threshold = 60;

    if (Math.abs(deltaY) < threshold) return;

    const scroller = getActiveScroller();
    if (!scroller) return;

    const canScroll = scroller.scrollHeight > scroller.clientHeight;

    if (deltaY < 0) {
        // 向上滑 → 下一页
        if (!canScroll || atBottom(scroller)) {
            if (index < pages.length - 1) {
                index++;
                updatePages();
            }
        }
    } else {
        // 向下滑 → 上一页
        if (!canScroll || atTop(scroller)) {
            if (index > 0) {
                index--;
                updatePages();
            }
        }
    }
}, { passive: true });






const goHomeBtn = document.getElementById('goHome');
if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
        // 如果页面中存在全局 go(index) 或 window.__TITAN.go 等，请调用之
        if (typeof window.__TITAN === 'object' && typeof window.__TITAN.go === 'function') {
            window.__TITAN.go(0);
        } else {
            // 尝试寻找 pager 全局并回到 0（兼容之前示例）
            if (window.document) {
                const first = document.querySelector('.page');
                if (first) {
                    // 清所有 active/fading 并激活首页（非破坏性）
                    document.querySelectorAll('.page').forEach(p => p.classList.remove('active', 'fading', 'prev'));
                    first.classList.add('active');
                }
            }
        }
    });
    // 可通过键盘回车触发
    goHomeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') goHomeBtn.click(); });
}

//鼠标坐标追踪
const root = document.documentElement;
const mxEl = document.getElementById('mx');
const myEl = document.getElementById('my');

let x = window.innerWidth / 2;
let y = window.innerHeight / 2;
let ticking = false;

function update() {
    /* 1. 驱动背景网格发光 */
    root.style.setProperty('--cursor-x', x + 'px');
    root.style.setProperty('--cursor-y', y + 'px');

    /* 2. 更新页眉坐标显示 */
    if (mxEl) mxEl.textContent = x;
    if (myEl) myEl.textContent = y;

    ticking = false;
}

window.addEventListener('mousemove', e => {
    x = e.clientX;
    y = e.clientY;

    if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
    }
}, { passive: true });

// 时钟（24小时，固定格式）
const clockEl = document.getElementById('clock');
function tick() {
    if (!clockEl) return;
    const d = new Date();
    // 固定两位数
    const pad = n => String(n).padStart(2, '0');
    clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tick();
setInterval(tick, 1000);
