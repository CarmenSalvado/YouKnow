import { readFileSync } from 'node:fs'

const files = ['src/App.tsx', 'src/LandingPage.tsx', 'src/LearningMap.tsx']
const missing = files.flatMap(file => {
  const buttons = readFileSync(file, 'utf8').match(/<button\b[^>]*>/gs) ?? []
  return buttons.filter(button => !/onClick=|type="submit"/.test(button)).map(button => `${file}: ${button.replace(/\s+/g, ' ')}`)
})

if (missing.length) throw new Error(`Buttons without an action:\n${missing.join('\n')}`)
console.log('UI check passed: every button has an action.')
