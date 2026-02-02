export default async function handler(req, res) {
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
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json');
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
