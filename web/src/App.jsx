import { useState, useEffect } from 'react';

export default function App() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [lastCreated, setLastCreated] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load existing links on mount
  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      setLoading(true);
      const response = await fetch('/api/links');
      if (response.ok) {
        const data = await response.json();
        setLinks(data);
      }
    } catch (err) {
      console.error('Failed to load links:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLastCreated(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create short link');
        return;
      }

      const data = await response.json();
      setUrl('');
      setLastCreated(data);

      // Reload links list
      await loadLinks();
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="container">
      <h1>URL Shortener</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="url">Enter a URL to shorten</label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/very/long/url"
            disabled={lastCreated !== null}
          />
          {error && <div className="error">{error}</div>}
        </div>

        <button type="submit" disabled={lastCreated !== null}>
          Create Short Link
        </button>
      </form>

      {lastCreated && (
        <div className="success">
          <div>Your short link is ready!</div>
          <div style={{ marginTop: '12px' }}>
            <div className="link-code">
              <span className="short-code">{lastCreated.code}</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(lastCreated.shortUrl)}
              >
                Copy
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {lastCreated.shortUrl}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading links...</div>
      ) : (
        <div className="links-section">
          <h2>Created Links</h2>
          {links.length === 0 ? (
            <div className="empty-message">No links created yet. Create one above!</div>
          ) : (
            <ul className="links-list">
              {links.map((link) => (
                <li key={link.code} className="link-item">
                  <div className="link-code">
                    <span className="link-code-text">{link.code}</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(link.shortUrl)}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="link-url">{link.url}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
