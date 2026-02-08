FootnoteGenerator.js:
> 脚注模块，可以寻找带有特定类的p元素，依据先后顺序创建sup元素并修改sup元素内容为相应数字，将p元素内容移动带特定容器内并创建p和sup的双向链接。  
> 模块向外暴露6个参数，分别是识别为脚注的类名、作用范围id、容器id、数字类型（1、一、壹、A、a、I等）、创建sup时附加的类、创建p时附加的类。

使用示例：
```html
<script src="FootnoteGenerator.js"></script>
<!-- === 区域 1：文章 A === -->
    <div id="section-a" style="background: #f9f9f9; padding: 20px; margin-bottom: 20px;">
        <h2>文章 A (使用罗马数字)</h2>
        <p>这是文章 A 的内容，这里有一个脚注。
        <p class="note">文章 A 的注释 1</p>
        </p>
        <p>文章 A 继续...
        <p class="note">文章 A 的注释 2</p>
        </p>

        <!-- 文章 A 的脚注容器 -->
        <div id="footer-a" style="border-top: 1px solid #ccc; margin-top: 10px;"></div>
    </div>

    <!-- === 区域 2：文章 B === -->
    <div id="section-b" style="background: #eef; padding: 20px;">
        <h2>文章 B (使用中文大写)</h2>
        <p>这是文章 B 的内容，序号应该重新从 1 开始。
        <p class="note">文章 B 的注释 1</p>
        </p>

        <!-- 文章 B 的脚注容器 -->
        <div id="footer-b" style="border-top: 1px solid #ccc; margin-top: 10px;"></div>
    </div>
    <script>
        // 实例化区域 A
        // 即使两个区域都用了 .note 类，它也只会找 #section-a 里的
        new FootnoteGenerator(
            'note',          // 目标类名
            'section-a',      // ★ 作用域 ID
            'footer-a',      // 容器ID
            'I',             // 数字类型: 罗马
            'sub-style-a',   // 上标样式类
            'item-style-a',  // 脚注样式类

        );

        // 实例化区域 B 
        new FootnoteGenerator(
            'note',          // 同样的类名
            'section-b',      // ★ 作用域 ID
            'footer-b',      // 不同的容器
            '壹',             // 数字类型: 中文大写
            'sub-style-b',   // 不同的样式
            'item-style-b',  // 不同的样式

        );
    </script>
```
FootnotePreview.js:
>脚注显示模块。传递的第一个参数为作用容器的id，系统只会在这个容器内部去识别脚注元素；
>第二个参数为脚注类，带有该类的元素会被识别为脚注；
>第三个参数为内容容器id，在识别到脚注后，脚本会在内容容器里寻找对应的脚注内容。
>> 注：脚注元素里有一个链接指向内容，内容里也有一个链接指向脚注。

> 寻找到内容后，当用户将鼠标指针悬浮到脚注上时，会在页面左上角飘出脚注内容。
> 
使用示例：
```html
<!-- 实例 1: 文章主体 -->
    <div id="article-body" class="container">
        <h2>文章标题</h2>
        <p>
            这是一个关于 JavaScript 的段落，其中包含一个脚注<sup class="fn-item"><a href="#ref-1">[1]</a></sup>。
            当鼠标悬浮在上面时，左上角会出现内容。
        </p>
        <p>
            这是另一个观点<sup class="fn-item"><a href="#ref-2">[2]</a></sup>。
        </p>
    </div>

    <!-- 实例 1 的内容容器 -->
    <div id="article-references" class="references-section">
        <h3>参考文献</h3>
        <ol>
            <li id="ref-1">这是第一个脚注的具体内容，解释了 JavaScript 的历史。<a href="#">↩</a></li>
            <li id="ref-2">这是第二个脚注，关于模块化编程的细节。<a href="#">↩</a></li>
        </ol>
    </div>

    <hr>

    <!-- 实例 2: 侧边栏 (演示多实例化) -->
    <div id="sidebar" class="container" style="background: #eef;">
        <h3>侧边栏备注</h3>
        <p>
            这里是侧边栏的一些额外信息<span class="sidebar-note"><a href="#side-1">(*)</a></span>。
        </p>
    </div>

    <!-- 实例 2 的内容容器 -->
    <div id="sidebar-references" class="references-section" style="display:none;">
        <!-- 侧边栏的引用内容可以是隐藏的，只要 JS 能获取到即可 -->
        <div id="side-1">侧边栏的特别注释内容：请注意这一点。 <a href="#">return</a></div>
    </div>

    <!-- 引入上面的 JS 类 -->
    <script src="FootnotePreview.js"></script> <!-- 假设上面的JS存为此文件 -->
    <script>
        // 将上面的 JS 代码粘贴在这里，或者通过 src 引入

        // --- 实例化 ---

        // 实例 1: 作用于 'article-body'，识别 'fn-item' 类，内容在 'article-references'
        const articleFootnotes = new FootnotePreview('article-body', 'fn-item', 'article-references');

        // 实例 2: 作用于 'sidebar'，识别 'sidebar-note' 类，内容在 'sidebar-references'
        const sidebarFootnotes = new FootnotePreview('sidebar', 'sidebar-note', 'sidebar-references');
    </script>
```

两个脚本可以结合使用：
示例：
```html
<script src="FootnoteGenerator.js"></script>
<script src="FootnotePreview.js"></script>
<!-- === 区域 1：文章 A === -->
    <div id="section-a" style="background: #f9f9f9; padding: 20px; margin-bottom: 20px;">
        <h2>文章 A (使用罗马数字)</h2>
        <p>这是文章 A 的内容，这里有一个脚注。
        <p class="note">文章 A 的注释 1</p>
        </p>
        <p>文章 A 继续...
        <p class="note">文章 A 的注释 2</p>
        </p>

        <!-- 文章 A 的脚注容器 -->
        <div id="footer-a" style="border-top: 1px solid #ccc; margin-top: 10px;"></div>
    </div>

    <!-- === 区域 2：文章 B === -->
    <div id="section-b" style="background: #eef; padding: 20px;">
        <h2>文章 B (使用中文大写)</h2>
        <p>这是文章 B 的内容，序号应该重新从 1 开始。
        <p class="note">文章 B 的注释 1</p>
        </p>

        <!-- 文章 B 的脚注容器 -->
        <div id="footer-b" style="border-top: 1px solid #ccc; margin-top: 10px;"></div>
    </div>
    <script>
        // 实例化区域 A
        // 即使两个区域都用了 .note 类，它也只会找 #section-a 里的
        new FootnoteGenerator(
            'note',          // 目标类名
            'section-a',      // ★ 作用域 ID
            'footer-a',      // 容器ID
            'I',             // 数字类型: 罗马
            'sup-style-a',   // 上标样式类
            'item-style-a',  // 脚注样式类

        );

        // 实例化区域 B
        new FootnoteGenerator(
            'note',          // 同样的类名
            'section-b',      // ★ 作用域 ID
            'footer-b',      // 不同的容器
            '壹',             // 数字类型: 中文大写
            'sup-style-b',   // 不同的样式
            'item-style-b',  // 不同的样式

        );

        // 实例 1: 作用于 'section-a'，识别 'sup-style-a' 类，内容在 'footer-a'
        const articleFootnotes = new FootnotePreview('section-a', 'sup-style-a', 'footer-a');

        // 实例 2: 作用于 'section-b'，识别 'sup-style-a' 类，内容在 'footer-b'
        const sidebarFootnotes = new FootnotePreview('section-b', 'sup-style-b', 'footer-b');
    </script>
```