# 在 iPhone 上安装「今日待办」

先说结论：**我没法直接给你一个能点一下就装上的 .ipa 文件**。
苹果规定所有 ipa 必须用「苹果开发者证书 + 描述文件」签名，而证书必须绑定你自己的 Apple ID，别人（包括我）代签的包装到你手机上会被系统拒绝或闪退。

所以下面给你三条路，从省事到彻底，按需选。

---

## 方案 A：PWA 添加到主屏幕（推荐，5 分钟，免费，永久有效）

这就是「无需 App Store 也能装上 iPhone」的官方途径，装完之后和原生 App 几乎没区别：有独立图标、点开全屏无浏览器地址栏、离线可用、数据本地保存。

我已经把这个应用做成了完整的 PWA（含 manifest、图标、离线 Service Worker）。

**步骤：**
1. 把这个文件夹传到任意静态托管（见下方「部署」），拿到一个 https 链接。
2. iPhone 用 **Safari** 打开这个链接（必须 Safari，Chrome 不行）。
3. 点底部的 **分享按钮** → 选择 **「添加到主屏幕」** → 添加。
4. 桌面出现「今日待办」图标，以后从图标点开即可。

> 数据保存在 iPhone 本地（IndexedDB），不上传任何服务器。
> 如果想重装/换机不丢数据，用应用内的「导出备份」下载 JSON，到新机「导入备份」即可。

---

## 方案 B：打成真正的 ipa，自己签名安装（需要一台 Mac）

需要：Mac + Xcode（免费）+ 你的 Apple ID（免费账号即可，签名有效期 7 天，到期重新装一次）。

### 1. 建工程
1. Xcode → **Create New Project** → **iOS → App** → Next。
2. Product Name 填 `今日待办`，Interface 选 **SwiftUI**，Language 选 **Swift**，其余默认。
3. 存到任意位置。

### 2. 放入网页文件
1. 在 Finder 里把项目目录下的 `web` 文件夹（里面应有 `index.html`、`manifest.webmanifest`、`sw.js`、`icons/`）直接**拖进 Xcode 左侧项目导航栏**。
2. 弹窗中勾选 **Create folder references**（蓝色文件夹图标，不是黄色 group），Add to targets 勾选你的 App。

### 3. 替换代码
用本目录下的 `Sources/` 覆盖模板生成的两个文件：
- `Sources/TodoApp.swift` → 替换模板的 `*App.swift`
- `Sources/ContentView.swift` → 替换模板的 `ContentView.swift`

### 4. 打包安装
1. 顶部设备选你的 iPhone（用数据线连接，手机里「信任此电脑」）。
2. Xcode → **Signing & Capabilities** → Team 选你的 Apple ID（没有就点 Add an Account 登录）。
3. 按 **⌘R** 运行，App 会装到手机上并自动打开。
4. 之后每次想再用：Xcode 里再按一次 ⌘R 即可（7 天后需要重装）。

### 5. 想得到 .ipa 文件本身（用于分享/AltStore）
Xcode → **Product → Archive** → 完成后在 Organizer 里 **Distribute App → Debug/Ad Hoc → Export**，导出的就是 .ipa。
> 这个 ipa 只在签了同一 Apple ID 的设备上能装。要给别人用，让对方的 Mac 用他自己的 Apple ID 重签，或用 AltStore / Sideloadly 侧载。

---

## 方案 C：长期稳定版（付费）
注册 Apple Developer Program（$99/年）后可用 TestFlight 分发（90 天有效，无需对方连 Mac），或上架 App Store 永久有效。

---

## 部署（方案 A 需要）

任选其一：
- **GitHub Pages**：仓库根目录放 `index.html`、`manifest.webmanifest`、`sw.js`、`icons/`，Settings → Pages 开启。
- **Vercel / Netlify**：拖拽整个文件夹即得 https 链接。
- **任意虚拟主机 / 对象存储**：只要能通过 https 访问到这些文件。

> 注意：文件路径必须保持相对同级（`manifest.webmanifest`、`sw.js`、`icons/` 与 `index.html` 同级），否则安装和离线功能会失效。

---

## 数据到底存在哪（回答"不要丢数据"）

| 层 | 作用 | 会不会被当成"缓存"清掉 |
|---|---|---|
| **IndexedDB**（`mini-todo` 库） | 主存储，所有任务和用时 | 不会。这是浏览器本地数据库，不是缓存，关页面/重启手机/断网都在 |
| **自动每日备份** | 每天第一次打开时自动存一份快照，保留最近 14 天 | 同上 |
| **导出备份** | 手动下载 JSON 文件到你手机/电脑 | 完全脱离应用，最保险 |
| localStorage | 仅存"音效开关"等设置，以及 IndexedDB 不可用时的兜底 | 同上 |

「清空全部」时也会自动留一份当日备份，误删了可以在空状态页面一键恢复。
