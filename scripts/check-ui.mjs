import { readFileSync } from 'node:fs'

const files = ['src/App.tsx', 'src/LandingPage.tsx', 'src/LearningMap.tsx']
const css = readFileSync('src/index.css', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const map = readFileSync('src/LearningMap.tsx', 'utf8')
const missing = files.flatMap(file => {
  const buttons = readFileSync(file, 'utf8').match(/<button\b[^>]*>/gs) ?? []
  return buttons.filter(button => !/onClick=|type="submit"/.test(button)).map(button => `${file}: ${button.replace(/\s+/g, ' ')}`)
})

if (missing.length) throw new Error(`Buttons without an action:\n${missing.join('\n')}`)
if (!css.includes('.station-label-layer { pointer-events: none; }')) throw new Error('Generated map labels must render in their own top layer.')
if (!app.includes("const nodeLabelStyleKey = 'youknow-node-label-style'") || !map.includes('station-label-layer ${nodeLabelStyle}')) throw new Error('The persisted node-title setting is not connected to the map.')
if (!map.includes("goalConnection || (nodeLabelStyle !== 'metro' && !sameLine)")) throw new Error('Metro labels must hide secondary connectors without disconnecting the end goal.')
if (!map.includes("aria-label={editing ? 'Finish editing map' : 'Edit map layout'}") || !map.includes('onPointerDown={event => startNodeDrag')) throw new Error('The map layout editor is not wired to its stations.')
console.log('UI check passed: every button has an action.')
