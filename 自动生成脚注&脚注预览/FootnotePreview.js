/**
 * 脚注预览模块
 */
class FootnotePreview {
    /**
     * @param {string} scopeContainerId - 作用容器的ID (在该容器内查找脚注)
     * @param {string} footnoteClass - 脚注元素的类名 (不带点)
     * @param {string} contentContainerId - 内容容器的ID (在该容器内查找具体内容)
     */
    constructor(scopeContainerId, footnoteClass, contentContainerId) {
        this.scopeContainer = document.getElementById(scopeContainerId);
        this.footnoteClass = footnoteClass;
        this.contentContainer = document.getElementById(contentContainerId);

        // 用于显示的悬浮框元素
        this.previewBox = null;

        if (!this.scopeContainer || !this.contentContainer) {
            console.error(`FootnotePreview: 找不到容器 ${scopeContainerId} 或 ${contentContainerId}`);
            return;
        }

        this._init();
    }

    _init() {
        // 1. 创建用于显示的悬浮框 (如果尚未创建)
        this._createPreviewBox();

        // 2. 在作用容器内查找所有脚注元素
        const footnotes = this.scopeContainer.getElementsByClassName(this.footnoteClass);

        // 3. 为每个脚注绑定事件
        Array.from(footnotes).forEach(fn => {
            // 获取指向内容的链接
            // 假设结构是 <span class="footnote"><a href="#note1"></a></span> 或直接是 <a class="footnote" href="#note1"></a>
            const link = fn.tagName === 'A' ? fn : fn.querySelector('a');

            if (link) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const contentId = href.substring(1); // 去掉 # 获取 ID

                    fn.addEventListener('mouseenter', () => this._show(contentId));
                    fn.addEventListener('mouseleave', () => this._hide());
                }
            }
        });
    }

    _createPreviewBox() {
        // 创建一个独立的 DOM 元素用于显示内容
        this.previewBox = document.createElement('div');
        this.previewBox.className = 'footnote-preview-box';

        // 初始样式 (也可以写在 CSS 文件中)
        Object.assign(this.previewBox.style, {
            position: 'fixed',
            top: '20px',
            left: '20px',
            maxWidth: '300px',
            padding: '10px 15px',
            backgroundColor: '#fff',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            border: '1px solid #ddd',
            borderRadius: '4px',
            zIndex: '9999',
            opacity: '0',
            visibility: 'hidden',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: 'translateY(-10px)', // 初始位置向上偏移，制造“飘出”效果
            pointerEvents: 'none' // 防止鼠标遮挡
        });

        document.body.appendChild(this.previewBox);
    }

    _show(contentId) {
        // 在内容容器中寻找对应 ID 的元素
        // 使用 CSS 选择器限制在 contentContainer 内部查找，防止 ID 冲突（虽然 ID 应该是唯一的）
        const contentNode = this.contentContainer.querySelector(`#${contentId}`);

        if (contentNode) {
            // 复制内容到悬浮框
            // 注意：这里可以选择是否移除内容里的“返回脚注”链接，这里简单地保留了 HTML
            this.previewBox.innerHTML = contentNode.innerHTML;

            // 显示并执行动画
            this.previewBox.style.visibility = 'visible';
            this.previewBox.style.opacity = '1';
            this.previewBox.style.transform = 'translateY(0)';
        }
    }

    _hide() {
        // 隐藏并重置动画位置
        this.previewBox.style.opacity = '0';
        this.previewBox.style.visibility = 'hidden';
        this.previewBox.style.transform = 'translateY(-10px)';
    }
}
