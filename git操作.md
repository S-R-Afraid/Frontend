### 上传仓库操作：

1\.在当前文件夹打开git bash 或 打开git bash后移动到当前文件夹

2\.输入 `git add .` 来将所有文件添加进暂存区

3\.输入 `git commit -m "提交文件（或其它说明）"`来讲文件提交到仓库中

4\.输入 `git push` 将本地仓库上传到远程仓库的main分支

5\.等待完成后，从github确认结果，无误后关闭bash即可



### 创建新仓库：

1\.在本地的文件夹中打开git bash

2\.输入 `git init` 将该文件夹作为工作目录

3\.查看[知乎这篇帖子](https://zhuanlan.zhihu.com/p/193140870)的内容，在github上设置ssh密钥

4\.输入 `git add` . 将所有文件添加进暂存区

5\.输入 `git commit -m "提交文件（或其它说明）"`来讲文件提交到仓库中

6\.输入 `git remote add origin %你的github仓库地址，如‘git@github.com:S-R-Afraid/Frontend.git’%`

7\.输入`git branch -M main`来将默认的master分支切换为GitHub默认的main分支

8\.输入 `git push -u origin main`，然后回车，然后输入yes，再回车

9\.创建完成，后续更新参考“上传仓库操作”

---
`git push`参数解释：
>-u(--set-upstream)：建立本地分支与远端分支的追踪关系。
>执行后：
>>main 会追踪 origin/main
>>以后只需执行 git push 或 git pull，无需再写 origin main

>-f(--force):强制推送。
>忽略远端分支的提交历史，直接用本地 main 覆盖远端 main
---

### 其它操作
查看[菜鸟教程](https://www.runoob.com/git/git-tutorial.html)或询问AI。