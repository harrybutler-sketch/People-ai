// Vercel Serverless Function: api/apify.js
// Proxies requests to Apify securely using the APIFY_TOKEN environment variable.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.APIFY_TOKEN;

  // 1. Check if token is configured in Vercel env variables
  if (req.method === 'GET' && req.query.action === 'check') {
    return res.status(200).json({ hasToken: !!token });
  }

  if (!token) {
    return res.status(401).json({ error: 'APIFY_TOKEN is not configured on Vercel environment variables.' });
  }

  try {
    // 2. Launch Run (POST)
    if (req.method === 'POST') {
      const { actor, query, maxItems } = req.body || {};
      if (!actor || !query) {
        return res.status(400).json({ error: 'Missing actor type or query' });
      }

      const actorName = actor === 'linkedin' ? 'apify/linkedin-post-scraper' : 'apify/google-news-scraper';
      
      let actorInput = {};
      if (actor === 'linkedin') {
        actorInput = {
          "queries": query.split(',').map(q => q.trim()),
          "maxItems": parseInt(maxItems, 10) || 10,
          "deepScrape": false,
          "proxy": { "useApifyProxy": true }
        };
      } else {
        actorInput = {
          "query": query,
          "maxItems": parseInt(maxItems, 10) || 10,
          "sortBy": "relevance",
          "language": "en"
        };
      }

      const response = await fetch(`https://api.apify.com/v2/acts/${actorName}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorInput)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    }

    // 3. Poll Run Status (GET)
    if (req.method === 'GET' && req.query.action === 'status') {
      const { runId } = req.query;
      if (!runId) return res.status(400).json({ error: 'Missing runId' });

      const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    }

    // 4. Fetch Dataset Items (GET)
    if (req.method === 'GET' && req.query.action === 'dataset') {
      const { datasetId } = req.query;
      if (!datasetId) return res.status(400).json({ error: 'Missing datasetId' });

      const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Invalid action or request method' });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
