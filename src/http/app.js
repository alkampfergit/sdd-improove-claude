import express from 'express';

export function createApp({ service, staticDir }) {
  const app = express();

  // Middleware
  app.use(express.json());

  // Serve static files (React SPA build)
  if (staticDir) {
    app.use(express.static(staticDir));
  }

  // POST /api/links — create a short link
  app.post('/api/links', (req, res) => {
    const { url } = req.body;

    try {
      const result = service.createLink(url);

      // Get the origin from the request for shortUrl
      const origin = `${req.protocol}://${req.get('host')}`;
      const shortUrl = `${origin}/${result.code}`;

      const statusCode = result.isNewCode ? 201 : 200;
      res.status(statusCode).json({
        code: result.code,
        shortUrl,
        url: result.url,
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
      });
    }
  });

  // GET /api/links — list all links
  app.get('/api/links', (req, res) => {
    const links = service.listLinks();
    res.json(links);
  });

  // GET / — serve SPA
  app.get('/', (req, res) => {
    if (staticDir) {
      res.sendFile('index.html', { root: staticDir });
    } else {
      res.send('<html><body>URL Shortener</body></html>');
    }
  });

  // GET /:code — redirect (hot path, no write)
  // This route owns every single-segment path not matched above
  // Both unknown and malformed codes return 404
  app.get('/:code', (req, res) => {
    const { code } = req.params;

    const result = service.resolveCode(code);
    if (!result.found) {
      return res.status(404).send('Not found');
    }

    // 301 permanent redirect
    res.redirect(301, result.targetUrl);
  });

  return app;
}
