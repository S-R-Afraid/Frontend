import os
import urllib.parse
import datetime

# ================= 配置区域 =================
# 你的 GitHub Pages 基础 URL
BASE_URL = "https://s-r-afraid.github.io/Frontend/"

# 输出文件名
OUTPUT_FILENAME = "file-index.html"  # 建议直接命名为 index.html 作为主页

# 忽略配置
EXCLUDED_DIRS = {'.git', '.github', '.vscode', 'node_modules', '__pycache__', 'dist', 'venv'}
EXCLUDED_FILES = {'generate_full_index.py', OUTPUT_FILENAME, '.DS_Store', 'CNAME', '.gitignore', 'package-lock.json', 'README.md'}
# ===========================================

def get_web_url(relative_path):
    """生成带前缀的完整 URL"""
    path = relative_path.replace(os.sep, '/')
    if path.startswith('./'):
        path = path[2:]
    safe_path = urllib.parse.quote(path)
    return BASE_URL + safe_path

def generate_tree_html(current_dir):
    """递归生成 HTML 结构"""
    try:
        items = os.listdir(current_dir)
    except PermissionError:
        return ""

    dirs = []
    files = []

    for item in items:
        if item.startswith('.') or item in EXCLUDED_FILES or item in EXCLUDED_DIRS:
            continue
            
        full_path = os.path.join(current_dir, item)
        if os.path.isdir(full_path):
            dirs.append(item)
        else:
            files.append(item)

    dirs.sort()
    files.sort()

    if not dirs and not files:
        return ""

    html = '<ul class="tree-list">\n'

    # 1. 文件夹
    for d in dirs:
        sub_path = os.path.join(current_dir, d)
        sub_html = generate_tree_html(sub_path)
        
        if sub_html:
            # 默认 open 展开，如果想折叠请删除 open
            html += f'''
            <li class="folder-item">
                <details> 
                    <summary class="folder-name"><span class="icon">📂</span>{d}</summary>
                    {sub_html}
                </details>
            </li>
            '''
        else:
            html += f'<li class="folder-item empty"><span class="icon">📂</span>{d} (空)</li>'

    # 2. 文件
    for f in files:
        rel_path = os.path.join(current_dir, f)
        url = get_web_url(rel_path)
        html += f'<li class="file-item"><span class="icon">📄</span><a href="{url}" target="_blank">{f}</a></li>\n'

    html += '</ul>'
    return html

def main():
    print("正在生成暗黑模式 HTML 目录树...")
    
    tree_content = generate_tree_html(".")
    
    # 暗黑模式 CSS 样式
    full_html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frontend Index</title>
    <style>
        :root {{
            --bg-color: #0d1117;       /* GitHub Dark 背景 */
            --card-bg: #161b22;        /* 卡片深色背景 */
            --text-color: #c9d1d9;     /* 浅灰文字 */
            --link-color: #58a6ff;     /* 蓝色链接 */
            --link-hover: #79c0ff;     /* 悬停亮蓝 */
            --border-color: #30363d;   /* 边框颜色 */
            --hover-bg: #21262d;       /* 鼠标悬停背景 */
            --icon-color: #8b949e;     /* 图标颜色 */
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            line-height: 1.5;
        }}

        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: var(--card-bg);
            padding: 40px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }}

        h1 {{
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
            margin-bottom: 20px;
            font-size: 24px;
            color: #f0f6fc;
        }}
        
        .meta-info {{
            font-size: 13px;
            color: var(--icon-color);
            margin-bottom: 25px;
            background: rgba(56, 139, 253, 0.1);
            padding: 10px;
            border-radius: 6px;
            border: 1px solid rgba(56, 139, 253, 0.4);
        }}

        .meta-info a {{
            color: var(--text-color);
            text-decoration: underline;
        }}

        /* 树状列表样式 */
        ul.tree-list {{
            list-style-type: none;
            padding-left: 18px;
            margin: 0;
            border-left: 1px solid var(--border-color); /* 添加竖线指引 */
        }}
        
        /* 顶层不需要左边框 */
        .container > ul.tree-list {{
            padding-left: 0;
            border-left: none;
        }}

        li {{
            margin: 2px 0;
        }}

        .icon {{
            margin-right: 8px;
            opacity: 0.8;
        }}

        /* 文件夹摘要 */
        details > summary {{
            cursor: pointer;
            padding: 6px 10px;
            border-radius: 6px;
            list-style: none; 
            transition: background 0.2s;
            display: flex;
            align-items: center;
        }}
        
        details > summary::-webkit-details-marker {{ display: none; }}
        
        /* 自定义箭头 */
        details > summary::before {{
            content: "▶";
            font-size: 10px;
            display: inline-block;
            margin-right: 8px;
            color: var(--icon-color);
            transition: transform 0.2s;
        }}

        details[open] > summary::before {{
            transform: rotate(90deg);
        }}

        details > summary:hover {{
            background-color: var(--hover-bg);
            color: #f0f6fc;
        }}

        /* 文件链接 */
        .file-item {{
            padding-left: 28px; /* 对齐 */
            padding-top: 4px;
            padding-bottom: 4px;
        }}

        a {{
            text-decoration: none;
            color: var(--link-color);
            transition: color 0.2s;
        }}

        a:hover {{
            color: var(--link-hover);
            text-decoration: underline;
        }}
        
        footer {{
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: var(--icon-color);
            border-top: 1px solid var(--border-color);
            padding-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🗂️ Frontend Project Index</h1>
        <div class="meta-info">
            <strong>Base URL:</strong> {BASE_URL} <br>
            <strong>Last Updated:</strong> {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
        
        {tree_content}
        
        <footer>
            Generated by automated Python script
        </footer>
    </div>
</body>
</html>
    """

    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
        f.write(full_html)
        print(f"✅ 暗黑模式 HTML 已生成: {OUTPUT_FILENAME}")

if __name__ == "__main__":
    main()
