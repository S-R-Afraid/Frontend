import os
import urllib.parse
import datetime

# ================= 配置区域 =================
# 你的 GitHub Pages 基础 URL
BASE_URL = "https://s-r-afraid.github.io/Frontend/"

# 生成的文件名
OUTPUT_FILENAME = "file-index.html"

# 忽略配置
EXCLUDED_DIRS = {'.git', '.github', '.vscode', 'node_modules', '__pycache__', 'dist', 'venv'}
EXCLUDED_FILES = {'generate_full_index.py', OUTPUT_FILENAME, '.DS_Store', 'CNAME', '.gitignore', 'package-lock.json'}
# ===========================================

def get_web_url(relative_path):
    """生成带前缀的完整 URL"""
    path = relative_path.replace(os.sep, '/') # 替换 Windows 反斜杠
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
        # 过滤忽略项
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

    # 1. 先处理文件夹 (支持折叠)
    for d in dirs:
        sub_path = os.path.join(current_dir, d)
        sub_html = generate_tree_html(sub_path)
        
        if sub_html:
            html += f'''
            <li class="folder-item">
                <details> <!-- 默认展开，如果想默认折叠，去掉 open 属性 -->
                    <summary class="folder-name">📂 {d}</summary>
                    {sub_html}
                </details>
            </li>
            '''
        else:
            html += f'<li class="folder-item empty">📂 {d} (空)</li>'

    # 2. 处理文件
    for f in files:
        rel_path = os.path.join(current_dir, f)
        url = get_web_url(rel_path)
        html += f'<li class="file-item">📄 <a href="{url}" target="_blank">{f}</a></li>\n'

    html += '</ul>'
    return html

def main():
    print("正在生成 HTML 目录树...")
    
    tree_content = generate_tree_html(".")
    
    # 完整的 HTML 模板，包含 CSS 美化
    full_html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frontend Project Index</title>
    <style>
        :root {{
            --bg-color: #f6f8fa;
            --card-bg: #ffffff;
            --text-color: #24292e;
            --link-color: #0366d6;
            --hover-color: #f1f8ff;
            --border-color: #e1e4e8;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
        }}

        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: var(--card-bg);
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid var(--border-color);
        }}

        h1 {{
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
            margin-bottom: 20px;
            font-size: 24px;
        }}
        
        .meta-info {{
            font-size: 14px;
            color: #6a737d;
            margin-bottom: 30px;
        }}

        /* 树状结构样式 */
        ul.tree-list {{
            list-style-type: none;
            padding-left: 20px;
            margin: 0;
        }}
        
        /* 根节点的 ul 不需要缩进太深 */
        .container > ul.tree-list {{
            padding-left: 0;
        }}

        li {{
            margin: 5px 0;
            line-height: 1.6;
        }}

        /* 文件夹摘要样式 */
        details > summary {{
            cursor: pointer;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            list-style: none; /* 隐藏默认三角，部分浏览器需要 */
            user-select: none;
        }}
        
        /* 自定义三角箭头 */
        details > summary::-webkit-details-marker {{
            display: none;
        }}
        
        details > summary::before {{
            content: "▶";
            font-size: 10px;
            display: inline-block;
            margin-right: 6px;
            transition: transform 0.2s;
            color: #6a737d;
        }}

        details[open] > summary::before {{
            transform: rotate(90deg);
        }}

        details > summary:hover {{
            background-color: var(--hover-color);
        }}

        /* 文件链接样式 */
        .file-item {{
            padding-left: 24px; /* 对齐文件夹内容 */
        }}

        a {{
            text-decoration: none;
            color: var(--link-color);
            transition: 0.2s;
        }}

        a:hover {{
            text-decoration: underline;
            color: #005cc5;
        }}
        
        footer {{
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🗂️ Frontend Project Index</h1>
        <div class="meta-info">
            Base URL: <a href="{BASE_URL}" target="_blank">{BASE_URL}</a> <br>
            Last Updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
        
        <!-- 目录树开始 -->
        {tree_content}
        <!-- 目录树结束 -->
        
        <footer>
            Generated by automated script
        </footer>
    </div>
</body>
</html>
    """

    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
        f.write(full_html)
        print(f"✅ HTML 文件已生成: {OUTPUT_FILENAME}")

if __name__ == "__main__":
    main()
