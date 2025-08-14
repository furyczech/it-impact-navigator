import express from 'express';
import cors from 'cors';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'data.json');

function ensureDataFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    const initial = {
      components: [],
      dependencies: [],
      workflows: []
    };
    writeFileSync(dataFile, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

ensureDataFile();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/data', (_req, res) => {
  try {
    const raw = readFileSync(dataFile, 'utf-8');
    const json = JSON.parse(raw);
    res.json(json);
  } catch (e) {
    console.error('Failed to read data.json:', e);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/data', (req, res) => {
  const { components, dependencies, workflows } = req.body || {};
  if (!components || !dependencies || !workflows) {
    return res.status(400).json({ error: 'Invalid payload: must include components, dependencies, workflows' });
  }
  try {
    writeFileSync(dataFile, JSON.stringify({ components, dependencies, workflows }, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to write data.json:', e);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.listen(PORT, () => {
  console.log(`JSON DB server listening on http://localhost:${PORT}`);
});
