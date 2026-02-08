/* js/indicator.js */

// ---------- DOM 元素 ----------
const indicator = document.getElementById('corner-indicator');
const highlightRect = document.getElementById('highlight-rect');

// ---------- 状态管理 ----------
// 角标的状态
let indicatorTarget = null;
let lastIndicatorTarget = null;

// 高亮矩形的状态 (独立于角标)
let highlightTarget = null;
let lastHighlightTarget = null;
let highlightTimer = null; // 用于控制延迟展开

// 配置
const GAP = 1; // 矩形内缩间距

// ==========================================
// 1. 角标逻辑 (Corner Indicator)
// ==========================================

function updateIndicator(el) {
    if (!el || el.offsetParent === null) {
        if (indicator) indicator.style.opacity = '0';
        return;
    }

    const r = el.getBoundingClientRect();

    if (indicator) {
        indicator.style.width = r.width + 'px';
        indicator.style.height = r.height + 'px';
        indicator.style.transform = `translate(${r.left}px, ${r.top}px)`;
        indicator.style.opacity = '1';
    }
}

// ==========================================
// 2. 高亮矩形逻辑 (Highlight Rect)
// ==========================================

function updateHighlight(el) {
    if (!el || el.offsetParent === null) {
        // 如果目标元素被隐藏了，才需要隐藏矩形
        if (highlightRect) highlightRect.style.opacity = '0';
        return;
    }

    const rect = el.getBoundingClientRect();
    const innerW = Math.max(0, rect.width - GAP * 2);
    const innerH = Math.max(0, rect.height - GAP * 2);
    const innerX = rect.left + GAP;
    const innerY = rect.top + GAP;

    // --- 情况A: 同一个元素 (由心跳/滚动触发) ---
    // 只更新位置，绝对不重置动画状态
    if (el === highlightTarget) {
        if (highlightRect) {
            highlightRect.style.transform = `translate(${innerX}px, ${innerY}px)`;
            // 如果动画已完成(timer为空)，则同步大小
            if (!highlightTimer) {
                highlightRect.style.width = `${innerW}px`;
                highlightRect.style.height = `${innerH}px`;
            }
        }
        return;
    }

    // --- 情况B: 切换到了新元素 ---

    // 更新历史记录
    lastHighlightTarget = highlightTarget;
    highlightTarget = el;

    // 清除旧的计时器
    if (highlightTimer) {
        clearTimeout(highlightTimer);
        highlightTimer = null;
    }

    if (!highlightRect) return;

    // 判断: 是从另一个高亮块移过来的吗？
    // 注意：这里的判断标准是“上一个目标是否存在且可见”
    // 如果上一个目标存在，我们就认为是“连续移动”，启用平滑过渡
    const wasHighlighting = lastHighlightTarget !== null;

    if (wasHighlighting) {
        // [模式1] 连续移动: 平滑过渡 (无延迟)
        highlightRect.style.transition = `
            transform 0.45s cubic-bezier(.25, 1, .5, 1),
            width 0.35s cubic-bezier(.25, 1, .5, 1),
            height 0.35s cubic-bezier(.25, 1, .5, 1),
            opacity 0.2s ease`;

        highlightRect.style.opacity = '1';
        highlightRect.style.transform = `translate(${innerX}px, ${innerY}px)`;
        highlightRect.style.width = `${innerW}px`;
        highlightRect.style.height = `${innerH}px`;

    } else {
        // [模式2] 新进入: 延迟展开
        // 1. 瞬间定位到左上角 (0x0)
        highlightRect.style.transition = 'none';
        highlightRect.style.transform = `translate(${innerX}px, ${innerY}px)`;
        highlightRect.style.width = '0px';
        highlightRect.style.height = '0px';
        highlightRect.style.opacity = '1';

        // 2. 强制回流
        void highlightRect.offsetHeight;

        // 3. 延迟执行展开
        highlightTimer = setTimeout(() => {
            highlightRect.style.transition = 'width 0.2s ease-out, height 0.2s ease-out';
            highlightRect.style.width = `${innerW}px`;
            highlightRect.style.height = `${innerH}px`;
            highlightTimer = null;
        }, 30);
    }
}

/**
 * 强制隐藏高亮（仅在翻页或特定逻辑调用）
 */
function hideHighlight() {
    if (highlightRect) highlightRect.style.opacity = '0';
    if (highlightTimer) {
        clearTimeout(highlightTimer);
        highlightTimer = null;
    }
    highlightTarget = null;
    lastHighlightTarget = null;
}

// ==========================================
// 3. 事件监听与驱动
// ==========================================

// 统一的更新入口
function refreshAll() {
    if (indicatorTarget) updateIndicator(indicatorTarget);
    if (highlightTarget) updateHighlight(highlightTarget);
}

// 导出：清除所有状态 (翻页时调用)
export function clearIndicator() {
    indicatorTarget = null;
    lastIndicatorTarget = null;
    if (indicator) indicator.style.opacity = '0';

    hideHighlight();
}

// 监听 Pointer Enter
document.addEventListener('pointerenter', e => {
    const target = e.target;

    // --- 逻辑A: 处理角标 (data-selectable) ---
    const elIndicator = target.closest('[data-selectable]');
    if (elIndicator && elIndicator !== indicatorTarget) {
        lastIndicatorTarget = indicatorTarget;
        indicatorTarget = elIndicator;
        updateIndicator(indicatorTarget);
    }

    // --- 逻辑B: 处理高亮矩形 (data-selectable-highlight) ---
    const elHighlight = target.closest('[data-selectable-highlight]');
    if (elHighlight) {
        // 只有当真正找到了一个新的有效高亮目标时，才更新
        if (elHighlight !== highlightTarget) {
            updateHighlight(elHighlight);
        }
    }
    // [修正]: 删除 else 分支。
    // 如果移入空白区域，什么都不做 -> 矩形停留在 lastHighlightTarget 上

}, true);

// 监听滚动
function bindScrollTracking() {
    const scrollables = document.querySelectorAll('.page-scroll, .page');
    scrollables.forEach(sc => {
        sc.addEventListener('scroll', () => {
            refreshAll();
        }, { passive: true });
    });
}
bindScrollTracking();

// 监听 Resize
window.addEventListener('resize', () => {
    refreshAll();
});

// 心跳检测 (300ms)
setInterval(() => {
    refreshAll();
}, 300);
