<div align="center">
  <img src="public/icons/mllomail-logo-192.png" width="120" height="120" alt="MlloMail cat paw logo" />
  <h1>MlloMail</h1>
  <p>A multi-user temporary email service powered by Cloudflare</p>

  [简体中文](README.zh-CN.md) · [Live Site](https://zclaude.com) · [API Docs](https://zclaude.com/en/docs)
</div>

## About

MlloMail is a multi-user temporary email system with role-based access, OAuth sign-in, webhooks, outbound mail, and a developer API. It runs on Cloudflare Pages, Workers, D1, and KV and is suitable for verification emails, automated testing, disposable inboxes, and controlled mailbox sharing.

This project is independently developed from [beilunyang/moemail](https://github.com/beilunyang/moemail) and continues to be distributed under the MIT License. MlloMail is not an official upstream release.

## Features

- Temporary or permanent disposable mailboxes
- Receive, read, delete, and share messages
- GitHub, Google, and credentials sign-in
- Emperor, Duke, Knight, and Civilian roles
- Webhook notifications for new messages
- Resend-powered outbound email with role limits
- API keys and OpenAPI endpoints
- Signed-in, in-app API documentation
- English, Simplified Chinese, Traditional Chinese, Japanese, and Korean
- Cloudflare Pages, Workers, D1, KV, and Email Routing deployment
- Agent-friendly `mllomail` CLI

## Stack

- Next.js 15, React 19, TypeScript
- NextAuth / Auth.js
- Drizzle ORM and Cloudflare D1
- Cloudflare Pages, Workers, KV, and Email Routing
- Tailwind CSS and Radix UI

## Quick Start

### Requirements

- Node.js 20+
- npm or pnpm
- A Cloudflare account
- Wrangler CLI

### Install

```bash
git clone https://github.com/zhangqinzhong/mllomail.git
cd mllomail
npm install
cp .env.example .env.local
```

Fill in `.env.local`, then start development:

```bash
npm run dev
```

The default local URL is `http://localhost:3000`.

## Environment Variables

### Authentication

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Auth.js session encryption secret |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

### Cloudflare

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `PROJECT_NAME` | Pages project name; `mllomail` is recommended |
| `DATABASE_NAME` | D1 database name |
| `DATABASE_ID` | D1 database ID |
| `KV_NAMESPACE_NAME` | KV namespace name |
| `KV_NAMESPACE_ID` | KV namespace ID |
| `CUSTOM_DOMAIN` | Custom domain, for example `zclaude.com` |
| `NEXT_PUBLIC_BASE_URL` | Full site URL, for example `https://zclaude.com` |

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## OAuth Setup

### GitHub

- Homepage URL: `https://YOUR_DOMAIN`
- Authorization callback URL: `https://YOUR_DOMAIN/api/auth/callback/github`

### Google

- Authorized JavaScript origin: `https://YOUR_DOMAIN`
- Authorized redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`
- OAuth app name: `MlloMail`
- App logo: `public/icons/mllomail-oauth-120.png`

Renaming the repository or the Cloudflare Pages project does not require a new OAuth client. The existing Client ID and Secret remain valid when the domain and callback URLs stay unchanged. After changing the brand from MoeMail to MlloMail, update the app name, logo, and homepage details in Google Auth Platform and complete brand verification again.

## Cloudflare Deployment

The repository includes `.github/workflows/deploy.yml`. Add the variables above under **Settings → Secrets and variables → Actions**, then run the **Deploy** workflow manually.

For migration from an existing deployment:

- Create a new Pages project named `mllomail` if you want clean project naming.
- Reuse the existing D1 database and KV namespace to preserve users, roles, mailboxes, and settings.
- A custom domain can belong to only one Pages project at a time. Verify the new `pages.dev` deployment before moving the domain.
- Reusing D1 preserves Google/GitHub account links and the Emperor role.
- Changing `AUTH_SECRET` invalidates existing sessions but does not delete users.

## Roles

| Role | Mailboxes | Webhook | API Key | Site Settings | Default outbound limit |
|---|---:|---:|---:|---:|---:|
| Emperor | Yes | Yes | Yes | Yes | Unlimited |
| Duke | Yes | Yes | Yes | No | 5/day |
| Knight | Yes | Yes | No | No | 2/day |
| Civilian | No | No | No | No | Disabled |

Duke and Knight outbound limits can be changed by the Emperor. Outbound email requires a configured Resend service.

## API

Duke and Emperor users can create API keys from Profile. Send the key in this header:

```http
X-API-Key: YOUR_API_KEY
```

After signing in, open **API Docs** from the top navigation or visit:

```text
https://YOUR_DOMAIN/en/docs
```

## CLI

The CLI source is located in `packages/cli`, and its command is `mllomail`:

```bash
cd packages/cli
npm install
npm run build
```

## Upstream and License

- Upstream: [beilunyang/moemail](https://github.com/beilunyang/moemail)
- MlloMail is an independently maintained derivative project.
- Licensed under the [MIT License](LICENSE); the original copyright notice is retained.
