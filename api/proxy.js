export default async function handler(req, res) {
    const url = req.query.url;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
    }
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const contentType = response.headers.get('content-type');
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        if (contentType && contentType.includes('text/html')) {
            const html = await response.text();
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } else if (contentType && (contentType.includes('image') || contentType.includes('application/octet-stream'))) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            res.send(Buffer.from(buffer));
        } else {
            const text = await response.text();
            res.setHeader('Content-Type', contentType || 'text/plain');
            res.send(text);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
