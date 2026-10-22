import { getToken } from 'next-auth/jwt'

// First-page received-mail reads avoid the framework runtime.
// API keys, sent messages and pagination retain the original API.
export function pollMailbox(request) {
  const url = new URL(request.url)
  if (request.method !== 'GET' || request.headers.has('X-API-Key')) return null
  if ([...url.searchParams.keys()].some(key => key !== 'summary')) return null
  const id = /^\/api\/emails\/([a-zA-Z0-9-]+)$/.exec(url.pathname)?.[1] ?? null
  if (['send-permission', 'generate'].includes(id)) return null
  return id
}

export async function serveMailPoll(request, env, decodeToken = getToken) {
  const summaryOnly = new URL(request.url).searchParams.get('summary') === '1'
  const id = pollMailbox(request)
  if (!id) return null
  // Match Auth.js cookie authentication; do not widen access to Bearer tokens.
  const token = await decodeToken({
    req: {headers: new Headers({cookie: request.headers.get('cookie') ?? ''})},
    secret: env.AUTH_SECRET,
    secureCookie: new URL(request.url).protocol === 'https:',
  })
  const respond = (data, status = 200) => Response.json(data, {
    status, headers: {'Cache-Control':'private, no-store', 'X-MlloMail-Render':'mail-summary'},
  })
  if (typeof token?.id !== 'string' || !token.id) return respond({error:'未授权'},401)
  const db = env.DB
  const role = await db.prepare('SELECT r.name FROM user_role ur JOIN role r ON r.id = ur.role_id WHERE ur.user_id = ?').bind(token.id).all()
  // Preserve existing first-login role initialization in the original handler.
  if (!role.results.length) return null
  if (!role.results.some(row => ['emperor','duke','knight'].includes(row.name))) return respond({error:'权限不足'},403)
  const owner = await db.prepare('SELECT id FROM email WHERE id = ? AND userId = ?').bind(id,token.id).first()
  if (!owner) return respond({error:'无权限查看'},403)
  const [count, rows] = await db.batch([
    db.prepare("SELECT count(*) AS total FROM message WHERE emailId = ? AND (type != 'sent' OR type IS NULL)").bind(id),
    db.prepare(`SELECT id, from_address, to_address, subject, sent_at, received_at${summaryOnly ? '' : ', content, html'} FROM message WHERE emailId = ? AND (type != 'sent' OR type IS NULL) ORDER BY received_at DESC, id DESC LIMIT 21`).bind(id),
  ])
  const messages = rows.results.slice(0,20)
  const last = messages[19]
  return respond({messages, total:Number(count.results[0].total), nextCursor:rows.results.length > 20 ? btoa(JSON.stringify({timestamp:last.received_at,id:last.id})) : null})
}
