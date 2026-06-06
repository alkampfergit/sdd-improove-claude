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

  // GET /:code — redirect (will be added in T-09)
  // GET /api/links — list links (will be added in T-09)
  // GET / and static SPA (will be added in T-09)

  return app;
}
