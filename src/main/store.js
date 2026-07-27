import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const userDataPath = app.getPath('userData')
const storePath = join(userDataPath, 'liferpg-data.json')

const defaults = {
  habits: [],
  xp: 0,
  settings: { excelPath: '', autoSaveInterval: 30 },
  lastUpdated: '',
  medicines: [],
  routineBlocks: [],
  dailyLogs: {}
}

function readStore() {
  try {
    if (existsSync(storePath)) {
      const raw = readFileSync(storePath, 'utf-8')
      return { ...defaults, ...JSON.parse(raw) }
    }
  } catch (e) {
    console.error('Failed to read store:', e)
  }
  return { ...defaults }
}

function writeStore(data) {
  try {
    const dir = userDataPath
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write store:', e)
  }
}

let cache = null

export function getStoreData() {
  if (!cache) cache = readStore()
  return { ...cache }
}

export function setStoreData(key, value) {
  if (!cache) cache = readStore()
  cache[key] = value
  cache.lastUpdated = new Date().toISOString()
  writeStore(cache)
}

export function resetStore() {
  cache = { ...defaults }
  writeStore(cache)
}
