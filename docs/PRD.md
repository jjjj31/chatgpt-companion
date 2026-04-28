# PRD: ChatGPT Companion Extension v0.1

## 1. 项目定位

做一个只适配 `chatgpt.com` 的 Chrome 插件，核心功能只保留两个：

1. **当前对话时间线**：在 ChatGPT 页面右侧显示消息节点，点击节点跳转到对应消息。
2. **公式复制**：点击 ChatGPT 页面里的公式，复制 LaTeX。

项目目标是学习 Voyager 的架构和交互思路，但不直接复制 Gemini Voyager 源码。

## 2. 功能范围

### v0.1 必做

| 模块 | 功能 |
| --- | --- |
| 时间线 | 当前对话右侧消息节点 |
| 时间线 | 点击节点滚动到对应消息 |
| 时间线 | 当前可见消息高亮 |
| 时间线 | 新消息生成后自动更新 |
| 公式复制 | 点击公式复制 LaTeX |
| 工程 | TypeScript + Vite + Manifest V3 |

### v0.1 不做

- 不做 Prompt 管理器。
- 不做 Prompt 小浮窗。
- 不做 Prompt 的保存、搜索、复制、插入、导入导出。
- 不做多平台兼容。
- 不做云同步。
- 不做账号登录。
- 不做批量抓取 ChatGPT 历史对话。
- 不做对话全文导出。
- 不直接复制 Voyager 源码。

## 3. 技术栈

```txt
Chrome Extension Manifest V3
TypeScript
Vite
React
content script
MutationObserver
IntersectionObserver
Clipboard API
```

目录建议：

```txt
chatgpt-companion/
├─ manifest.json
├─ package.json
├─ src/
│  ├─ content/
│  │  ├─ index.tsx
│  │  ├─ selectors.ts
│  │  ├─ timeline/
│  │  │  ├─ TimelineManager.ts
│  │  │  └─ timeline.css
│  │  └─ formula/
│  │     └─ FormulaCopyService.ts
│  └─ shared/
│     ├─ storage.ts
│     └─ types.ts
└─ docs/
   └─ PRD.md
```

## 4. 页面适配原则

只匹配：

```json
"matches": ["https://chatgpt.com/*"]
```

DOM 适配要求：

- 不依赖随机 class。
- 优先使用语义属性：`article`、`[data-testid]`、`role`。
- 所有选择器集中放在 `src/content/selectors.ts`。
- ChatGPT 页面变化时，只改适配层，不改业务逻辑。

## 5. 时间线 Timeline

### 目标

在 ChatGPT 当前对话右侧生成垂直时间线。每个节点对应一条用户或助手消息。

### 交互

- 页面右侧固定一条细长时间线。
- 用户消息和助手消息用不同形状或标记区分。
- 鼠标悬停节点显示消息预览。
- 点击节点，页面滚动到对应消息。
- 当前屏幕附近的消息节点高亮。
- 新消息生成后，时间线自动更新。

### 数据来源

从当前页面 DOM 中扫描消息元素：

```ts
const messageCandidates = document.querySelectorAll("article");
```

每个消息生成：

```ts
type TimelineItem = {
  id: string;
  role: "user" | "assistant" | "unknown";
  elementPath?: string;
  preview: string;
  index: number;
};
```

### 技术要求

- 使用 `MutationObserver` 监听新消息。
- 使用 `IntersectionObserver` 判断当前可见消息。
- 使用 `scrollIntoView({ behavior: "smooth", block: "start" })` 跳转。
- 节点数量过多时仍保持流畅。

### 验收标准

- 打开任意 ChatGPT 长对话，右侧出现时间线。
- 点击节点能跳到对应消息。
- 用户继续提问后，时间线自动增加新节点。
- 页面刷新后不报错。
- ChatGPT 新建空对话时不显示错误 UI。

## 6. 公式复制 Formula Copy

### 目标

用户点击 ChatGPT 页面中的数学公式时，复制 LaTeX。

### v0.1 支持格式

```ts
type FormulaCopyFormat = "latex-with-dollar" | "latex-raw";
```

默认先实现 `latex-raw`，后续可增加设置切换。

### 检测对象

优先检测：

```txt
.katex
.katex-display
math
annotation[encoding="application/x-tex"]
```

### 复制逻辑

- 优先从 `annotation[encoding="application/x-tex"]` 获取源码。
- 如果没有源码，尝试从元素属性或文本回退。
- 复制成功后显示小 toast：`Formula copied`。
- 复制失败后显示：`Copy failed`。

### 验收标准

- ChatGPT 回答中出现公式时，点击公式能复制。
- 行内公式和块级公式都能复制。
- 没有公式的地方点击不触发。
- 复制失败不会导致页面报错。

## 7. 隐私与安全要求

- 不上传用户对话。
- 不读取非 `chatgpt.com` 页面。
- 不批量抓取历史对话。
- 不执行页面内容中的任何脚本。

## 8. 开发阶段

### Phase 1: 项目骨架

- Vite + TypeScript + MV3 能跑。
- content script 能注入 `chatgpt.com`。
- 页面右下角能显示一个测试按钮。

### Phase 2: 时间线

- 扫描当前页面消息。
- 右侧生成节点。
- 点击跳转。
- 新消息自动刷新。
- 当前可见消息节点高亮。

### Phase 3: 公式复制

- 点击公式复制 LaTeX。
- 显示复制成功或失败提示。

### Phase 4: 整理开源作品集

- 完善 README。
- 加截图。
- 加隐私说明。
- 加 roadmap。
- 发布 GitHub 仓库。

## 9. 当前版本一句话总结

**v0.1 只做 ChatGPT 当前对话时间线和公式复制，不做 Prompt 管理器。**
