import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function ngrokPlugin(authtoken, domain) {
    return {
        name: 'vite-plugin-ngrok',
        apply: 'serve',
        async configureServer(server) {
            if (!authtoken) return;
            server.httpServer?.once('listening', async () => {
                try {
                    const ngrok = await import('@ngrok/ngrok');
                    const listener = await ngrok.forward({
                        addr: 5173,
                        authtoken,
                        ...(domain ? { domain } : {}),
                    });
                    server.config.logger.info(
                        `\n  ➜  ngrok:   ${listener.url()}\n`,
                        { clear: false }
                    );
                } catch (e) {
                    server.config.logger.error(`ngrok: ${e.message}`);
                }
            });
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), ''); // load ALL .env vars (incl. non-VITE_)
    return {
        plugins: [
            react(),
            ngrokPlugin(env.NGROK_AUTHTOKEN, env.VITE_NGROK_DOMAIN),
        ],
        server: {
            host: true,
            // Hosts the dev server will answer to once it is exposed publicly.
            // Set PUBLIC_HOST=yourdomain.com in .env — the leading dot also
            // covers every parish subdomain (sjp.yourdomain.com and friends).
            allowedHosts: [
                'disband-radish-issue.ngrok-free.dev',
                ...(env.PUBLIC_HOST ? [`.${env.PUBLIC_HOST}`] : []),
            ],
            proxy: {
                /* PayMongo posts here from the internet, so the path has to
                   reach Express through the same tunnel the site uses. No
                   rewrite: the URL must stay /webhook/paymongo, and the body
                   must pass through untouched — the HMAC signature is computed
                   over the exact raw bytes. */
                '/webhook': {
                    target: 'http://127.0.0.1:3000',
                    changeOrigin: true,
                },
                '/api': {
                    target: 'http://127.0.0.1:3000',
                    changeOrigin: true,
                    rewrite: path => path.replace(/^\/api/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq, req) => {
                            proxyReq.setHeader('origin', 'http://localhost:5173');

                            // changeOrigin rewrites Host to the API's own address, so
                            // Express would see 127.0.0.1 and resolve every parish
                            // subdomain as the platform host. Pass the browser's host
                            // through instead — resolveTenant and /site both read
                            // x-forwarded-host first. Always overwritten, never
                            // forwarded from the client, so it cannot be spoofed.
                            proxyReq.setHeader('x-forwarded-host', req.headers.host || '');
                        });
                    }
                }
            }
        }
    };
});
