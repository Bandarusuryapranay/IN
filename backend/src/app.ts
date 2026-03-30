import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import path from 'path'
import { logger } from './lib/logger'
import { authLimiter, apiLimiter } from './middlewares/rateLimiter.middleware'
import { errorHandler } from './middlewares/error.middleware'

import { authRouter }       from './modules/auth/auth.routes'
import { adminRouter }      from './modules/admin/admin.routes'
import { campaignRouter }   from './modules/campaign/campaign.routes'
import { questionRouter }   from './modules/question/question.routes'
import { recruiterRouter }  from './modules/recruiter/recruiter.routes'
import { candidateRouter }  from './modules/candidate/candidate.routes'
import { attemptRouter }    from './modules/attempt/attempt.routes'
import { proctoringRouter } from './modules/proctoring/proctoring.routes'
import { scorecardRouter }  from './modules/scorecard/scorecard.routes'
const app = express()

// 1. Trust proxy for rate limiting behind Render/Vercel
app.set('trust proxy', 1)

// 2. Logging for debugging routes
app.use((req, _res, next) => {
  logger.info(`Incoming [${req.method}] ${req.url} from ${req.headers.origin || 'unknown origin'}`)
  next()
})

// 3. Robust CORS
const corsOrigins = (process.env.CLIENT_URL || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean)
app.use(cors({ 
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
      callback(null, true)
    } else {
      logger.warn(`CORS blocked for origin: ${origin}`)
      callback(null, true) // Temporarily allow to debug 404s
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(compression()) // Compress responses
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
app.use(morgan(logFormat))

// Static files (resumes, proctoring snapshots, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }))

app.use('/api/auth',       authLimiter, authRouter)
app.use('/api',            apiLimiter)
app.use('/api/admin',      adminRouter)
app.use('/api/campaigns',  campaignRouter)
app.use('/api/questions',  questionRouter)
app.use('/api/recruiter',  recruiterRouter)
app.use('/api/candidate',  candidateRouter)
app.use('/api/attempt',    attemptRouter)
app.use('/api/proctoring', proctoringRouter)
app.use('/api/scorecard',  scorecardRouter)

app.use(errorHandler)

export default app
