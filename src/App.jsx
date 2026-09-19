import { useEffect, useMemo, useState } from 'react'
import './App.css'

const navigation = ['Overview', 'Personnel Info', 'Medical Status', 'IPPT', 'VOC', 'ATP / CS', 'Conducts']
const platoonTabs = ['All', 'HQ', 'Platoon 1', 'Platoon 2', 'Platoon 3']

const emptyData = {
  overview: [],
  personnel: [],
  medical: [],
  ippt: [],
  voc: [],
  atpcs: [],
  conducts: [],
}

const fieldLabels = {
  NRIC: 'NRIC',
  rank: 'Rank',
  name: 'Name',
  platoon: 'Platoon',
  DOE: 'DOE',
  ORD: 'ORD',
  turnY2: 'Turn Y2',
  medical_status: 'Medical Status',
  start_date: 'Start Date',
  end_date: 'End Date',
  IPPT: 'IPPT',
  VOC: 'VOC',
  Trainfire: 'Trainfire',
  remarks: 'Remarks',
  date_of_conduct: 'Date of Conduct',
  type_of_VOC: 'Type of VOC',
  pushup: 'Pushup',
  pushup_score: 'Pushup Score',
  situp: 'Situp',
  situp_score: 'Situp Score',
  run_2400: '2.4km',
  run_score: '2.4km Score',
  overall: 'Overall',
  grade: 'Grade',
  score: 'Score',
  conduct: 'Conduct',
  type: 'Type',
  year: 'Year',
  medical: 'Medical Status',
  ippt: 'IPPT',
  voc: 'VOC',
  cs: 'CS',
  atp: 'ATP',
  cpl: 'Personnel Detail',
}

const columnKeyMap = {
  NRIC: 'NRIC',
  Rank: 'rank',
  Name: 'name',
  Platoon: 'platoon',
  DOE: 'DOE',
  ORD: 'ORD',
  'Turn Y2': 'turnY2',
  'Medical Status': 'medical_status',
  'Start Date': 'start_date',
  'End Date': 'end_date',
  IPPT: 'IPPT',
  VOC: 'VOC',
  Trainfire: 'Trainfire',
  Remarks: 'remarks',
  'Date of Conduct': 'date_of_conduct',
  'Type of VOC': 'type_of_VOC',
  '2.4km': 'run_2400',
  '2.4km Score': 'run_score',
  'Pushup Score': 'pushup_score',
  'Situp Score': 'situp_score',
  Overall: 'overall',
  Grade: 'grade',
  Pushup: 'pushup',
  Situp: 'situp',
  Type: 'type',
  Score: 'score',
  Conduct: 'conduct',
  Date: 'date_of_conduct',
  Year: 'year',
  CS: 'cs',
  ATP: 'atp',
  'Personnel Detail': 'cpl',
}

const formConfigs = {
  personnel: {
    endpoint: '/api/personnel',
    title: 'Add Personnel',
    button: '+ New Entry',
    fields: ['NRIC', 'rank', 'name', 'platoon', 'DOE', 'ORD', 'turnY2'],
  },
  medical: {
    endpoint: '/api/medical',
    title: 'Add Medical Record',
    button: 'Medical Record',
    fields: ['NRIC', 'medical_status', 'start_date', 'end_date', 'IPPT', 'VOC', 'Trainfire', 'remarks'],
  },
  result: {
    endpoint: '/api/results',
    title: 'Add Results',
    button: 'Add Results',
    fields: ['type'],
  },
  conduct: {
    endpoint: '/api/conducts',
    title: 'Add Conduct Date',
    button: 'Conduct Date',
    fields: ['date_of_conduct', 'conduct'],
  },
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function normalizePlatoon(value) {
  const text = String(value ?? '').trim()

  if (!text) return '-'
  if (text.toUpperCase() === 'HQ') return 'HQ'

  const match = text.match(/(\d+)/)
  return match ? `Platoon ${match[1]}` : text
}

function matchesSearch(row, term) {
  if (!term) return true

  const haystack = Object.values(row)
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
    .toLowerCase()

  return haystack.includes(term.toLowerCase())
}

function getFormFields(mode, formValues) {
  if (mode !== 'result') {
    return formConfigs[mode].fields
  }

  const type = formValues.type || 'ATP'

  if (type === 'IPPT') {
    return ['type', 'NRIC', 'date_of_conduct', 'pushup', 'pushup_score', 'situp', 'situp_score', 'run_2400', 'run_score', 'overall', 'grade']
  }

  if (type === 'VOC') {
    return ['type', 'NRIC', 'type_of_VOC', 'date_of_conduct']
  }

  return ['type', 'NRIC', 'date_of_conduct', 'score']
}

async function fetchRows(endpoint) {
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`Request failed for ${endpoint} with status ${response.status}`)
  }

  return response.json()
}

async function fetchDashboardData() {
  const [overview, personnel, medical, ippt, voc, atpcs, conducts] = await Promise.all([
    fetchRows('/api/overview'),
    fetchRows('/api/personnel'),
    fetchRows('/api/medical'),
    fetchRows('/api/ippt'),
    fetchRows('/api/voc'),
    fetchRows('/api/atpcs'),
    fetchRows('/api/conducts'),
  ])

  return { overview, personnel, medical, ippt, voc, atpcs, conducts }
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loginValues, setLoginValues] = useState({ email: '', password: '' })
  const [loginStatus, setLoginStatus] = useState('')
  const [activeView, setActiveView] = useState('Overview')
  const [activePlatoon, setActivePlatoon] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [exportStatus, setExportStatus] = useState('Export Excel')
  const [data, setData] = useState(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formMode, setFormMode] = useState('')
  const [formValues, setFormValues] = useState({})
  const [formStatus, setFormStatus] = useState('')
  const [selectedRow, setSelectedRow] = useState(null)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const response = await fetch('/api/session')
      const session = await response.json()
      setAuthenticated(session.authenticated === true)
      if (session.authenticated) loadDashboardRows()
    } catch (sessionError) {
      console.error('Failed to check login session:', sessionError)
      setLoginStatus('Could not connect to the login service.')
    } finally {
      setCheckingSession(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setLoginStatus('Signing in...')

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginValues),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Could not sign in.')

      setAuthenticated(true)
      setLoginValues({ email: '', password: '' })
      setLoginStatus('')
      loadDashboardRows()
    } catch (loginError) {
      setLoginStatus(loginError.message || 'Could not sign in.')
    }
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    setAuthenticated(false)
    setData(emptyData)
  }

  async function loadDashboardRows() {
    setLoading(true)
    setError('')

    try {
      const nextData = await fetchDashboardData()
      setData(nextData)
      setSelectedRow((currentRow) => currentRow ?? nextData.overview[0] ?? nextData.personnel[0] ?? null)
    } catch (loadError) {
      console.error('Failed to load dashboard rows:', loadError)
      setError(loadError.message || 'Could not load dashboard rows.')
      setData(emptyData)
    } finally {
      setLoading(false)
    }
  }

  const medicalBreakdown = useMemo(() => ({
    fit: data.medical.filter((row) => String(row.medical_status ?? '').toLowerCase() === 'fit').length,
    temporary: data.medical.filter((row) => String(row.medical_status ?? '').toLowerCase().includes('temp')).length,
    permanent: data.medical.filter((row) => {
      const status = String(row.medical_status ?? '').toLowerCase()
      return status && status !== 'fit' && !status.includes('temp')
    }).length,
  }), [data.medical])

  const requirementRows = useMemo(() => {
    const total = data.personnel.length || 1

    const toSegments = (count, color) => {
      const filled = Math.max(0, Math.min(8, Math.round((count / total) * 8)))
      return Array.from({ length: 8 }, (_value, index) => (index < filled ? color : 'gray'))
    }

    return [
      { label: 'IPPT', segments: toSegments(data.overview.filter((row) => row.ippt && row.ippt !== '-').length, 'yellow') },
      { label: 'VOC', segments: toSegments(data.overview.filter((row) => row.voc && row.voc !== '-').length, 'green') },
      { label: 'CS', segments: toSegments(data.overview.filter((row) => row.cs && row.cs !== '-').length, 'red') },
      { label: 'ATP', segments: toSegments(data.overview.filter((row) => row.atp && row.atp !== '-').length, 'amber') },
    ]
  }, [data])

  const filteredOverviewRows = useMemo(() => {
    const rows = activePlatoon === 'All'
      ? data.overview
      : data.overview.filter((row) => normalizePlatoon(row.platoon) === activePlatoon)

    return rows.filter((row) => matchesSearch(row, searchTerm))
  }, [activePlatoon, data.overview, searchTerm])

  const summaryCards = useMemo(() => {
    const visiblePersonnel = filteredOverviewRows
    const completeCount = visiblePersonnel.filter((row) => [row.medical, row.ippt, row.voc, row.cs, row.atp].every((value) => value && value !== '-')).length
    const medicalCount = data.medical.length

    return [
      { label: 'Total Personnel', value: visiblePersonnel.length },
      { label: 'Medical Records', value: medicalCount },
      { label: 'Completed', value: completeCount },
      { label: 'Overdue', value: Math.max(visiblePersonnel.length - completeCount, 0) },
    ]
  }, [data.medical.length, filteredOverviewRows])

  const filteredPersonnelRows = useMemo(() => data.personnel.filter((row) => matchesSearch(row, searchTerm)), [data.personnel, searchTerm])
  const filteredMedicalRows = useMemo(() => data.medical.filter((row) => matchesSearch(row, searchTerm)), [data.medical, searchTerm])
  const filteredIpptRows = useMemo(() => data.ippt.filter((row) => matchesSearch(row, searchTerm)), [data.ippt, searchTerm])
  const filteredVocRows = useMemo(() => data.voc.filter((row) => matchesSearch(row, searchTerm)), [data.voc, searchTerm])
  const filteredAtpcsRows = useMemo(() => data.atpcs.filter((row) => matchesSearch(row, searchTerm)), [data.atpcs, searchTerm])
  const filteredConductRows = useMemo(() => data.conducts.filter((row) => matchesSearch(row, searchTerm)), [data.conducts, searchTerm])

  const viewConfig = {
    Overview: {
      title: 'Bravo SOFUN tracker',
      table: filteredOverviewRows,
      rawTable: data.overview,
      columns: ['Rank', 'Name', 'Platoon', 'Year', 'Medical Status', 'IPPT', 'VOC', 'CS', 'ATP', 'Personnel Detail'],
      emptyMessage: 'No personnel matched your search.',
    },
    'Personnel Info': {
      title: 'Personnel Info',
      table: filteredPersonnelRows,
      rawTable: data.personnel,
      columns: ['NRIC', 'Rank', 'Name', 'Platoon', 'DOE', 'ORD', 'Turn Y2'],
      emptyMessage: 'No personnel records matched your search.',
    },
    'Medical Status': {
      title: 'Medical Status',
      table: filteredMedicalRows,
      rawTable: data.medical,
      columns: ['NRIC', 'Name', 'Medical Status', 'Start Date', 'End Date', 'IPPT', 'VOC', 'Trainfire', 'Remarks'],
      emptyMessage: 'No medical records matched your search.',
    },
    IPPT: {
      title: 'IPPT Records',
      table: filteredIpptRows,
      rawTable: data.ippt,
      columns: ['NRIC', 'Name', 'Date of Conduct', 'Pushup', 'Pushup Score', 'Situp', 'Situp Score', '2.4km', '2.4km Score', 'Overall', 'Grade'],
      emptyMessage: 'No IPPT records matched your search.',
    },
    VOC: {
      title: 'VOC Records',
      table: filteredVocRows,
      rawTable: data.voc,
      columns: ['NRIC', 'Name', 'Type of VOC', 'Date of Conduct'],
      emptyMessage: 'No VOC records matched your search.',
    },
    'ATP / CS': {
      title: 'ATP / CS Records',
      table: filteredAtpcsRows,
      rawTable: data.atpcs,
      columns: ['NRIC', 'Name', 'Type', 'Date of Conduct', 'Score'],
      emptyMessage: 'No ATP / CS records matched your search.',
    },
    Conducts: {
      title: 'Conducts',
      table: filteredConductRows,
      rawTable: data.conducts,
      columns: ['Date', 'Conduct'],
      emptyMessage: 'No conduct dates matched your search.',
    },
  }

  const currentView = viewConfig[activeView]
  const today = new Date().toISOString().slice(0, 10)
  const nextConducts = data.conducts
    .filter((row) => String(row.date_of_conduct ?? '') >= today)
    .sort((left, right) => String(left.date_of_conduct).localeCompare(String(right.date_of_conduct)))
    .slice(0, 3)
  const chartTotal = medicalBreakdown.fit + medicalBreakdown.temporary + medicalBreakdown.permanent
  const fitStop = chartTotal > 0 ? (medicalBreakdown.fit / chartTotal) * 100 : 0
  const temporaryStop = chartTotal > 0 ? fitStop + ((medicalBreakdown.temporary / chartTotal) * 100) : 0

  function openForm(mode) {
    const config = formConfigs[mode]
    const initialValues = Object.fromEntries(config.fields.map((field) => [field, '']))
    if (mode === 'result') {
      initialValues.type = 'ATP'
    }

    setFormMode(mode)
    setFormValues(initialValues)
    setFormStatus('')
  }

  function closeForm() {
    setFormMode('')
    setFormValues({})
    setFormStatus('')
  }

  function renderCellValue(row, column) {
    const lookup = columnKeyMap[column] || column.toLowerCase().replace(/\s+/g, '_')
    const value = row[lookup]

    if (column === 'Platoon') return normalizePlatoon(value)
    if (['DOE', 'ORD', 'Turn Y2', 'Start Date', 'End Date', 'Date of Conduct', 'Date'].includes(column)) {
      return formatDate(value)
    }

    return value ?? '-'
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const config = formConfigs[formMode]
    setFormStatus('Saving...')

    try {
      const payload = Object.fromEntries(
        Object.entries(formValues).map(([key, value]) => [key, value === '' ? null : value]),
      )

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || `Could not save record to ${config.endpoint}.`)
      }

      await loadDashboardRows()
      setFormStatus('Saved.')
      closeForm()
    } catch (submitError) {
      setFormStatus(submitError.message || 'Could not save record.')
    }
  }

  function handleExport() {
    setExportStatus('Preparing...')
    window.location.href = '/api/export/excel'
    window.setTimeout(() => setExportStatus('Export Excel'), 1200)
  }

  const activeForm = formMode ? formConfigs[formMode] : null
  const activeFormFields = activeForm ? getFormFields(formMode, formValues) : []

  if (checkingSession) {
    return <div className="auth-page"><div className="auth-card"><p className="auth-kicker">BRAVO SOFUN TRACKER</p><h1>Checking access</h1></div></div>
  }

  if (!authenticated) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleLogin}>
          <p className="auth-kicker">BRAVO SOFUN TRACKER</p>
          <h1>Welcome back</h1>
          <p className="auth-copy">Sign in to access 38 SCE BRAVO dashboard.</p>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={loginValues.email}
              onChange={(event) => setLoginValues((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={loginValues.password}
              onChange={(event) => setLoginValues((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>

          <button className="auth-submit" type="submit">Sign in</button>
          {loginStatus ? <p className="auth-status">{loginStatus}</p> : null}
        </form>
      </div>
    )
  }

  return (
    <div className="sofun-layout">
      <aside className="sidebar">
        {navigation.map((item) => (
          <button
            key={item}
            className={`sidebar-item ${activeView === item ? 'active' : ''}`}
            onClick={() => {
              setActiveView(item)
              setSelectedRow(null)
            }}
          >
            {item}
          </button>
        ))}

        <button className="sidebar-item new-entry" onClick={() => openForm('personnel')}>Add Personnel</button>
        <button className="sidebar-item secondary" onClick={() => openForm('medical')}>Medical Record</button>
        <button className="sidebar-item secondary" onClick={() => openForm('result')}>Results</button>
        <button className="sidebar-item secondary" onClick={() => openForm('conduct')}>Conduct Date</button>
        <button className="sidebar-item logout-button" onClick={handleLogout}>Sign out</button>
      </aside>

      <main className="content-panel">
        <div className="title-row">
          <h1>{currentView.title}</h1>
          <button className="export-button" onClick={handleExport}>{exportStatus}</button>
        </div>

        <div className="toolbar-shell">
          <input
            className="search-input"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={`Search ${activeView.toLowerCase()}...`}
          />
          <button className="refresh-button" onClick={loadDashboardRows}>Refresh</button>
        </div>

        {activeView === 'Overview' ? (
          <>
            <div className="tab-row">
              {platoonTabs.map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activePlatoon === tab ? 'active' : ''}`}
                  onClick={() => setActivePlatoon(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="metric-row">
              {summaryCards.map((card) => (
                <div key={card.label} className="metric-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>

            <div className="lower-grid">
              <div className="summary-card">
                <h2>Medical Summary</h2>
                <div className="chart-wrap">
                  <div
                    className="pie-chart"
                    style={{
                      background: chartTotal > 0
                        ? `conic-gradient(#4cd964 0 ${fitStop}%, #ffd60a ${fitStop}% ${temporaryStop}%, #d1d5db ${temporaryStop}% 100%)`
                        : 'conic-gradient(#d1d5db 0 100%)',
                    }}
                  />
                </div>
                <div className="legend">
                  <span><i className="dot green" />FIT ({medicalBreakdown.fit})</span>
                  <span><i className="dot amber" />TEMP STATUS ({medicalBreakdown.temporary})</span>
                  <span><i className="dot gray" />PERM STATUS ({medicalBreakdown.permanent})</span>
                </div>
              </div>

              <div className="summary-card">
                <h2>Next Conduct</h2>
                <div className="next-conduct-list">
                  {nextConducts.length > 0 ? nextConducts.map((row, index) => (
                    <p key={`${row.conduct}-${row.date_of_conduct}-${index}`}>
                      {row.conduct}: {formatDate(row.date_of_conduct)}
                    </p>
                  )) : <p>No conduct dates found.</p>}
                </div>
              </div>

              <div className="summary-card requirement-card">
                <h2>SOFUN Requirements</h2>
                {requirementRows.map((row) => (
                  <div key={row.label} className="requirement-row">
                    <div className="requirement-label">{row.label}</div>
                    <div className="segments">
                      {row.segments.map((segment, index) => (
                        <span key={`${row.label}-${index}`} className={`segment ${segment}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-panel">
              <table>
                <thead>
                  <tr>
                    {currentView.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentView.table.length > 0 ? currentView.table.map((row, index) => (
                    <tr
                      key={`${row.NRIC || row.name}-${index}`}
                      className={selectedRow === row ? 'is-selected' : ''}
                      onClick={() => setSelectedRow(row)}
                    >
                      {currentView.columns.map((column) => (
                        <td key={`${column}-${index}`}>{renderCellValue(row, column)}</td>
                      ))}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={currentView.columns.length}>{currentView.emptyMessage}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="detail-card">
                <div className="detail-title">PERSONNEL DETAIL</div>
                <div className="detail-tag-row">
                  <span>NRIC</span>
                  <span>Medical</span>
                  <span>IPPT</span>
                  <span>VOC</span>
                  <span>ATP</span>
                </div>
                <div className="detail-box">
                  {selectedRow ? (
                    <>
                      <div className="detail-topline">{selectedRow.cpl || `${selectedRow.rank} ${selectedRow.name}`}</div>
                      <div className="detail-list">
                        <p><strong>NRIC:</strong> {selectedRow.NRIC || '-'}</p>
                        <p><strong>Platoon:</strong> {normalizePlatoon(selectedRow.platoon)}</p>
                        <p><strong>Medical:</strong> {selectedRow.medical || '-'}</p>
                        <p><strong>IPPT:</strong> {selectedRow.ippt || '-'}</p>
                        <p><strong>VOC:</strong> {selectedRow.voc || '-'}</p>
                        <p><strong>CS:</strong> {selectedRow.cs || '-'}</p>
                        <p><strong>ATP:</strong> {selectedRow.atp || '-'}</p>
                      </div>
                    </>
                  ) : (
                    <div className="detail-topline">Select a row to inspect.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="table-page-shell">
            <div className="page-toolbar">
              <div className="toolbar-badge">{currentView.title}</div>
              <div className="toolbar-right">
                <span className="mini-status">{currentView.table.length} shown</span>
                <span className="mini-status">{currentView.rawTable.length} total</span>
              </div>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {currentView.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentView.table.length > 0 ? currentView.table.map((row, index) => (
                    <tr key={`${activeView}-${index}`}>
                      {currentView.columns.map((column) => (
                        <td key={`${column}-${index}`}>{renderCellValue(row, column)}</td>
                      ))}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={currentView.columns.length}>{currentView.emptyMessage}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="status-bar">
          <span>{loading ? 'Loading database data...' : error ? `Database load failed: ${error}` : 'Relational database data loaded'}</span>
          <span>{currentView.table.length} records shown</span>
        </div>
      </main>

      {activeForm ? (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{activeForm.title}</h2>
              <button className="modal-close" onClick={closeForm}>Close</button>
            </div>

            <form className="entry-form" onSubmit={handleSubmit}>
              {activeFormFields.map((field) => (
                <label key={field} className="form-field">
                  <span>{fieldLabels[field] || field}</span>
                  {field === 'type' ? (
                    <select
                      value={formValues[field] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    >
                      <option value="ATP">ATP</option>
                      <option value="CS">CS</option>
                      <option value="VOC">VOC</option>
                      <option value="IPPT">IPPT</option>
                    </select>
                  ) : field === 'grade' ? (
                    <select
                      value={formValues[field] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    >
                      <option value="">Select grade</option>
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  ) : field === 'type_of_VOC' ? (
                    <select
                      value={formValues[field] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    >
                      <option value="">Select VOC</option>
                      <option value="VOC 1">VOC 1</option>
                      <option value="VOC 2">VOC 2</option>
                      <option value="VOC 3">VOC 3</option>
                      <option value="VOC 4">VOC 4</option>
                    </select>
                  ) : (
                    <input
                      type={
                        field.includes('date') || field === 'DOE' || field === 'ORD' || field === 'turnY2'
                          ? 'date'
                          : ['pushup', 'pushup_score', 'situp', 'situp_score', 'run_score', 'overall'].includes(field)
                            ? 'number'
                            : 'text'
                      }
                      value={formValues[field] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field]: event.target.value }))}
                    />
                  )}
                </label>
              ))}

              <div className="form-actions">
                <button type="submit" className="export-button">{activeForm.button}</button>
                <button type="button" className="refresh-button" onClick={closeForm}>Cancel</button>
              </div>

              {formStatus ? <p className="form-status">{formStatus}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
