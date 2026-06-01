import Pocketbase from 'pocketbase';

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const POCKETBASE_API_URL = isLocalhost
  ? 'http://localhost:8090'
  : '/hcgi/platform';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
