---
title: 个人博客搭建：Github Pages + Hexo
date: 2026-09-30 19:56:13
categories:
  - 折腾记录
tags:
  - Hexo
  - GitHub Pages
  - 静态博客
---

花了一个晚上，把博客从「想搭」变成了「能访问」。整个过程零成本：Hexo 负责把 Markdown 渲染成静态网站，GitHub Pages 负责免费托管。这篇记录一下为什么这么选、具体怎么搭，以及我踩到的几个坑。

> 本文所有命令都在 Windows + Git Bash 下实际验证过，macOS / Linux 只需改掉路径写法。

## 一、为什么要自己搭博客

先说动机。我一开始也用过内容平台，用久了有几个坎绕不过去：

- **账号不是自己的。** 平台改规则、限流、下架甚至关门，文章就跟着一起消失。所谓「导出」常常是把图片链接挖掉的那种假导出。
- **页面不属于你。** 首页、侧边栏、文末推荐，处处是平台塞进来的广告和推荐流。
- **样式改不了。** 想加个公式、换套代码高亮配色、放个可交互的 demo，只能看平台脸色。
- **技术积累没有沉淀。** 写作过程本身就是在梳理知识，而「自己的站」才是能拿去写进简历的东西。

自己搭的好处很直接：**数据在自己硬盘和 Git 历史里，站点是纯静态文件，访问快且几乎不会挂，样式想怎么改就怎么改，成本 0 元。**

## 二、为什么是 GitHub Pages + Hexo

### 2.1 先把常见方案摆出来对比

| 方案 | 需要服务器 | 费用 | 优点 | 缺点 |
| --- | --- | --- | --- | --- |
| WordPress | 需要 | 域名 + 主机 | 插件生态成熟、后台可视 | 要运维、有安全风险、动态查询偏慢 |
| 掘金 / CSDN / 知乎 | 不需要 | 免费 | 自带流量 | 不是自己的站、广告多、迁移困难 |
| Vercel / Netlify + Next.js | 不需要 | 免费额度 | 技术现代、能写后端 | 学习成本高、内容与代码强耦合 |
| **GitHub Pages + Hexo** | **不需要** | **0 元** | **免费 HTTPS、静态极快、Git 天然版本管理** | **没有后端，要会一点命令行** |

对我而言决定性的一点是：**GitHub Pages 只能托管静态文件，跑不了后端。** 而博客恰好就是纯静态的——这反而把它的短板变成了长板：没有数据库、没有常驻服务端进程，也就没有漏洞和运维负担。

### 2.2 静态博客框架为什么选 Hexo

主流候选有三个：

- **Jekyll**：GitHub 原生支持，但依赖 Ruby 环境，Windows 上装依赖是出了名的折腾。
- **Hugo**：构建速度最快（Go 写的，几百篇文章也是毫秒级），但改主题要学 Go template 语法，样式定制门槛偏高。
- **Hexo**：Node.js 生态，和前端技术栈天然契合；中文文档、教程、主题数量都是最多的（NexT、Butterfly、Fluid、Volantis…）；`hexo-deployer-git` 把部署简化成一条命令。

结论：**有前端基础 + 主要用中文写作 → Hexo 最省心。**

### 2.3 GitHub Pages 到底「白嫖」到了什么

- 免费的公网地址，格式为 `https://用户名.github.io`
- 自动签发并续期 HTTPS 证书，不用自己折腾 SSL
- 走 GitHub 的 CDN，访问速度尚可
- 支持绑定自己的域名（域名本身要花钱，一年几十块）
- 与 Git 打通：推代码即发布

## 三、原理：静态站点生成器到底做了什么

这一步想清楚了，后面所有命令都不用死记。

**浏览器只认 HTML / CSS / JS，不认 Markdown。** 如果把 `.md` 直接传到 GitHub Pages，它只会把 Markdown 原文当纯文本吐给浏览器，不会帮你排版。中间必须有一个「翻译」环节，这个翻译工就是 Hexo。

完整链路：

```
我写 Markdown   ─┐
主题模板 (EJS)   ─┼──> hexo g 渲染 ──> public/ 纯静态文件
配置文件         ─┘                          │
                                             ↓
                        hexo d 推送 ──> GitHub 仓库 main 分支
                                             ↓
                                   GitHub Pages 读取并发布
```

几个必须建立的概念：

1. **`source/`** 是内容目录，`source/_posts/` 放文章，一篇一个 `.md`。
2. **`themes/`** 是皮肤，HTML 骨架和 CSS 都在这里，换主题就是换这个目录。
3. **`scaffolds/`** 是新建文章的模板，决定 front-matter 里默认出现哪些字段。
4. **`_config.yml`** 是总开关，站点名、作者、URL 规则、部署目标全在这里。
5. **`public/`** 是生成结果，**它才是「网站」本身**，里面每个 `.html` 对应线上一个页面。

由此有个重要推论：**线上看到的是 `public/` 的一份快照，不是你写的 Markdown。** 所以每次改完内容或配置，都必须重新生成并推送，线上才会变。这也解释了那个经典困惑——「我改了配置怎么没生效？」，八成是忘了 `hexo g`。

还有一个关键概念是 **permalink（永久链接）**，它决定每篇文章的 URL 长什么样，默认规则是 `:year/:month/:day/:title/`。我在这一项上踩了本文最大的坑，第四节细说。

## 四、开工前的准备

只需要两样东西：

| 依赖 | 要求 | 自检命令 |
| --- | --- | --- |
| Node.js | ≥ 18（我用 v22.22.2） | `node -v` |
| Git | 任意较新版本 | `git --version` |

再加一个 GitHub 账号。不需要服务器、不需要域名，一分钱不花。

## 五、搭建全过程

### 5.1 安装 Hexo 命令行工具

```bash
npm install -g hexo-cli
hexo -v
```

如果卡在下载，可以换国内镜像源：

```bash
npm config set registry https://registry.npmmirror.com
```

装完 `hexo -v` 提示找不到命令？**关掉终端重开一个**——PATH 需要刷新。

### 5.2 初始化项目

```bash
cd /d/                      # 换成你想放的盘，路径不要含中文和空格
hexo init myblog
cd myblog
npm install
```

`hexo init` 会拉取官方脚手架并自动装好依赖，得到一个可以直接跑的博客骨架。

### 5.3 本地预览

```bash
hexo g      # generate：把 source/ 渲染成 public/
hexo s      # server：启动本地预览服务
```

浏览器打开 `http://localhost:4000`，看到默认欢迎页就说明环境没问题，`Ctrl + C` 停止。

**本地预览这一步别省。** 所有配置错误在这里就能暴露，不必等推到线上才发现。

### 5.4 写第一篇文章

```bash
hexo new post "文章标题"
```

生成的 `source/_posts/文章标题.md` 结构如下：

```markdown
---
title: 文章标题
date: 2026-09-30 19:56:13
tags:
---
```

两条 `---` 之间的部分叫 **front-matter**，是文章的元数据（标题、日期、标签、分类、置顶等）。正文写在第二个 `---` 之后，正常写 Markdown 即可。

### 5.5 配置 `_config.yml`

这是全站主配置，改这几项就够开始了：

```yaml
# 站点信息
title: 个人博客搭建：Github Pages + Hexo
subtitle: ''
author: Lenmoncc
language: zh-CN
timezone: 'Asia/Shanghai'

# 网址
url: https://lenmoncc.github.io      # 必须和真实地址一致
root: /                              # 用户主页站固定写 /
permalink: :year/:month/:day/:title/  # 文章 URL 规则

# 部署
deploy:
  type: git
  repo: git@github.com:Lenmoncc/Lenmoncc.github.io.git
  branch: main
  message: '站点更新: {{ now("yyyy-MM-dd HH:mm:ss") }}'
```

几个容易错的点：

- YAML 要求**冒号后必须有一个空格**，缩进只能用空格、不能用 Tab。
- `url` 写错会导致 CSS 和图片全部 404，因为静态资源的链接是按 `url + root` 拼出来的。
- `timezone` 建议显式设置，否则日期按服务器时区渲染，容易出现「文章日期差一天」。
- 部署提交信息里的 `yyyy-MM-dd` 必须**小写**，原因见第四节坑 3。

（把上面的 `Lenmoncc` 换成你的用户名即可。）

### 5.6 创建 GitHub 仓库

仓库名必须**一字不差**地写成 `你的用户名.github.io`，这是 GitHub Pages 的「用户主页站」规则：

- 仓库名 = `用户名.github.io` → 网址是 `https://用户名.github.io`
- 仓库名 = 其他任意名字 → 网址变成 `https://用户名.github.io/仓库名`，还得额外处理 `root` 配置

建议选第一种，地址干净。可见性必须选 **Public**（私有仓库用 Pages 需要付费）。初始化选项都不用勾，留一个空仓库就行。

### 5.7 配置 SSH 密钥

部署走 SSH 比 HTTPS 省心，不用每次输密码，也不用配 token：

```bash
ssh-keygen -t ed25519 -C "你的邮箱"    # 一路回车，用默认路径
cat ~/.ssh/id_ed25519.pub              # 复制输出的整行公钥
```

把这行公钥粘到 GitHub → 右上角头像 → **Settings** → **SSH and GPG keys** → **New SSH key**。

然后验证：

```bash
ssh -T git@github.com
```

看到 `Hi 用户名! You've successfully authenticated` 就成了。**第一次执行时 ssh 会问你一个指纹确认问题，这一步别跳过，见坑 2。**

### 5.8 安装部署插件

```bash
npm install hexo-deployer-git --save
```

不装这个，`hexo d` 会直接报 `ERROR Deployer not found: git`。

### 5.9 一键部署

```bash
hexo clean && hexo d -g
```

三个动作的含义：

- `hexo clean`：清掉 `public/` 和缓存数据库 `db.json`
- `-g`：先生成静态文件
- `hexo d`：把 `public/` 的内容提交并推送到仓库的 `main` 分支

推送成功后，`main` 分支里会出现 `index.html`、`css/`、`js/`、`2026/` 等目录——注意，**它们全是生成物，不是源码**。

### 5.10 开启 GitHub Pages

仓库 → **Settings** → 左侧 **Pages**，Source 选 `Deploy from a branch`，Branch 选 `main` + `/ (root)`，Save。

等 1~2 分钟，访问 `https://你的用户名.github.io`——上线了。

## 六、我踩过的 6 个坑

这一节是本文最有价值的部分，每个坑都附上原因分析。

### 坑 1：`public/undefined/undefined/undefined/` 让整个构建崩掉

**现象**：`hexo g` 直接 FATAL：

```
Error: ENOENT: no such file or directory, mkdir 'D:\myblog\public\undefined\undefined\undefined\...'
```

**原因**：我把 permalink 当成普通配置项来理解了，直接手写成了具体值：

```yaml
permalink: :2026/:09/:30/:个人博客搭建：Github Pages + Hexo/   # 错
```

而 Hexo 的 permalink 只认**命名占位符**。翻 `hexo-util` 的源码可以看得很清楚：

```js
const rParam = /:(\w*[^_\W])/g;
stringify(data) { return data[name]; }   // 查不到 → 直接返回 undefined
```

它会把 `:2026` 当作一个名叫 `2026` 的变量去查表，查不到就输出字符串 `undefined`——那三个 `undefined` 就是这么来的。更坑的是后半段：JS 正则里的 `\w` 不包含中文，所以 `:个人博客搭建：…` 整段被**原样保留**，而 Windows 不允许目录名里出现冒号，`mkdir` 于是抛 `ENOENT`，构建中断。

**解决**：老老实实写占位符。

```yaml
permalink: :year/:month/:day/:title/   # 对
```

**引申**：`:title` 取的是**文件名（slug）**，不是 front-matter 里的 title；想用 front-matter 标题得写 `:post_title`。

### 坑 2：`Host key verification failed`

**现象**：`hexo d` 推不上去，SSH 直接拒绝。

**原因**：SSH 第一次连接一台主机时，需要你确认对方公钥的指纹并写入 `~/.ssh/known_hosts`。如果是非交互环境（或被工具调用），没法弹窗问你，就只能报「验证失败」。

**解决**：手动先连一次并确认：

```bash
ssh -T git@github.com
```

它会打印服务器指纹，GitHub 官方公布的 ed25519 指纹是：

```
SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
```

**核对一致再输 `yes`**。指纹对不上就别确认——那可能是中间人。

### 坑 3：提交信息渲染成了 `YYYY-09-2026年9月30日 20:27:26`

**现象**：仓库提交记录里躺着这么一条：

```
站点更新: YYYY-09-2026年9月30日 20:27:26
```

`YYYY` 没被替换，`DD` 却变成了一整段中文日期。

**原因**：这是最有趣的一个。Hexo 自己的 `now()` 助手用的是 **Moment.js**，格式符是 `YYYY-MM-DD`；但 `hexo-deployer-git` 在自己的源码里另起了一套，用的是 **Luxon**：

```js
const swigHelpers = {
  now: function(format) {
    return DateTime.now().toFormat(format);   // Luxon
  }
};
```

Luxon 遵循 Unicode CLDR 的 token 规范，和 Moment 有两处关键差异：

| 写法 | Moment 结果 | Luxon 结果 |
| --- | --- | --- |
| `YYYY` | 2026 | 不认识该 token → 原样输出 `YYYY` |
| `yyyy` | 2026 | 2026 |
| `DD` | 30 | 本地化中等长度日期 → `2026年9月30日` |
| `dd` | 30 | 30 |

于是 `YYYY-MM-DD` 被 Luxon 解释成「字面量 YYYY + 月 09 + 本地化日期 + 时间」。有意思的是，插件源码里自己给的默认值写的正是小写：`'Site updated: {{ now("yyyy-MM-dd HH:mm:ss") }}'`。

**解决**：

```yaml
message: '站点更新: {{ now("yyyy-MM-dd HH:mm:ss") }}'
```

**教训**：跨库的「同名字段」是最容易出事的地方。遇到格式化异常，先去读那个库的源码，别靠记忆。

### 坑 4：`hexo d` 是**强制覆盖**推送

**现象**：在 GitHub 网页上直接改了文件，下次部署后被冲掉了。

**原因**：插件源码里的推送命令是：

```js
git('push', '-u', repo.url, 'HEAD:' + repo.branch, '--force')
```

带了 `--force`，意味着**目标分支会被本地生成物完全覆盖**。

**推论**：所有改动都要走源码——本地 Markdown、`_config.yml`、主题配置——改完重新部署。想放 CNAME 这类特殊文件，应该放进 `source/` 让它被一起生成，而不是直接丢在仓库里。

**另一面**：也正因为是 force push，仓库里曾经存在的 README 或初始提交都不会挡路，第一次部署不必担心冲突。

### 坑 5：源码其实不在仓库里

**现象**：以为推上去就万事大吉，结果发现 `main` 分支里只有 HTML，没有一篇 `.md`。

**原因**：`hexo d` 推的是 `public/`，也就是生成物。**你的 Markdown、`_config.yml`、主题配置都只存在于本地。**

**解决**：给源码单独做一层版本管理。Hexo 脚手架的 `.gitignore` 已经排除了 `public/`、`.deploy_git/`、`node_modules/`，所以直接提交是安全的：

```bash
cd myblog
git init
git add .
git commit -m "备份博客源码"
git branch -M backup
git remote add origin git@github.com:你的用户名/你的用户名.github.io.git
git push -u origin backup
```

`main` 分支归 `hexo d` 管，`backup` 分支归你手写，两边互不干扰。

### 坑 6：文章链接变成一长串 `%E6%90%AD%E5%BB%BA...`

**现象**：文章的地址是 `https://lenmoncc.github.io/2026/09/30/%E6%90%AD%E5%BB%BA%E4%B8%AA%E4%BA%BA%E5%8D%9A%E5%AE%A2/`，又长又难看，复制分享给别人更没法看。

**原因**：URL 规范里只允许 ASCII 字符。中文会被浏览器按 UTF-8 逐字节做 **percent-encoding（百分号编码）**——「搭」的 UTF-8 字节是 `E6 90 AD`，就编码成 `%E6%90%AD`，一个汉字要占 9 个字符。而 permalink 里的 `:title` 取的是**文件名**：

```js
// node_modules/hexo/dist/plugins/processor/post.js 第 48 行
data.slug = info.title;   // 用文件名生成 slug
```

文件名是中文，URL 自然就是中文编码。

**解决**：把源文件改成英文名，比如 `source/_posts/hexo-github-pages-blog.md`。文章标题由 front-matter 的 `title` 决定，**改名不影响页面上显示的中文标题**。

这里有个反直觉的点值得单独说：**在 front-matter 里写 `slug:` 是无效的**。上面那行 `data.slug = info.title` 是**无条件赋值**，会把你写的 `slug` 直接覆盖掉——我一开始就是这么改的，生成出来路径纹丝不动。想让 URL 与文件名彻底解耦，只能用 front-matter 的 `permalink` 指定完整路径：

```yaml
---
title: 个人博客搭建：Github Pages + Hexo
permalink: 2026/09/30/hexo-github-pages-blog/
---
```

代价是日期写死在 front-matter 里，以后改 `date` 不会同步改 URL。所以我还是选了改文件名这条路。

同理，分类页和标签页的路径（`/categories/折腾记录/`）也会被编码。用 `_config.yml` 里的 `category_map` / `tag_map` 可以指定英文路径，页面上显示的仍然是中文名：

```yaml
category_map:
  折腾记录: notes
tag_map:
  Hexo: hexo
  GitHub Pages: github-pages
  静态博客: static-blog
```

## 七、目录结构速查

```
myblog/
├── _config.yml           # 全站主配置（站点信息 / URL / 部署）
├── _config.butterfly.yml # 主题配置（与主题本体分离，升级不覆盖）
├── package.json          # 依赖清单
├── scaffolds/            # 新建文章的模板
├── source/               # 内容源（要备份的就是这里）
│   ├── _posts/           #   ← 文章都在这
│   │   ├── hello-world.md
│   │   └── hexo-github-pages-blog.md
│   ├── img/              # 头像、首页横幅等图片
│   └── js/               # 自定义脚本
├── themes/               # 主题
│   └── butterfly/
├── public/               # ← 生成结果，即「网站」，不提交
└── .deploy_git/          # 部署时自动创建的 git 工作区，不提交
```

## 八、日常写作流程

新增一篇的完整循环：

```bash
# 1. 新建
hexo new post "文章标题"

# 2. 编辑 source/_posts/文章标题.md，写正文

# 3. 本地预览（可选，但强烈建议）
hexo s        # 打开 http://localhost:4000 看效果

# 4. 发布
hexo clean && hexo d -g

# 5. 备份源码
git add . && git commit -m "新增文章：文章标题" && git push
```

常用命令备忘：

| 命令 | 作用 |
| --- | --- |
| `hexo new post "标题"` | 新建文章 |
| `hexo new page "about"` | 新建独立页面（如「关于」） |
| `hexo g` / `hexo generate` | 生成静态文件 |
| `hexo s` / `hexo server` | 本地预览（默认 4000 端口） |
| `hexo d -g` | 生成并部署 |
| `hexo clean` | 清理缓存和 `public/` |
| `hexo list post` | 列出所有文章 |

## 九、搭建之后又做了三件事

搭起来只是起点。写这篇的时候，下面这几项已经落地了：

1. **换掉了默认主题。** landscape 太朴素，换成了 [Butterfly](https://butterfly.js.org/)。做法是把主题 clone 到 `themes/` 目录，再把主题自带的 `_config.yml` 复制到站点根目录、重命名为 `_config.butterfly.yml` 单独维护——**这样以后更新主题不会覆盖自己的配置**。注意 Butterfly 依赖 `hexo-renderer-pug` 和 `hexo-renderer-stylus`，要先用 `npm install` 装上。
2. **源码备份到 `backup` 分支。** 就是坑 5 里那套方案。现在仓库里 `main` 归 `hexo d` 管，`backup` 归手写，互不干扰。
3. **加了 Giscus 评论。** 基于 GitHub Discussions，不需要额外注册账号，也没有第三方广告。

   它的前置条件有**三个**，缺一个都会卡住，而多数教程只提前两个：

   1. 仓库必须是**公开**的；
   2. 仓库 Settings → General → Features 里勾选 **Discussions**；
   3. 把 **giscus GitHub App 安装到这个仓库上**（到 [github.com/apps/giscus](https://github.com/apps/giscus) 点 Install，选 Only select repositories，只授权这一个仓库）。

   我一开始只做了 ①②，结果 [giscus.app](https://giscus.app/) 一直报「无法在该仓库上使用 giscus」，来回折腾半天才发现是 ③ 没做 —— 而这个 App 不只是配置工具，评论的写入本身就依赖它，绕不过去。

   三步齐了之后，在 giscus.app 上填仓库名、映射选 `pathname`、分类选 `Announcements`，就能拿到 `repo-id` 和 `category-id`，填进 `_config.butterfly.yml` 的 `giscus` 段。

   想快速判断卡在哪一条，可以直接问 giscus 的接口：

   ```bash
   curl -s "https://giscus.app/api/discussions/categories?repo=你的用户名/你的用户名.github.io"
   ```

   返回 `{"error":"giscus is not installed on this repository"}`，就是第 ③ 条没做。三个条件都满足时，它会直接返回该仓库全部分类的 JSON。

## 十、还没做的

1. **图片处理**——开启 `post_asset_folder`，让图片和文章放在一起，或者上对象存储做图床。
2. **SEO**——加 `hexo-generator-sitemap` 和 `hexo-generator-feed`，生成 sitemap 和 RSS。
3. **自定义域名**——等确定能长期写下去再买，几十块一年，绑个 CNAME 即可。
4. **站内搜索**——Butterfly 自带本地搜索能力，装 `hexo-generator-searchdb` 后把 `_config.butterfly.yml` 里的 `search.use` 改成 `local_search` 就行，不依赖第三方服务。

## 写在最后

整个搭建过程其实只有一个晚上的功夫，但「知道每一步为什么」比「照着教程敲命令」重要得多。这次遇到的几个坑——permalink 的占位符规则、Luxon 和 Moment 的格式差异、`hexo d` 的 force push——都逼着我去读了源码，反而比配置本身收获更大。

博客搭好了，接下来就是坚持写。

---

## 欢迎讨论和指正

这篇记录的是我自己的实践过程，受限于经验，文中难免有疏漏、过时，或者更优的解法没写到位的地方。

如果你在照着搭的过程中卡住了、遇到了文中没提到的报错，或者发现我哪里写错了、有更好的做法，都欢迎直接找我聊：

- **邮箱：[3446507446@qq.com](mailto:3446507446@qq.com)**
- 也可以在下方评论区留言，我看到都会回

比起「被读完」，我更希望这篇能帮你少走一点弯路。一起交流，一起进步。
