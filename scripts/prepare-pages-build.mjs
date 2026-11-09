import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Vercel CLI is only a local Build Output API compiler here. Cloudflare owns
// hosting; a clean CI checkout must not need a linked Vercel project or login.
const directory = resolve('.vercel')
const projectFile = resolve(directory, 'project.json')
if (!existsSync(projectFile)) {
  mkdirSync(directory, { recursive: true })
  writeFileSync(projectFile, JSON.stringify({
    projectId: '_',
    orgId: '_',
    settings: { framework: 'nextjs', installCommand: 'true' },
  }) + '\n', { flag: 'wx' })
}
