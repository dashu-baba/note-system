import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import cron from 'node-cron'
import auth from './routes/auth.js'
import notes from './routes/notes.js'
import workspaces from './routes/workspaces.js'
import { bodyLimit } from 'hono/body-limit'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { requireAuth } from './lib/auth-middleware.js'
import { deleteOlderThan } from './services/history.service.js'

const app = new Hono()

app.use(logger())
app.use(secureHeaders())
app.use(cors())
app.use(csrf())
app.use(bodyLimit({
  maxSize: 50 * 1024, // 50kb
    onError: (c) => {
      return c.text('overflow :(', 413)
    },
}))

app.use('/api/v1/*', async (c, next) => {
  if (c.req.path === '/api/v1/login') {
    return next()
  }
  return requireAuth(c, next)
})

app.route('/api/v1', auth)
app.route('/api/v1/public', notes)
app.route('/api/v1/workspaces', workspaces)

cron.schedule('0 0 * * *', async () => {
  const deleted = await deleteOlderThan(7)
  console.log(`Deleted ${deleted} history record(s) older than 7 days`)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
