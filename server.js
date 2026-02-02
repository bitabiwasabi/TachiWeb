import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8756;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/sites', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sites.html'));
});

app.get('/api', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'api.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/reader', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reader.html'));
});

app.get('/data', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'data.html'));
});

// Proxy endpoint for fetching external content (to avoid CORS)
app.get('/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
    }
    
    try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
            const html = await response.text();
            res.set('Content-Type', 'text/html');
            res.send(html);
        } else {
            const buffer = await response.arrayBuffer();
            res.set('Content-Type', contentType || 'application/octet-stream');
            res.send(Buffer.from(buffer));
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GitHub API proxy for fetching repo contents
app.get('/github-proxy', async (req, res) => {
    const { owner, repo, path: filePath } = req.query;
    
    if (!owner || !repo) {
        return res.status(400).json({ error: 'Owner and repo parameters required' });
    }
    
    try {
        const apiUrl = filePath 
            ? `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
            : `https://api.github.com/repos/${owner}/${repo}/contents`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TachiOnline'
            }
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`TachiOnline server running at http://localhost:${PORT}`);
});
