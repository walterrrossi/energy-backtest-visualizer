import http from 'node:http';

const TARGET_PORT = 8765;

http.createServer((req, res) => {
  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${TARGET_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway — dev server not running on port ' + TARGET_PORT);
  });

  req.pipe(proxyReq);
}).listen(80, () => {
  console.log(`Reverse proxy: http://energy-viz.localhost → http://localhost:${TARGET_PORT}`);
});
