import http from 'http';

const server = http.createServer((req, res) => {
	const options = {
		hostname: '127.0.0.1',
		port: 8790,
		path: req.url,
		method: req.method,
		headers: {
			...req.headers,
			host: req.headers.host || '127.0.0.1:8790'
		}
	};

	const proxyReq = http.request(options, (proxyRes) => {
		res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
		proxyRes.pipe(res, { end: true });
	});

	proxyReq.on('error', (err) => {
		res.writeHead(502, { 'Content-Type': 'text/plain' });
		res.end('Proxy Error: ' + err.message);
	});

	req.pipe(proxyReq, { end: true });
});

server.listen(5173, '0.0.0.0', () => {
	console.log('Proxy forwarder listening on 0.0.0.0:5173 -> 127.0.0.1:8790');
});
