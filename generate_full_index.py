import os
import urllib.parse

# ================= 配置区域 =================
# 你的 GitHub Pages 基础 URL
BASE_URL = "https://s-r-afraid.github.io/Frontend/"

# 输出文件名
OUTPUT_FILENAME = "FILES.md"

# 忽略的目录
EXCLUDED_DIRS = {
    '.git', '.github', '.vscode', 'node_modules', 
    '__pycache__', '.idea', 'venv', 'dist', 'build'
}

# 忽略的文件
EXCLUDED_FILES = {
    'generate_tree_index.py', 'FILES.md', 'README.md', 
    '.DS_Store', 'CNAME', '.gitignore', 'package-lock.json'
}
# ===========================================

def get_url(relative_path):
    """将相对路径转换为完整 URL"""
    # 统一分隔符为 /
    path = relative_path.replace(os.sep, '/')
    # 移除开头的 ./
    if path.startswith('./') or path.startswith('.//'):
        path = path[2:]
    
    # URL 编码 (解决中文路径问题)
    safe_path = urllib.parse.quote(path)
    return BASE_URL + safe_path

def generate_tree_content(current_dir):
    """递归生成目录树内容的 HTML 字符串"""
    content = ""
    
    try:
        # 获取当前目录下的所有条目
        items = os.listdir(current_dir)
    except PermissionError:
        return ""

    # 分离文件夹和文件
    dirs = []
    files = []
    
    for item in items:
        full_path = os.path.join(current_dir, item)
        
        # 过滤忽略项
        if item in EXCLUDED_FILES or item in EXCLUDED_DIRS or item.startswith('.'):
            continue
            
        if os.path.isdir(full_path):
            dirs.append(item)
        else:
            files.append(item)
    
    # 排序：文件夹和文件按名称排序
    dirs.sort()
    files.sort()

    # 如果目录下没有任何东西，返回空
    if not dirs and not files:
        return ""

    # 开始生成列表
    content += "<ul>\n"

    # 1. 先处理文件 (📄)
    for file_name in files:
        rel_path = os.path.join(current_dir, file_name)
        file_url = get_url(rel_path)
        # 生成列表项
        content += f'  <li>📄 <a href="{file_url}">{file_name}</a></li>\n'

    # 2. 再处理文件夹 (📂) - 递归调用
    for dir_name in dirs:
        sub_dir_path = os.path.join(current_dir, dir_name)
        # 递归获取子目录内容
        sub_content = generate_tree_content(sub_dir_path)
        
        # 只有当子目录不为空时才生成折叠块
        if sub_content.strip():
            content += f"""
  <li>
    <details>
      <summary><strong>📂 {dir_name}</strong></summary>
      {sub_content}
    </details>
  </li>
"""
        else:
            # 如果是空文件夹，只显示名字不生成 details
            content += f'  <li>📂 {dir_name} (空)</li>\n'

    content += "</ul>\n"
    return content

def main():
    print("正在扫描目录并生成索引...")
    
    # 生成树状内容（从当前目录 "." 开始）
    tree_html = generate_tree_content(".")
    
    # 最终写入文件
    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
        f.write(f"# Project File Index\n\n")
        f.write(f"> Base URL: [{BASE_URL}]({BASE_URL})\n\n")
        f.write("--- \n\n")
        f.write(tree_html)
        
    print(f"✅ 完成！已生成: {OUTPUT_FILENAME}")

if __name__ == "__main__":
    main()
