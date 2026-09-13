import express from 'express'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import XLSX from 'xlsx'

const app = express()
const port = 3001
const dataDir = join(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

const dbPath = join(dataDir, 'sofun.db')
const db = new Database(dbPath)
const sessions = new Map()

const schema = `
CREATE TABLE IF NOT EXISTS personnel (
  NRIC TEXT PRIMARY KEY,
  rank TEXT NOT NULL,
  name TEXT NOT NULL,
  platoon TEXT NOT NULL,
  DOE TEXT NOT NULL,
  ORD TEXT,
  turnY2 TEXT
);

CREATE TABLE IF NOT EXISTS medical (
  NRIC TEXT NOT NULL,
  medical_status TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  IPPT TEXT,
  VOC TEXT,
  Trainfire TEXT,
  remarks TEXT,
  PRIMARY KEY (NRIC, start_date)
);

CREATE TABLE IF NOT EXISTS cs (
  NRIC TEXT NOT NULL,
  date_of_conduct TEXT NOT NULL,
  score TEXT NOT NULL,
  PRIMARY KEY (NRIC, date_of_conduct)
);

CREATE TABLE IF NOT EXISTS atp (
  NRIC TEXT NOT NULL,
  date_of_conduct TEXT NOT NULL,
  score TEXT NOT NULL,
  PRIMARY KEY (NRIC, date_of_conduct)
);

CREATE TABLE IF NOT EXISTS ippt (
  NRIC TEXT NOT NULL,
  date_of_conduct TEXT NOT NULL,
  pushup INTEGER,
  pushup_score INTEGER,
  situp INTEGER,
  situp_score INTEGER,
  run_2400 TEXT,
  run_score INTEGER,
  overall INTEGER,
  grade TEXT,
  PRIMARY KEY (NRIC, date_of_conduct)
);

CREATE TABLE IF NOT EXISTS voc (
  NRIC TEXT NOT NULL,
  type_of_VOC TEXT NOT NULL,
  date_of_conduct TEXT NOT NULL,
  PRIMARY KEY (NRIC, type_of_VOC, date_of_conduct)
);

CREATE TABLE IF NOT EXISTS conducts (
  date_of_conduct TEXT NOT NULL,
  conduct TEXT NOT NULL,
  PRIMARY KEY (date_of_conduct, conduct)
);

CREATE TABLE IF NOT EXISTS login (
  email TEXT PRIMARY KEY,
  password TEXT NOT NULL
);
`

db.exec(schema)

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = String(storedPassword).split(':')
  if (!salt || !storedHash) return false

  const passwordHash = scryptSync(password, salt, 64)
  const expectedHash = Buffer.from(storedHash, 'hex')
  return expectedHash.length === passwordHash.length && timingSafeEqual(passwordHash, expectedHash)
}

function seedLoginFromEnvironment() {
  const email = String(process.env.LOGIN_EMAIL ?? '').trim().toLowerCase()
  const password = String(process.env.LOGIN_PASSWORD ?? '')
  if (!email || !password) return

  const existingLogin = db.prepare('SELECT email FROM login WHERE email = ?').get(email)
  if (!existingLogin) {
    db.prepare('INSERT INTO login (email, password) VALUES (?, ?)').run(email, hashPassword(password))
    console.log(`Seeded login credentials for ${email}`)
  }
}

seedLoginFromEnvironment()

app.use(express.json())

function getSessionToken(req) {
  const cookies = String(req.headers.cookie ?? '')
    .split(';')
    .map((cookie) => cookie.trim().split('='))

  return cookies.find(([name]) => name === 'sofun_session')?.[1]
}

function requireAuth(req, res, next) {
  const token = getSessionToken(req)
  if (!token || !sessions.has(token)) {
    res.status(401).json({ ok: false, error: 'Authentication required.' })
    return
  }

  next()
}

app.post('/api/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const account = db.prepare('SELECT email, password FROM login WHERE email = ?').get(email)

  if (!account || !verifyPassword(password, account.password)) {
    res.status(401).json({ ok: false, error: 'Incorrect email or password.' })
    return
  }

  const token = randomUUID()
  sessions.set(token, { email: account.email })
  res.setHeader('Set-Cookie', `sofun_session=${token}; HttpOnly; SameSite=Lax; Path=/`)
  res.json({ ok: true, email: account.email })
})

app.get('/api/session', (req, res) => {
  const token = getSessionToken(req)
  const session = token ? sessions.get(token) : null
  res.json({ authenticated: Boolean(session), email: session?.email ?? null })
})

app.post('/api/logout', (req, res) => {
  const token = getSessionToken(req)
  if (token) sessions.delete(token)
  res.setHeader('Set-Cookie', 'sofun_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
  res.json({ ok: true })
})

app.use('/api', requireAuth)

const tableConfig = {
  personnel: {
    columns: ['NRIC', 'rank', 'name', 'platoon', 'DOE', 'ORD', 'turnY2'],
    orderBy: 'platoon, rank, name',
  },
  medical: {
    columns: ['NRIC', 'medical_status', 'start_date', 'end_date', 'IPPT', 'VOC', 'Trainfire', 'remarks'],
    orderBy: 'start_date DESC, NRIC',
  },
  cs: {
    columns: ['NRIC', 'date_of_conduct', 'score'],
    orderBy: 'date_of_conduct DESC, NRIC',
  },
  atp: {
    columns: ['NRIC', 'date_of_conduct', 'score'],
    orderBy: 'date_of_conduct DESC, NRIC',
  },
  ippt: {
    columns: ['NRIC', 'date_of_conduct', 'pushup', 'pushup_score', 'situp', 'situp_score', 'run_2400', 'run_score', 'overall', 'grade'],
    orderBy: 'date_of_conduct DESC, NRIC',
  },
  voc: {
    columns: ['NRIC', 'type_of_VOC', 'date_of_conduct'],
    orderBy: 'date_of_conduct DESC, NRIC, type_of_VOC',
  },
  conducts: {
    columns: ['date_of_conduct', 'conduct'],
    orderBy: 'date_of_conduct ASC, conduct',
  },
}

const tables = Object.keys(tableConfig)

const tableQueries = Object.fromEntries(
  tables.map((table) => [table, `SELECT * FROM ${table} ORDER BY ${tableConfig[table].orderBy}`]),
)

function getTableData() {
  return Object.fromEntries(
    tables.map((table) => [table, db.prepare(tableQueries[table]).all()]),
  )
}

function getRows(table) {
  const rows = db.prepare(tableQueries[table]).all()

  if (!['medical', 'cs', 'atp', 'ippt', 'voc'].includes(table)) return rows

  const personnelNames = new Map(
    db.prepare('SELECT NRIC, name FROM personnel').all().map((person) => [person.NRIC, person.name]),
  )

  return rows.map((row) => ({
    ...row,
    name: personnelNames.get(row.NRIC) ?? '-',
  }))
}

function insertRow(table, payload) {
  const config = tableConfig[table]
  const row = Object.fromEntries(
    config.columns.map((column) => [column, payload[column] ?? null]),
  )

  const columns = config.columns.join(', ')
  const placeholders = config.columns.map((column) => `@${column}`).join(', ')
  db.prepare(`INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`).run(row)
  return row
}

function getLatestByNric(rows, dateKey = 'date_of_conduct') {
  const latest = new Map()

  for (const row of rows) {
    const existing = latest.get(row.NRIC)
    if (!existing || String(row[dateKey] ?? '') > String(existing[dateKey] ?? '')) {
      latest.set(row.NRIC, row)
    }
  }

  return latest
}

function buildOverviewRows(data) {
  const latestMedical = getLatestByNric(data.medical, 'start_date')
  const latestIppt = getLatestByNric(data.ippt)
  const latestVoc = getLatestByNric(data.voc)
  const latestCs = getLatestByNric(data.cs)
  const latestAtp = getLatestByNric(data.atp)
  const today = new Date().toISOString().slice(0, 10)

  return data.personnel.map((person) => {
    const medical = latestMedical.get(person.NRIC)
    const ippt = latestIppt.get(person.NRIC)
    const voc = latestVoc.get(person.NRIC)
    const cs = latestCs.get(person.NRIC)
    const atp = latestAtp.get(person.NRIC)

    return {
      rank: person.rank,
      name: person.name,
      platoon: person.platoon,
      year: person.turnY2 && person.turnY2 <= today ? '2' : '1',
      medical: medical?.medical_status ?? '-',
      ippt: ippt?.grade ?? '-',
      voc: voc ? `${voc.type_of_VOC} (${voc.date_of_conduct})` : '-',
      cs: cs?.score ?? '-',
      atp: atp?.score ?? '-',
      cpl: `${person.rank} ${person.name}`,
      NRIC: person.NRIC,
    }
  })
}

function buildSummary(data, overviewRows) {
  const fitCount = data.medical.filter((row) => row.medical_status?.toLowerCase() === 'fit').length
  const tempCount = data.medical.filter((row) => row.medical_status?.toLowerCase().includes('temp')).length
  const permCount = Math.max(data.medical.length - fitCount - tempCount, 0)
  const completed = overviewRows.filter((row) => [row.ippt, row.voc, row.cs, row.atp].every((value) => value && value !== '-')).length

  return {
    totalPersonnel: data.personnel.length,
    medicalRecords: data.medical.length,
    completedRequirements: completed,
    overdueRequirements: Math.max(data.personnel.length - completed, 0),
    medicalBreakdown: {
      fit: fitCount,
      temporary: tempCount,
      permanent: permCount,
    },
    nextConducts: data.conducts.slice(0, 4),
  }
}

app.get('/api/dashboard', (_req, res) => {
  const availableTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
  res.json({
    summary: {
      tableCount: availableTables.length,
      tables: availableTables.map((row) => row.name),
      databasePath: dbPath,
    },
  })
})

for (const table of tables) {
  app.get(`/api/${table}`, (_req, res) => {
    res.json(getRows(table))
  })

  app.post(`/api/${table}`, (req, res) => {
    try {
      const inserted = insertRow(table, req.body ?? {})
      res.status(201).json({
        ok: true,
        row: inserted,
      })
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Could not save record.',
      })
    }
  })
}

app.get('/api/overview', (_req, res) => {
  res.json(buildOverviewRows(getTableData()))
})

app.get('/api/atpcs', (_req, res) => {
  const data = getTableData()
  const personnelNames = new Map(
    db.prepare('SELECT NRIC, name FROM personnel').all().map((person) => [person.NRIC, person.name]),
  )
  res.json([
    ...data.atp.map((row) => ({ ...row, name: personnelNames.get(row.NRIC) ?? '-', type: 'ATP' })),
    ...data.cs.map((row) => ({ ...row, name: personnelNames.get(row.NRIC) ?? '-', type: 'CS' })),
  ].sort((a, b) => String(b.date_of_conduct).localeCompare(String(a.date_of_conduct))))
})

app.post('/api/atpcs', (req, res) => {
  const type = String(req.body?.type ?? '').toUpperCase()
  const targetTable = type === 'CS' ? 'cs' : type === 'ATP' ? 'atp' : null

  if (!targetTable) {
    res.status(400).json({
      ok: false,
      error: 'type must be ATP or CS.',
    })
    return
  }

  try {
    const inserted = insertRow(targetTable, req.body ?? {})
    res.status(201).json({
      ok: true,
      row: { ...inserted, type },
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Could not save record.',
    })
  }
})

app.post('/api/results', (req, res) => {
  const type = String(req.body?.type ?? '').toUpperCase()

  try {
    if (type === 'ATP' || type === 'CS') {
      const table = type === 'ATP' ? 'atp' : 'cs'
      const inserted = insertRow(table, req.body ?? {})
      res.status(201).json({ ok: true, row: { ...inserted, type } })
      return
    }

    if (type === 'VOC') {
      const inserted = insertRow('voc', req.body ?? {})
      res.status(201).json({ ok: true, row: inserted })
      return
    }

    if (type === 'IPPT') {
      const inserted = insertRow('ippt', req.body ?? {})
      res.status(201).json({ ok: true, row: inserted })
      return
    }

    res.status(400).json({
      ok: false,
      error: 'type must be ATP, CS, VOC, or IPPT.',
    })
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Could not save record.',
    })
  }
})

app.get('/api/data', (_req, res) => {
  const data = getTableData()
  const overview = buildOverviewRows(data)
  const summary = buildSummary(data, overview)

  res.json({
    summary,
    overview,
    personnel: data.personnel,
    medical: data.medical,
    ippt: data.ippt,
    voc: data.voc,
    atpcs: [
      ...data.atp.map((row) => ({ ...row, type: 'ATP' })),
      ...data.cs.map((row) => ({ ...row, type: 'CS' })),
    ].sort((a, b) => String(b.date_of_conduct).localeCompare(String(a.date_of_conduct))),
    conducts: data.conducts,
  })
})

app.get('/api/export/excel', (_req, res) => {
  const workbook = XLSX.utils.book_new()

  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all()
      if (rows.length === 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ table_name: table, status: 'No records yet' }]), table)
        continue
      }

      const sheet = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(workbook, sheet, table)
    } catch (error) {
      console.error(`Could not export table ${table}:`, error)
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ table_name: table, status: 'Schema unavailable' }]), table)
    }
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=sofun-dashboard-export.xlsx')
  res.send(buffer)
})

app.listen(port, () => {
  console.log(`SOFUN API server running on http://localhost:${port}`)
})
