# UniPath AI — Shareable API Version

这是给别人直接用的版本。

## 最终用户怎么用？

你部署完成以后，只需要把网址发给别人，例如：

```text
https://unipath-ai.vercel.app
```

别人打开网址后：

1. 输入自己的申请简介；
2. 点击 **Analyze with AI**；
3. AI 自动整理 GPA / SAT / AP / 活动 / 奖项 / 专业方向；
4. UniPath 自动生成学校预测；
5. 用户可以继续问 AI Counselor。

**他们不需要 API Key，也不需要下载任何文件。**

---

# 你作为网站拥有者只需要配置一次

这个版本前端永远只调用：

```text
/api/unipath
```

不需要理解 profile / predict / counselor 三个 API。

服务器内部会自动根据 action 完成：

```text
Analyze
  → OpenAI 解析 Profile
  → UniPath Prediction Engine
  → 一次返回 Profile + 学校结果

Predict
  → UniPath 本地算法

Counsel
  → OpenAI 根据已有 Profile + UniPath 结果回答
```

---

# 最简单的公开部署方式：Vercel

## 第一次

### 1. 把项目上传到 GitHub

整个 `unipath-ai-shareable` 文件夹上传到一个 GitHub repository。

### 2. 在 Vercel 里 Import Project

选择刚刚的 GitHub repository。

Vercel 会自动识别 Next.js。

### 3. 只配置一个环境变量

在 Vercel 项目的 Environment Variables 添加：

```text
OPENAI_API_KEY
```

Value 填你的 OpenAI API Key。

不要加 `NEXT_PUBLIC_`。

### 4. 点击 Deploy

部署完成后会得到类似：

```text
https://unipath-ai-xxxx.vercel.app
```

这就是你可以直接发给其他人的网址。

---

# API Key 到底谁需要？

只有你需要。

普通用户：

```text
❌ 不需要 OpenAI 账号
❌ 不需要 API Key
❌ 不需要安装 Node.js
❌ 不需要运行 npm
✅ 打开网址直接使用
```

网站所有者：

```text
✅ 在 Vercel 后台配置一次 OPENAI_API_KEY
```

API Key 保存在服务器端，不会放进浏览器 JavaScript。

---

# 成本是谁付？

因为网站使用你的 OpenAI API Key：

```text
别人使用 UniPath
        ↓
你的服务器
        ↓
你的 OpenAI API project
```

因此 API 使用费用由你的 OpenAI API 项目承担。

正式公开测试前建议继续加入：

- 登录；
- 每人每日调用次数；
- IP / user rate limit；
- API 成本上限；
- usage logging；
- bot protection。

---

# 为什么现在只有一个 API？

旧版：

```text
/api/profile
/api/predict
/api/counselor
```

新版：

```text
/api/unipath
```

前端只需要：

```js
fetch("/api/unipath", ...)
```

其中：

```json
{"action":"analyze"}
```

会完成：

```text
AI profile extraction
+
admission predictions
```

一次点击就够。

---

# OpenAI 调用

OpenAI API Key 只由服务器读取：

```js
process.env.OPENAI_API_KEY
```

AI 使用 OpenAI Responses API。

Profile extraction 使用 Structured Outputs，因此 AI 不是随意写一段文字，而是必须生成符合 UniPath ApplicantProfile schema 的结构化数据。

Counselor 不负责重新计算录取率。它只解释 deterministic UniPath engine 已经给出的区间。

---

# 本地测试（可选）

只有你作为开发者需要时才做。

```bash
npm install
```

创建：

```text
.env.local
```

填：

```text
OPENAI_API_KEY=你的key
```

然后：

```bash
npm run dev
```

浏览器：

```text
http://localhost:3000
```

如果你直接部署 Vercel，可以完全不让最终用户接触这部分。
