/**
 * Netlify Serverless Function — YouTube song search
 *
 * Keeps YOUTUBE_API_KEY server-side (never exposed to browser).
 *
 * Setup:
 *   1. Netlify dashboard → vibecheck-vb → Site configuration
 *      → Environment variables → Add variable:
 *        Key:   YOUTUBE_API_KEY
 *        Value: <your YouTube Data API v3 key>
 *   2. The key is also read from a local .env file when running
 *      `netlify dev` for local development.
 *
 * Called by frontend as:
 *   GET /.netlify/functions/yt-search?q=<search+query>
 *
 * Returns JSON: { videoId, title }
 */

exports.handler = async (event) => {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  /* Handle CORS pre-flight */
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const { q } = event.queryStringParameters || {};
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'YOUTUBE_API_KEY is not set. Add it to Netlify environment variables.',
      }),
    };
  }

  if (!q) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing query parameter ?q=' }),
    };
  }

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet` +
    `&type=video` +
    `&videoCategoryId=10` +          /* Music category */
    `&videoEmbeddable=true` +        /* Must be embeddable */
    `&q=${encodeURIComponent(q)}` +
    `&maxResults=5` +
    `&key=${apiKey}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: data.error.message || 'YouTube API error' }),
      };
    }

    /* Find first result that has a video ID */
    const item = (data.items || []).find(i => i.id?.videoId);
    if (!item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No embeddable video found for this query.' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        videoId: item.id.videoId,
        title:   item.snippet.title,
        channel: item.snippet.channelTitle,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Fetch failed: ${err.message}` }),
    };
  }
};
