import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

const appUrl = process.env.APP_URL ?? 'http://localhost:5173/'
const profile = await mkdtemp(join(tmpdir(), 'metro-chrome-'))
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9223', `--user-data-dir=${profile}`, appUrl], { stdio: 'ignore' })

try {
  let page
  for (let attempt = 0; attempt < 50 && !page; attempt++) {
    try {
      page = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(item => item.type === 'page')
    } catch { await wait(100) }
  }
  if (!page) throw new Error('Chrome did not expose the app page.')

  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let nextId = 0
  const pending = new Map()
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) pending.get(message.id)?.(message)
  }
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, message => {
      pending.delete(id)
      message.error ? reject(new Error(message.error.message)) : resolve(message.result)
    })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const run = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Browser evaluation failed.')
    return result.result.value
  }
  const eventually = async (expression, message, attempts = 80) => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (await run(expression)) return
      await wait(100)
    }
    throw new Error(message)
  }
  const clickText = text => run(`[...document.querySelectorAll('button')].find(button => button.textContent.trim().includes(${JSON.stringify(text)}))?.click()`)

  await eventually(`document.readyState === 'complete' && !!document.querySelector('button')`, 'The app did not load.')
  await run(`localStorage.setItem('metro-active-account', JSON.stringify('quantum')); location.reload()`)
  await eventually(`document.readyState === 'complete' && !!document.querySelector('button')`, 'The app did not reload.')
  await clickText('See how it works')
  await eventually(`document.querySelector('#entrada')?.dataset.active === 'true'`, 'The landing journey did not advance.')
  await clickText('Open planner')
  await eventually(`document.querySelector('[aria-current="page"]')?.textContent.includes('Learning Map')`, 'The dashboard did not open.')
  if (!await run(`document.querySelector('[aria-label="Learning source content"]')?.value === '' && !!document.querySelector('.empty-map')`)) throw new Error('The app did not open in the empty Explorer account.')
  await clickText('Add a source to begin')
  if (!await run(`document.activeElement?.getAttribute('aria-label') === 'Learning source content'`)) throw new Error('Add source did not focus the source field.')
  if (!await run(`document.querySelector('[aria-label="AI provider"]') && document.querySelector('[aria-label="AI API key"]')?.type === 'password' && !localStorage.getItem('llm-api-key')`)) throw new Error('The AI credentials control is missing or persisted insecurely.')
  await clickText('Alex Morgan')
  await eventually(`document.querySelector('[aria-label="Learning source content"]')?.value === 'Quantum Computing' && document.querySelectorAll('.metro-station').length > 12`, 'The Quantum route is not preloaded.')
  if (!await run(`(() => { const panel = document.querySelector('.study-overview'); const last = panel.lastElementChild; return Math.abs(last.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom) < 2 })()`)) throw new Error('The study overview does not fill its parent height.')
  if (!await run(`document.querySelector('.study-overview section:nth-child(2)')?.textContent.includes('Quantum Computing') && document.querySelector('.study-overview section:last-child')?.textContent.includes('12h 30m')`)) throw new Error('The study overview still shows placeholder route data.')
  if (await run(`document.querySelectorAll('.study-bars button[aria-label]').length`) !== 7) throw new Error('The weekly study load is not actionable.')
  await run(`document.querySelector('.study-bars button').click()`)
  await eventually(`document.querySelector('[aria-current="page"]')?.textContent.trim() === 'Study Plan'`, 'The weekly study load did not open the plan.')
  await clickText('Learning Map')
  await clickText('Maya Chen')
  await eventually(`document.querySelector('[aria-label="Learning source content"]')?.value === '' && !!document.querySelector('.empty-map')`, 'Returning to Explorer did not restore the empty flow.')
  if (!await run(`(() => { const today = new Date(); const start = new Date(today); start.setDate(today.getDate() - today.getDay()); const expected = Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date.getDate() }); const shown = [...document.querySelectorAll('.calendar-day .date-number')].map(node => Number(node.textContent)); return JSON.stringify(shown) === JSON.stringify(expected) && Number(document.querySelector('.calendar-day[aria-current="date"] .date-number')?.textContent) === today.getDate() })()`)) throw new Error('The weekly calendar is not synchronized with the real local week.')

  await run(`document.querySelector('[aria-label="Zoom in"]').click()`)
  if (!await run(`[...document.querySelectorAll('.map-tools span')].some(item => item.textContent === '125%')`)) throw new Error('Map zoom in failed.')
  await run(`document.querySelector('[aria-label="Reset zoom"]').click()`)
  if (!await run(`[...document.querySelectorAll('.map-tools span')].some(item => item.textContent === '100%')`)) throw new Error('Map zoom reset failed.')

  await run(`document.querySelector('.user-card').click()`)
  if (!await run(`document.querySelector('[aria-current="page"]')?.textContent.trim() === 'Settings'`)) throw new Error('The profile shortcut did not open settings.')

  for (const item of ['Study Plan', 'Library', 'Progress', 'AI Coach', 'Settings', 'Learning Map']) {
    await clickText(item)
    if (!await run(`document.querySelector('[aria-current="page"]')?.textContent.trim() === ${JSON.stringify(item)}`)) throw new Error(`${item} navigation failed.`)
  }
  await clickText('Progress')
  if (await run(`document.querySelectorAll('.progress-metrics article').length`) !== 4 || await run(`document.querySelectorAll('.route-progress-row').length`) !== 4 || !await run(`document.querySelector('.progress-ring')?.getAttribute('aria-valuenow')`)) throw new Error('The progress dashboard is missing useful metrics.')
  await run(`document.querySelector('.next-progress-stop button').click()`)
  await eventually(`document.querySelector('[aria-current="page"]')?.textContent.trim() === 'Learning Map' && !!document.querySelector('.empty-map') && !document.querySelector('[role="timer"]')`, 'The empty account started a fake lesson without a route.')

  await run(`(() => { const input = document.querySelector('[aria-label="Learning source content"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Urban Beekeeping'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await clickText('Create my map')
  await eventually(`!!document.querySelector('.generation-screen') && document.querySelector('.generation-panel')?.textContent.includes('Urban Beekeeping')`, 'The railway generation transition did not open.')
  await eventually(`document.querySelector('[role="status"]')?.textContent.includes('route ready')`, 'Custom plan generation did not finish.', 1800)
  if (await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).title`) !== 'Urban Beekeeping') throw new Error('The arbitrary topic was not used.')
  if (await run(`localStorage.getItem('metro-plan:quantum')`) !== null) throw new Error('The Explorer route leaked into the Quantum account.')
  const stationCount = await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).concepts.length`)
  if (stationCount < 4 || stationCount > 25) throw new Error('The custom plan chose an invalid number of stations.')
  if (!await run(`(() => { const plan = JSON.parse(localStorage.getItem('metro-plan:explorer')); const assigned = plan.lines.flatMap(line => line.concept_ids); return plan.lines.length > 0 && assigned.length === plan.concepts.length && new Set(assigned).size === plan.concepts.length })()`)) throw new Error('The API did not organize every station into named lines.')
  if (await run(`document.querySelectorAll('.generated-station').length`) !== stationCount) throw new Error('The map does not show every custom station.')
  const prerequisiteTarget = await run(`(() => { const plan = JSON.parse(localStorage.getItem('metro-plan:explorer')); return plan.edges[plan.edges.length - 1]?.to })()`)
  if (!prerequisiteTarget) throw new Error('The custom map has no prerequisite path to inspect.')
  await run(`document.querySelector('[data-concept-id="' + CSS.escape(${JSON.stringify(prerequisiteTarget)}) + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
  await eventually(`document.querySelector('.map-inspector') && Number(document.querySelectorAll('.map-inspector-stats strong')[1]?.textContent) > 0`, 'Selecting a map node did not open its prerequisite inspector.')
  const requiredCount = await run(`Number(document.querySelectorAll('.map-inspector-stats strong')[1].textContent)`)
  await clickText('Required path')
  await eventually(`document.querySelectorAll('.generated-station').length === ${requiredCount + 1}`, 'The prerequisite view did not isolate exactly the required nodes.')
  await clickText('Show full map')
  await eventually(`document.querySelectorAll('.generated-station').length === ${stationCount}`, 'The full learning map was not restored.')
  await clickText('Start lesson')
  await eventually(`document.querySelector('[role="timer"]')?.textContent.includes(':')`, 'Starting a map node did not open its lesson timer.')
  await clickText('Pause')
  const pausedAt = await run(`document.querySelector('[role="timer"] time').textContent`)
  await wait(1200)
  if (await run(`document.querySelector('[role="timer"] time').textContent`) !== pausedAt) throw new Error('The lesson timer continued while paused.')
  await clickText('Resume')
  await eventually(`document.querySelector('[role="timer"] time').textContent !== ${JSON.stringify(pausedAt)}`, 'The lesson timer did not resume.')
  await clickText('Alex Morgan')
  await eventually(`document.querySelector('[aria-label="Learning source content"]')?.value === 'Quantum Computing' && document.querySelectorAll('.generated-station').length === 0`, 'Switching back did not restore the Quantum route.')
  await clickText('Maya Chen')
  await eventually(`document.querySelector('[aria-label="Learning source content"]')?.value === 'Urban Beekeeping' && document.querySelectorAll('.generated-station').length === ${stationCount}`, 'Switching accounts did not restore the Explorer route.')

  await run(`document.querySelector('[aria-label="Dismiss notification"]').click()`)
  if (await run(`!!document.querySelector('[role="status"]')`)) throw new Error('The notification did not dismiss.')

  await clickText('View Plan')
  if (!await run(`document.querySelector('[aria-current="page"]')?.textContent.trim() === 'Study Plan'`)) throw new Error('View Plan did not open the study plan.')

  const chosenLesson = await run(`document.querySelectorAll('.session-list button')[1].querySelector('strong').textContent`)
  await run(`document.querySelectorAll('.session-list button')[1].click()`)
  await eventually(`document.querySelector('[aria-current="page"]')?.textContent.trim() === 'Learning Map' && document.querySelector('.map-heading h1')?.textContent === ${JSON.stringify(chosenLesson)}`, 'Choosing a scheduled lesson did not focus it on the map.')
  await eventually(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Complete Lesson'))`, 'The chosen lesson did not start.')
  await eventually(`document.querySelector('[role="timer"]')?.textContent.includes(':')`, 'The lesson timer did not appear.')
  await clickText('Complete Lesson')
  if (await run(`JSON.parse(localStorage.getItem('metro-completed-sessions:explorer')).length`) !== 1) throw new Error('Lesson progress was not persisted.')

  await clickText('Library')
  if (!await run(`document.querySelector('.library-feature') && document.querySelectorAll('.library-stage').length === 4 && document.querySelector('.concept-grid button').getBoundingClientRect().height >= 100`)) throw new Error('The concept library did not render its editorial layout.')
  const chosenConcept = await run(`document.querySelectorAll('.concept-grid button')[4].querySelector('strong').textContent`)
  await run(`document.querySelectorAll('.concept-grid button')[4].click()`)
  await eventually(`document.querySelector('[aria-current="page"]')?.textContent.trim() === 'Learning Map' && document.querySelector('.map-heading h1')?.textContent === ${JSON.stringify(chosenConcept)}`, 'Choosing a library concept did not focus it on the map.')

  await clickText('AI Coach')
  await run(`(() => { const input = document.querySelector('[aria-label="Question for AI Coach"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(`Explain ${chosenConcept}`)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await run(`document.querySelector('.coach-form').requestSubmit()`)
  await eventually(`document.querySelector('.workspace-copy')?.textContent.includes(${JSON.stringify(chosenConcept)})`, 'The coach did not answer from the custom plan.')

  await clickText('Settings')
  await run(`document.querySelector('.settings-card input').click()`)
  await clickText('Save Settings')
  if (await run(`localStorage.getItem('metro-daily-reminder')`) === null) throw new Error('Settings were not persisted.')
  await run(`(() => { const select = document.querySelector('[aria-label="Learning source"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'text'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`)
  await eventually(`document.querySelector('[aria-label="Learning source content"]')?.placeholder.includes('Paste the source')`, 'The pasted-text source did not open.')
  await run(`(() => { const input = document.querySelector('[aria-label="Learning source content"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Mycology notes — fungi, spores, hyphae, and forest ecosystems.'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  if (await run(`JSON.parse(localStorage.getItem('metro-preferences:explorer')).sourceType`) !== 'text') throw new Error('Source preferences were not persisted.')
  const previousPlanId = await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).id`)
  await clickText('Generate Plan')
  await eventually(`JSON.parse(localStorage.getItem('metro-plan:explorer')).id !== ${JSON.stringify(previousPlanId)}`, 'The pasted-text route was not generated.', 1800)
  if (!await run(`/mycolog|fung|spore|hyphae/i.test(localStorage.getItem('metro-plan:explorer'))`)) throw new Error('The pasted-text route did not use its source material.')

  const completedPlanSize = await run(`(() => { const plan = JSON.parse(localStorage.getItem('metro-plan:explorer')); const completed = plan.schedule.map(session => session.date + ':' + session.concept_id); localStorage.setItem('metro-completed-sessions:explorer', JSON.stringify(completed)); location.reload(); return completed.length })()`)
  await eventually(`document.readyState === 'complete' && [...document.querySelectorAll('button')].some(button => button.textContent.includes('Open planner'))`, 'The completed plan did not reload.')
  await clickText('Open planner')
  await eventually(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Review Lesson'))`, 'The completed lesson did not offer review.')
  await clickText('Review Lesson')
  await eventually(`document.querySelector('[role="timer"]') && [...document.querySelectorAll('button')].some(button => button.textContent.includes('Finish Review'))`, 'Review did not start with a timer.')
  await clickText('Finish Review')
  if (await run(`JSON.parse(localStorage.getItem('metro-completed-sessions:explorer')).length`) !== completedPlanSize) throw new Error('Review duplicated completed progress.')

  const conceptsBeforeExtension = await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).concepts.length`)
  const extensionTarget = await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).concepts.at(-1).id`)
  await run(`document.querySelector('[data-concept-id="' + CSS.escape(${JSON.stringify(extensionTarget)}) + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
  await clickText('Extend the line')
  await eventually(`document.querySelector('.generation-panel')?.textContent.includes('Extending the line behind')`, 'The metro extension animation did not open.')
  await eventually(`document.querySelector('[role="status"]')?.textContent.includes('necessary stops across')`, 'The selected line did not extend.', 1800)
  const conceptsAfterExtension = await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).concepts.length`)
  const addedStops = conceptsAfterExtension - conceptsBeforeExtension
  if (addedStops < 1) throw new Error('The API did not add the prerequisite stops it selected.')
  if (!await run(`document.querySelector('[role="status"]')?.textContent.includes('Added ' + ${addedStops} + ' necessary stops')`)) throw new Error('The UI did not report the API-selected station count.')
  if (!await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).lines.some(line => line.id.startsWith('extension:') && document.querySelector('.legend')?.textContent.includes(line.name))`)) throw new Error('The API-named extension lines were not shown on the map.')
  if (!await run(`JSON.parse(localStorage.getItem('metro-plan:explorer')).edges.some(edge => edge.to === ${JSON.stringify(extensionTarget)} && edge.from.startsWith('extension:'))`)) throw new Error('The new prerequisite track was not connected to the selected station.')

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  if (await run(`document.documentElement.scrollWidth > innerWidth`)) throw new Error('The mobile layout overflows horizontally.')
  if (await run(`getComputedStyle(document.querySelector('.app-shell')).gridTemplateColumns.split(' ')[0]`) !== '60px') throw new Error('The mobile navigation did not collapse.')
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  if (await run(`getComputedStyle(document.querySelector('.app-shell')).gridTemplateColumns.split(' ')[0]`) !== '212px') throw new Error('The desktop navigation did not expand.')

  socket.close()
  console.log('E2E check passed: navigation, map prerequisites and lesson start, generation, progress, coach, settings, and responsive layouts work.')
} finally {
  chrome.kill('SIGTERM')
  await new Promise(resolve => chrome.once('exit', resolve))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
