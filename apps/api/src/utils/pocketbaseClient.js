import Pocketbase from 'pocketbase';
import logger from './logger.js';

// ─── PocketBase Client ──────────────────────────────────────────────────────
// Lazy initialization — no health check or auth at import time.
// The self-executing IIFE was removed so the API can start without PocketBase.
// Route handlers that still depend on PocketBase will trigger auth on first request
// via the beforeSend hook. If PocketBase is down, those routes will fail gracefully.
// ────────────────────────────────────────────────────────────────────────────

const POCKETBASE_HOST = process.env.POCKETBASE_URL || 'http://localhost:8090';

const pocketbaseClient = new Pocketbase(POCKETBASE_HOST);

pocketbaseClient.autoCancellation(false);

let authPromise = null;

pocketbaseClient.beforeSend = async function (url, options) {
    if (url.includes('/api/collections/_superusers/auth-with-password')) {
        return { url, options };
    }

    if (!pocketbaseClient.authStore.isValid && !authPromise) {
        authPromise = pocketbaseClient.collection('_superusers').authWithPassword(
            process.env.PB_SUPERUSER_EMAIL,
            process.env.PB_SUPERUSER_PASSWORD,
        ).finally(() => {
            authPromise = null;
        });
    }

    if (authPromise) {
        try {
            await authPromise;
        } catch (err) {
            logger.warn(`[PB] Lazy auth failed (will retry on next request): ${err.message}`);
        }
    }

    if (pocketbaseClient.authStore.isValid && pocketbaseClient.authStore.token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = pocketbaseClient.authStore.token;
    }

    return { url, options };
};

export default pocketbaseClient;
export { pocketbaseClient };
