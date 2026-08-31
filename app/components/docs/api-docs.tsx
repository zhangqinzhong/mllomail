"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  KeyRound,
  LockKeyhole,
  Terminal,
} from "lucide-react"
import type { Locale } from "@/i18n/config"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DocsCopy = {
  eyebrow: string
  title: string
  subtitle: string
  signedInOnly: string
  onThisPage: string
  overview: string
  authentication: string
  configuration: string
  mailboxes: string
  messages: string
  sending: string
  sharing: string
  errors: string
  baseUrl: string
  quickStart: string
  quickStartText: string
  createKey: string
  createKeyText: string
  addHeader: string
  addHeaderText: string
  makeRequest: string
  makeRequestText: string
  openProfile: string
  permissionGranted: string
  permissionDenied: string
  permissionText: string
  request: string
  response: string
  copy: string
  copied: string
  apiKeyWarning: string
  pathVariables: string
  endpointTitles: Record<string, string>
  endpointDescriptions: Record<string, string>
  errorDescription: string
  status: string
  meaning: string
  errorRows: Array<[string, string]>
}

const EN_COPY: DocsCopy = {
  eyebrow: "Developer API",
  title: "MlloMail API documentation",
  subtitle: "Create temporary mailboxes, read messages, send mail, and manage share links from your own applications.",
  signedInOnly: "Signed-in documentation",
  onThisPage: "On this page",
  overview: "Overview",
  authentication: "Authentication",
  configuration: "Configuration",
  mailboxes: "Mailboxes",
  messages: "Messages",
  sending: "Sending",
  sharing: "Share links",
  errors: "Errors",
  baseUrl: "Base URL",
  quickStart: "Quick start",
  quickStartText: "Every API request uses your current MlloMail domain and an API key.",
  createKey: "Create an API key",
  createKeyText: "Open Profile and create a named API key. The secret is displayed once and expires after one year.",
  addHeader: "Add the request header",
  addHeaderText: "Send the key in X-API-Key. Do not place it in a URL or client-side public code.",
  makeRequest: "Make a request",
  makeRequestText: "Start by reading the site configuration to obtain the available email domains.",
  openProfile: "Open Profile",
  permissionGranted: "Your role can create API keys",
  permissionDenied: "Your role cannot create API keys",
  permissionText: "API key management is available to Duke and Emperor roles. Other signed-in users may read this documentation but need a role upgrade before calling the API.",
  request: "Request",
  response: "Example response",
  copy: "Copy",
  copied: "Copied",
  apiKeyWarning: "Treat API keys like passwords. Disable or delete a key immediately if it is exposed.",
  pathVariables: "Replace values inside {braces} with IDs returned by the API. cursor is optional and is returned by list endpoints.",
  endpointTitles: {
    getConfig: "Get site configuration",
    createMailbox: "Create a temporary mailbox",
    listMailboxes: "List active mailboxes",
    deleteMailbox: "Delete a mailbox",
    listMessages: "List mailbox messages",
    getMessage: "Get one message",
    deleteMessage: "Delete one message",
    sendMessage: "Send an email",
    createEmailShare: "Create a mailbox share link",
    listEmailShares: "List mailbox share links",
    deleteEmailShare: "Delete a mailbox share link",
    createMessageShare: "Create a message share link",
    listMessageShares: "List message share links",
    deleteMessageShare: "Delete a message share link",
  },
  endpointDescriptions: {
    getConfig: "Returns available domains, the active-mailbox limit, and public site settings.",
    createMailbox: "name may be empty for a generated prefix. expiryTime must be 1 hour, 1 day, 7 days, or 0 for permanent.",
    listMailboxes: "Returns the API key owner's active mailboxes in pages of 20.",
    deleteMailbox: "Deletes a mailbox owned by the API key owner and its stored messages.",
    listMessages: "Returns received messages. Add type=sent to request sent messages when the role has sending permission.",
    getMessage: "Returns text, HTML, sender, recipient, type, and timestamps for one message.",
    deleteMessage: "Deletes one message from a mailbox owned by the API key owner.",
    sendMessage: "Sends from an owned mailbox through the configured Resend service. Daily role limits apply.",
    createEmailShare: "Creates a public link for a mailbox. expiresIn is milliseconds; use 0 for no expiration.",
    listEmailShares: "Returns all share links created for an owned mailbox.",
    deleteEmailShare: "Revokes one mailbox share link.",
    createMessageShare: "Creates a public link for one message. expiresIn is milliseconds; use 0 for no expiration.",
    listMessageShares: "Returns all share links created for one message.",
    deleteMessageShare: "Revokes one message share link.",
  },
  errorDescription: "Error responses use JSON with an error field. Common HTTP statuses are:",
  status: "Status",
  meaning: "Meaning",
  errorRows: [
    ["400", "Invalid parameters or request body"],
    ["401", "Missing, invalid, disabled, or expired API key"],
    ["403", "Role permission is missing or the resource belongs to another user"],
    ["404", "Mailbox, message, or share link was not found"],
    ["409", "The requested mailbox address already exists"],
    ["500", "Server or external mail-service error"],
  ],
}

const ZH_CN_COPY: DocsCopy = {
  ...EN_COPY,
  eyebrow: "开发者 API",
  title: "MlloMail API 文档",
  subtitle: "在你自己的程序中创建临时邮箱、读取邮件、发送邮件并管理分享链接。",
  signedInOnly: "登录后可查看",
  onThisPage: "本页目录",
  overview: "概览",
  authentication: "身份认证",
  configuration: "系统配置",
  mailboxes: "临时邮箱",
  messages: "邮件",
  sending: "发件",
  sharing: "分享链接",
  errors: "错误处理",
  baseUrl: "基础地址",
  quickStart: "快速开始",
  quickStartText: "所有 API 请求均使用当前 MlloMail 域名和 API Key。",
  createKey: "创建 API Key",
  createKeyText: "前往个人中心创建一个命名的 API Key。密钥只在创建时显示，有效期为一年。",
  addHeader: "添加请求头",
  addHeaderText: "通过 X-API-Key 请求头发送密钥，不要把密钥放在 URL 或公开的前端代码中。",
  makeRequest: "发起请求",
  makeRequestText: "建议先读取系统配置，获取当前允许使用的邮箱域名。",
  openProfile: "打开个人中心",
  permissionGranted: "你的角色可以创建 API Key",
  permissionDenied: "你的角色不能创建 API Key",
  permissionText: "API Key 管理仅向公爵和皇帝开放。其他登录用户可以阅读本文档，但升级角色后才能调用 API。",
  request: "请求示例",
  response: "响应示例",
  copy: "复制",
  copied: "已复制",
  apiKeyWarning: "请像保管密码一样保管 API Key。如发生泄露，请立即在个人中心停用或删除。",
  pathVariables: "请将路径中 {大括号} 包裹的内容替换为 API 返回的 ID。cursor 是可选分页游标，由列表接口返回。",
  endpointTitles: {
    getConfig: "获取系统配置",
    createMailbox: "创建临时邮箱",
    listMailboxes: "获取有效邮箱列表",
    deleteMailbox: "删除邮箱",
    listMessages: "获取邮箱邮件列表",
    getMessage: "获取单封邮件",
    deleteMessage: "删除单封邮件",
    sendMessage: "发送邮件",
    createEmailShare: "创建邮箱分享链接",
    listEmailShares: "获取邮箱分享链接",
    deleteEmailShare: "删除邮箱分享链接",
    createMessageShare: "创建邮件分享链接",
    listMessageShares: "获取邮件分享链接",
    deleteMessageShare: "删除邮件分享链接",
  },
  endpointDescriptions: {
    getConfig: "返回可用邮箱域名、有效邮箱数量限制和公开站点配置。",
    createMailbox: "name 留空时自动生成前缀；expiryTime 仅支持 1 小时、1 天、7 天或用 0 表示永久。",
    listMailboxes: "分页返回当前 API Key 所属用户的有效邮箱，每页 20 条。",
    deleteMailbox: "删除当前用户拥有的邮箱及其中保存的邮件。",
    listMessages: "默认返回收件记录；角色拥有发件权限时可添加 type=sent 查询已发送邮件。",
    getMessage: "返回单封邮件的文本、HTML、发件人、收件人、类型和时间。",
    deleteMessage: "删除当前用户邮箱中的一封邮件。",
    sendMessage: "通过站点配置的 Resend 服务发件，并受对应角色的每日额度限制。",
    createEmailShare: "创建邮箱公开分享链接。expiresIn 单位为毫秒，0 表示永久。",
    listEmailShares: "返回指定邮箱创建的全部分享链接。",
    deleteEmailShare: "撤销一个邮箱分享链接。",
    createMessageShare: "创建单封邮件的公开分享链接。expiresIn 单位为毫秒，0 表示永久。",
    listMessageShares: "返回指定邮件创建的全部分享链接。",
    deleteMessageShare: "撤销一个邮件分享链接。",
  },
  errorDescription: "错误响应为包含 error 字段的 JSON。常见 HTTP 状态码如下：",
  status: "状态码",
  meaning: "含义",
  errorRows: [
    ["400", "参数或请求体格式错误"],
    ["401", "API Key 缺失、无效、已停用或已过期"],
    ["403", "角色权限不足，或资源属于其他用户"],
    ["404", "邮箱、邮件或分享链接不存在"],
    ["409", "请求创建的邮箱地址已存在"],
    ["500", "服务器或外部发件服务错误"],
  ],
}

const ZH_TW_COPY: DocsCopy = {
  ...ZH_CN_COPY,
  eyebrow: "開發者 API",
  title: "MlloMail API 文件",
  subtitle: "在你自己的程式中建立臨時信箱、讀取郵件、傳送郵件並管理分享連結。",
  signedInOnly: "登入後可查看",
  onThisPage: "本頁目錄",
  overview: "概覽",
  authentication: "身分驗證",
  configuration: "系統設定",
  mailboxes: "臨時信箱",
  messages: "郵件",
  sending: "寄件",
  sharing: "分享連結",
  errors: "錯誤處理",
  quickStart: "快速開始",
  quickStartText: "所有 API 請求均使用目前 MlloMail 網域和 API Key。",
  createKey: "建立 API Key",
  createKeyText: "前往個人中心建立一個命名的 API Key。金鑰只在建立時顯示，有效期為一年。",
  addHeader: "加入請求標頭",
  addHeaderText: "透過 X-API-Key 請求標頭傳送金鑰，不要把金鑰放在 URL 或公開的前端程式碼中。",
  makeRequest: "發出請求",
  makeRequestText: "建議先讀取系統設定，取得目前允許使用的信箱網域。",
  openProfile: "開啟個人中心",
  permissionGranted: "你的角色可以建立 API Key",
  permissionDenied: "你的角色不能建立 API Key",
  permissionText: "API Key 管理僅向公爵和皇帝開放。其他登入使用者可以閱讀本文件，但升級角色後才能呼叫 API。",
  request: "請求範例",
  response: "回應範例",
  copy: "複製",
  copied: "已複製",
  apiKeyWarning: "請像保管密碼一樣保管 API Key。如發生洩漏，請立即在個人中心停用或刪除。",
  pathVariables: "請將路徑中 {大括號} 包裹的內容替換為 API 回傳的 ID。cursor 是選用分頁游標，由列表介面回傳。",
  errorDescription: "錯誤回應為包含 error 欄位的 JSON。常見 HTTP 狀態碼如下：",
  status: "狀態碼",
  meaning: "含義",
}

function getCopy(locale: Locale) {
  if (locale === "zh-CN") return ZH_CN_COPY
  if (locale === "zh-TW") return ZH_TW_COPY
  return EN_COPY
}

type Endpoint = {
  id: string
  method: "GET" | "POST" | "DELETE"
  path: string
  request: string
  response?: string
}

type EndpointSection = {
  id: string
  title: string
  endpoints: Endpoint[]
}

const methodColors: Record<Endpoint["method"], string> = {
  GET: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  POST: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  DELETE: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
}

function CodeBlock({ code, copy }: { code: string; copy: DocsCopy }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-950 text-slate-100 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 h-8 gap-1.5 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white"
        aria-label={copy.copy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{copied ? copy.copied : copy.copy}</span>
      </Button>
      <pre className="overflow-x-auto p-4 pr-24 text-xs leading-6 sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function EndpointCard({ endpoint, copy }: { endpoint: Endpoint; copy: DocsCopy }) {
  return (
    <article id={endpoint.id} className="scroll-mt-24 overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="border-b p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("rounded-md border px-2.5 py-1 font-mono text-xs font-bold", methodColors[endpoint.method])}>
            {endpoint.method}
          </span>
          <code className="break-all text-sm font-semibold sm:text-base">{endpoint.path}</code>
        </div>
        <h3 className="mt-4 text-xl font-semibold">{copy.endpointTitles[endpoint.id]}</h3>
        <p className="mt-2 leading-7 text-muted-foreground">{copy.endpointDescriptions[endpoint.id]}</p>
      </div>
      <div className={cn("grid gap-5 p-5 sm:p-6", endpoint.response && "xl:grid-cols-2")}>
        <div className="min-w-0 space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">{copy.request}</h4>
          <CodeBlock code={endpoint.request} copy={copy} />
        </div>
        {endpoint.response && (
          <div className="min-w-0 space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">{copy.response}</h4>
            <CodeBlock code={endpoint.response} copy={copy} />
          </div>
        )}
      </div>
    </article>
  )
}

export function ApiDocs({
  baseUrl,
  canCreateApiKey,
  locale,
}: {
  baseUrl: string
  canCreateApiKey: boolean
  locale: Locale
}) {
  const copy = getCopy(locale)

  const sections: EndpointSection[] = [
    {
      id: "configuration",
      title: copy.configuration,
      endpoints: [
        {
          id: "getConfig",
          method: "GET",
          path: "/api/config",
          request: `curl ${baseUrl}/api/config \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{
  "defaultRole": "civilian",
  "emailDomains": "example.com",
  "adminContact": "admin@example.com",
  "maxEmails": "30"
}`,
        },
      ],
    },
    {
      id: "mailboxes",
      title: copy.mailboxes,
      endpoints: [
        {
          id: "createMailbox",
          method: "POST",
          path: "/api/emails/generate",
          request: `curl -X POST ${baseUrl}/api/emails/generate \\\n+  -H "X-API-Key: YOUR_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{
    "name": "test",
    "expiryTime": 3600000,
    "domain": "example.com"
  }'`,
          response: `{
  "id": "EMAIL_ID",
  "email": "test@example.com"
}`,
        },
        {
          id: "listMailboxes",
          method: "GET",
          path: "/api/emails?cursor=CURSOR",
          request: `curl "${baseUrl}/api/emails?cursor=CURSOR" \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{
  "emails": [
    {
      "id": "EMAIL_ID",
      "address": "test@example.com",
      "createdAt": "2026-08-31T08:00:00.000Z",
      "expiresAt": "2026-08-31T09:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "total": 1
}`,
        },
        {
          id: "deleteMailbox",
          method: "DELETE",
          path: "/api/emails/{emailId}",
          request: `curl -X DELETE ${baseUrl}/api/emails/{emailId} \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{ "success": true }`,
        },
      ],
    },
    {
      id: "messages",
      title: copy.messages,
      endpoints: [
        {
          id: "listMessages",
          method: "GET",
          path: "/api/emails/{emailId}?cursor=CURSOR&type=sent",
          request: `curl "${baseUrl}/api/emails/{emailId}?cursor=CURSOR" \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{
  "messages": [
    {
      "id": "MESSAGE_ID",
      "from_address": "sender@example.com",
      "to_address": "test@example.com",
      "subject": "Hello",
      "received_at": 1788163200000
    }
  ],
  "nextCursor": null,
  "total": 1
}`,
        },
        {
          id: "getMessage",
          method: "GET",
          path: "/api/emails/{emailId}/{messageId}",
          request: `curl ${baseUrl}/api/emails/{emailId}/{messageId} \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{
  "message": {
    "id": "MESSAGE_ID",
    "from_address": "sender@example.com",
    "to_address": "test@example.com",
    "subject": "Hello",
    "content": "Plain text",
    "html": "<p>Hello</p>",
    "type": "received"
  }
}`,
        },
        {
          id: "deleteMessage",
          method: "DELETE",
          path: "/api/emails/{emailId}/{messageId}",
          request: `curl -X DELETE ${baseUrl}/api/emails/{emailId}/{messageId} \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{ "success": true }`,
        },
      ],
    },
    {
      id: "sending",
      title: copy.sending,
      endpoints: [
        {
          id: "sendMessage",
          method: "POST",
          path: "/api/emails/{emailId}/send",
          request: `curl -X POST ${baseUrl}/api/emails/{emailId}/send \\\n+  -H "X-API-Key: YOUR_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{
    "to": "recipient@example.com",
    "subject": "Hello",
    "content": "<p>Sent from MlloMail</p>"
  }'`,
          response: `{
  "success": true,
  "message": "邮件发送成功",
  "remainingEmails": 4
}`,
        },
      ],
    },
    {
      id: "sharing",
      title: copy.sharing,
      endpoints: [
        {
          id: "createEmailShare",
          method: "POST",
          path: "/api/emails/{emailId}/share",
          request: `curl -X POST ${baseUrl}/api/emails/{emailId}/share \\\n+  -H "X-API-Key: YOUR_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{ "expiresIn": 86400000 }'`,
          response: `{
  "id": "SHARE_ID",
  "emailId": "EMAIL_ID",
  "token": "SHARE_TOKEN",
  "expiresAt": "2026-09-01T08:00:00.000Z"
}`,
        },
        {
          id: "listEmailShares",
          method: "GET",
          path: "/api/emails/{emailId}/share",
          request: `curl ${baseUrl}/api/emails/{emailId}/share \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
        },
        {
          id: "deleteEmailShare",
          method: "DELETE",
          path: "/api/emails/{emailId}/share/{shareId}",
          request: `curl -X DELETE ${baseUrl}/api/emails/{emailId}/share/{shareId} \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{ "success": true }`,
        },
        {
          id: "createMessageShare",
          method: "POST",
          path: "/api/emails/{emailId}/messages/{messageId}/share",
          request: `curl -X POST ${baseUrl}/api/emails/{emailId}/messages/{messageId}/share \\\n+  -H "X-API-Key: YOUR_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{ "expiresIn": 0 }'`,
        },
        {
          id: "listMessageShares",
          method: "GET",
          path: "/api/emails/{emailId}/messages/{messageId}/share",
          request: `curl ${baseUrl}/api/emails/{emailId}/messages/{messageId}/share \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
        },
        {
          id: "deleteMessageShare",
          method: "DELETE",
          path: "/api/emails/{emailId}/messages/{messageId}/share/{shareId}",
          request: `curl -X DELETE ${baseUrl}/api/emails/{emailId}/messages/{messageId}/share/{shareId} \\\n+  -H "X-API-Key: YOUR_API_KEY"`,
          response: `{ "success": true }`,
        },
      ],
    },
  ]

  const navigation = [
    ["overview", copy.overview],
    ["authentication", copy.authentication],
    ...sections.map((section) => [section.id, section.title]),
    ["errors", copy.errors],
  ]

  return (
    <main className="container mx-auto max-w-[1500px] px-4 pb-16 pt-24 lg:px-8">
      <section id="overview" className="scroll-mt-24 overflow-hidden rounded-3xl border bg-background shadow-sm">
        <div className="relative p-7 sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_45%)]" />
          <div className="relative max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <BookOpen className="h-4 w-4" />
                {copy.eyebrow}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
                <LockKeyhole className="h-3.5 w-3.5" />
                {copy.signedInOnly}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">{copy.subtitle}</p>
            <div className="mt-7">
              <p className="mb-2 text-sm font-semibold text-muted-foreground">{copy.baseUrl}</p>
              <CodeBlock code={baseUrl} copy={copy} />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:block">
          <nav className="sticky top-24 rounded-2xl border bg-background p-4 shadow-sm" aria-label={copy.onThisPage}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{copy.onThisPage}</p>
            <div className="flex gap-1 overflow-x-auto lg:block">
              {navigation.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex flex-shrink-0 items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {label}
                  <ChevronRight className="ml-4 hidden h-3.5 w-3.5 lg:block" />
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 space-y-12">
          <section id="authentication" className="scroll-mt-24 space-y-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.quickStart}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{copy.quickStartText}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["1", copy.createKey, copy.createKeyText, KeyRound],
                ["2", copy.addHeader, copy.addHeaderText, LockKeyhole],
                ["3", copy.makeRequest, copy.makeRequestText, Terminal],
              ].map(([number, title, description, Icon]) => {
                const StepIcon = Icon as typeof KeyRound
                return (
                  <article key={number as string} className="rounded-2xl border bg-background p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {number as string}
                      </span>
                      <StepIcon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 font-semibold">{title as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description as string}</p>
                  </article>
                )
              })}
            </div>

            <div className={cn(
              "rounded-2xl border p-5 sm:flex sm:items-center sm:justify-between sm:gap-5",
              canCreateApiKey
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
            )}>
              <div>
                <p className="font-semibold">{canCreateApiKey ? copy.permissionGranted : copy.permissionDenied}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.permissionText}</p>
              </div>
              <Button asChild className="mt-4 flex-shrink-0 sm:mt-0">
                <Link href={`/${locale}/profile`}>{copy.openProfile}</Link>
              </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">X-API-Key</h3>
                <CodeBlock code={'X-API-Key: YOUR_API_KEY'} copy={copy} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">curl</h3>
                <CodeBlock
                  code={`curl ${baseUrl}/api/config \\\n+  -H "X-API-Key: YOUR_API_KEY"`}
                  copy={copy}
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>{copy.apiKeyWarning}</p>
              </div>
            </div>

            <p className="rounded-xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">{copy.pathVariables}</p>
          </section>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 space-y-5">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{section.title}</h2>
              <div className="space-y-5">
                {section.endpoints.map((endpoint) => (
                  <EndpointCard key={endpoint.id} endpoint={endpoint} copy={copy} />
                ))}
              </div>
            </section>
          ))}

          <section id="errors" className="scroll-mt-24 space-y-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.errors}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{copy.errorDescription}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{copy.status}</th>
                    <th className="px-5 py-3 font-semibold">{copy.meaning}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {copy.errorRows.map(([status, meaning]) => (
                    <tr key={status}>
                      <td className="px-5 py-3 font-mono font-semibold">{status}</td>
                      <td className="px-5 py-3 text-muted-foreground">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
