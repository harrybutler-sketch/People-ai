// Vercel Serverless Function: api/apify.js
// Proxies requests to Apify and SheetDB securely using environment variables.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.APIFY_TOKEN || process.env.apify;
  const sheetdbUrl = process.env.SHEETDB_URL || process.env.sheetdb || process.env.GoogleSheetsapi || process.env.googlesheetsapi;

  // 1. Check if tokens are configured in Vercel env variables
  if (req.method === 'GET' && req.query.action === 'check') {
    return res.status(200).json({ 
      hasToken: !!token, 
      hasSheetdb: !!sheetdbUrl 
    });
  }

  // 2. Load Sheet data from SheetDB
  if (req.method === 'GET' && req.query.action === 'load_sheet') {
    if (!sheetdbUrl) {
      return res.status(400).json({ error: 'SheetDB URL is not configured on Vercel.' });
    }
    try {
      const response = await fetch(sheetdbUrl);
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch from SheetDB', message: err.message });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'APIFY_TOKEN or apify environment variable is not configured on Vercel.' });
  }

  try {
    // 3. POST Actions
    if (req.method === 'POST') {
      const body = req.body || {};
      
      // Save to Google Sheets action
      if (req.query.action === 'save_to_sheet' || body.action === 'save_to_sheet') {
        if (!sheetdbUrl) {
          return res.status(400).json({ error: 'SheetDB URL is not configured on Vercel.' });
        }
        
        const response = await fetch(sheetdbUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: body.data })
        });
        
        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data);
      }

      // Default: Launch Run
      const { actor, query, maxItems } = body;
      if (!actor || !query) {
        return res.status(400).json({ error: 'Missing actor type or query' });
      }

      const actorName = actor === 'linkedin' ? 'harvestapi~linkedin-post-search' : 'crawlerbros~google-news-scraper';
      
      let actorInput = {};
      if (actor === 'linkedin') {
        // harvestapi/linkedin-post-search expects "keyword" (string) and "maxPosts" (integer)
        const formattedQuery = query.includes(',')
          ? query.split(',').map(q => {
              const trimmed = q.trim();
              return trimmed.includes(' ') ? `"${trimmed}"` : trimmed;
            }).join(' OR ')
          : query;

        actorInput = {
          "keyword": formattedQuery,
          "maxPosts": parseInt(maxItems, 10) || 10,
          "sort": "date"
        };
      } else {
        // crawlerbros/google-news-scraper expects "queries" (array of strings) and "maxResultsPerQuery" (integer)
        actorInput = {
          "queries": query.split(',').map(q => q.trim()),
          "maxResultsPerQuery": parseInt(maxItems, 10) || 10,
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

    // 4. Poll Run Status (GET)
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

    // 5. Fetch Dataset Items (GET)
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
