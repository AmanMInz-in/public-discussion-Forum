const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'threads.json')

function ensureData(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)
  if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8')
}

function readData(){ ensureData(); return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'[]') }
function writeData(data){ ensureData(); fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8') }

const app = express()
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname)))

app.get('/api/threads', (req, res) => {
  try{ res.json(readData()) } catch(e){ res.status(500).json({error:'failed to read data'}) }
})

app.post('/api/threads', (req, res) => {
  const { title, body, author } = req.body || {}
  if(!title) return res.status(400).json({ error: 'title required' })
  const threads = readData()
  const t = {
    id: Date.now().toString(36),
    title: String(title),
    body: String(body||''),
    author: author ? String(author) : 'anonymous',
    createdAt: new Date().toISOString(),
    replies: []
  }
  threads.push(t)
  writeData(threads)
  res.json(t)
})

app.post('/api/threads/:id/replies', (req, res) => {
  const { id } = req.params;
  const { text, author } = req.body || {}
  if(!text) return res.status(400).json({ error: 'text required' })
  const threads = readData()
  const t = threads.find(x => x.id === id)
  if(!t) return res.status(404).json({ error: 'thread not found' })
  t.replies = t.replies || []
  t.replies.push({ author: author ? String(author) : 'anonymous', text: String(text), createdAt: new Date().toISOString() })
  writeData(threads)
  res.json({ ok: true })
})

// Moderation: approve a thread (sets `approved` flag)
app.post('/api/threads/:id/approve', (req, res) => {
  const { id } = req.params
  const threads = readData()
  const t = threads.find(x => x.id === id)
  if(!t) return res.status(404).json({ error: 'thread not found' })
  t.approved = true
  writeData(threads)
  res.json(t)
})

// Moderation: delete a thread
app.delete('/api/threads/:id', (req, res) => {
  const { id } = req.params
  const threads = readData()
  const idx = threads.findIndex(x => x.id === id)
  if(idx === -1) return res.status(404).json({ error: 'thread not found' })
  threads.splice(idx, 1)
  writeData(threads)
  res.json({ ok: true })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`))
