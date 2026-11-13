import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  server: {
    host: true,
    port: 5174
  },
  plugins: [
    {
      name: 'gallery-persistence-api',
      configureServer(server) {
        server.middlewares.use('/api/save-gallery', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const publicDir = path.resolve(process.cwd(), 'public');
                if (!fs.existsSync(publicDir)) {
                  fs.mkdirSync(publicDir, { recursive: true });
                }
                const filePath = path.join(publicDir, 'gallery-data.json');
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Rasmlar barcha qurilmalar uchun saqlandi!' }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            res.writeHead(405).end();
          }
        });
      }
    }
  ]
});
