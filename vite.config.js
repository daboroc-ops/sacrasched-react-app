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
            allowedHosts: ['disband-radish-issue.ngrok-free.dev'],
            proxy: {
                '/api': {
                    target: 'http://127.0.0.1:3000',
                    changeOrigin: true,
                    rewrite: path => path.replace(/^\/api/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', (proxyReq) => {
                            proxyReq.setHeader('origin', 'http://localhost:5173');
                        });
                    }
                }
            }
        }
    };
});
