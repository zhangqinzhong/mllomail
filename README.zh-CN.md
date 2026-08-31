<div align="center">
  <img src="public/icons/mllomail-logo-192.png" width="120" height="120" alt="MlloMail 猫爪图标" />
  <h1>MlloMail</h1>
  <p>基于 Cloudflare 的多用户临时邮箱服务</p>

  [English](README.md) · [在线站点](https://zclaude.com) · [API 文档](https://zclaude.com/zh-CN/docs)
</div>

## 项目简介

MlloMail 是一个支持多用户、角色权限、OAuth 登录和开发者 API 的临时邮箱系统。项目运行在 Cloudflare Pages、Workers、D1 和 KV 上，可用于注册验证、自动化测试、临时收件和邮件分享。

本项目基于 [beilunyang/moemail](https://github.com/beilunyang/moemail) 二次开发，并在 MIT 协议下继续发布。MlloMail 是独立维护的衍生项目，并非上游项目的官方版本。

## 主要功能

- 创建限时或永久临时邮箱
- 接收、查看、删除和分享邮件
- GitHub、Google 及用户名密码登录
- 皇帝、公爵、骑士、平民四级角色权限
- Webhook 新邮件通知
- Resend 主动发件及角色额度管理
- API Key 与 OpenAPI 接口
- 登录后可查看的站内 API 文档
- 支持英语、简体中文、繁体中文、日语和韩语
- Cloudflare Pages、Workers、D1、KV 一体化部署
- 面向自动化任务的 `mllomail` CLI

## 技术栈

- Next.js 15、React 19、TypeScript
- NextAuth / Auth.js
- Drizzle ORM、Cloudflare D1
- Cloudflare Pages、Workers、KV、Email Routing
- Tailwind CSS、Radix UI

## 快速开始

### 环境要求

- Node.js 20+
- npm 或 pnpm
- Cloudflare 账号
- Wrangler CLI

### 安装

```bash
git clone https://github.com/zhangqinzhong/mllomail.git
cd mllomail
npm install
cp .env.example .env.local
```

填写 `.env.local` 后启动：

```bash
npm run dev
```

默认访问地址为 `http://localhost:3000`。

## 环境变量

### 身份认证

| 变量 | 用途 |
|---|---|
| `AUTH_SECRET` | Auth.js 会话加密密钥 |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

### Cloudflare

| 变量 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `PROJECT_NAME` | Pages 项目名，建议 `mllomail` |
| `DATABASE_NAME` | D1 数据库名称 |
| `DATABASE_ID` | D1 数据库 ID |
| `KV_NAMESPACE_NAME` | KV 命名空间名称 |
| `KV_NAMESPACE_ID` | KV 命名空间 ID |
| `CUSTOM_DOMAIN` | 自定义域名，例如 `zclaude.com` |
| `NEXT_PUBLIC_BASE_URL` | 完整站点地址，例如 `https://zclaude.com` |

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

## OAuth 配置

### GitHub

- Homepage URL：`https://YOUR_DOMAIN`
- Authorization callback URL：`https://YOUR_DOMAIN/api/auth/callback/github`

### Google

- 已获授权的 JavaScript 来源：`https://YOUR_DOMAIN`
- 已获授权的重定向 URI：`https://YOUR_DOMAIN/api/auth/callback/google`
- OAuth 应用名称应与首页保持一致：`MlloMail`
- 应用徽标可使用：`public/icons/mllomail-oauth-120.png`

仅修改仓库名或 Cloudflare Pages 项目名时，不需要重新创建 OAuth Client。继续使用相同域名和回调地址即可沿用原 Client ID 与 Secret。品牌名称从 MoeMail 改为 MlloMail 后，需要在 Google Auth Platform 的“品牌”页面同步修改应用名称、徽标和首页信息；Google 可能要求重新进行品牌验证。

## Cloudflare 部署

项目提供 `.github/workflows/deploy.yml`。在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中配置上述变量，然后手动运行 **Deploy** 工作流。

如从旧部署迁移：

- 可以新建名为 `mllomail` 的 Pages 项目。
- 可以继续绑定原来的 D1 和 KV，保留用户、邮箱、角色和站点配置。
- 自定义域名同一时间只能绑定到一个 Pages 项目；请先验证新的 `pages.dev` 地址，再迁移域名。
- 使用相同 D1 时，Google/GitHub 账号关联和皇帝权限都会保留。
- 更换 `AUTH_SECRET` 会使现有登录会话失效，但不会删除用户数据。

## 角色权限

| 角色 | 临时邮箱 | Webhook | API Key | 系统设置 | 默认主动发件额度 |
|---|---:|---:|---:|---:|---:|
| 皇帝 | ✓ | ✓ | ✓ | ✓ | 不限量 |
| 公爵 | ✓ | ✓ | ✓ | — | 5 封/天 |
| 骑士 | ✓ | ✓ | — | — | 2 封/天 |
| 平民 | — | — | — | — | 禁止 |

公爵和骑士的发件额度可由皇帝调整。主动发件依赖站点配置的 Resend 服务。

## API

公爵和皇帝可以在个人中心创建 API Key。请求时添加：

```http
X-API-Key: YOUR_API_KEY
```

登录站点后，从顶部导航进入 **API 文档**，或访问：

```text
https://YOUR_DOMAIN/zh-CN/docs
```

## CLI

CLI 源码位于 `packages/cli`，命令名称为 `mllomail`：

```bash
cd packages/cli
npm install
npm run build
```

## 上游与许可证

- 上游项目：[beilunyang/moemail](https://github.com/beilunyang/moemail)
- 本项目为独立二开版本，修改内容由 MlloMail 项目维护。
- 项目采用 [MIT License](LICENSE)。原项目版权声明已保留。
