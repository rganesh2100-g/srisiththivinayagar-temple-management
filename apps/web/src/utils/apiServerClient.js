import pb from '@/lib/pocketbaseClient.js';

/**
 * API Server Client
 * 
 * Utility for making requests to the Express.js API server.
 * Automatically adds the /hcgi/api base URL prefix and securely injects the JWT token
 * in the Authorization header.
 */

const API_BASE_URL = '/hcgi/api';

export const apiServerClient = {
  /**
   * Make a fetch request to the API server
   * @param {string} endpoint - API endpoint (e.g., '/donations')
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
   */
  fetch: async (endpoint, options = {}) => {
    // Remove any legacy ?token= query parameters to prevent leakage in URLs
    let cleanEndpoint = endpoint.replace(/([?&])token=[^&]*(&|$)/, '$1');
    // Clean up trailing ? or & if the token was the last/only query parameter
    cleanEndpoint = cleanEndpoint.replace(/[?&]$/, '');

    const url = `${API_BASE_URL}${cleanEndpoint}`;
    
    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Inject Authorization header safely from PocketBase auth store
    // This avoids violating React Hook rules while maintaining global transparency
    if (pb.authStore.isValid && pb.authStore.token) {
      headers['Authorization'] = `Bearer ${pb.authStore.token}`;
      console.log(`[API Client] Added Authorization header for: ${cleanEndpoint}`); // For testing verification
    } else {
      console.log(`[API Client] Unauthenticated request to: ${cleanEndpoint}`);
    }

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  },

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Response>}
   */
  get: async (endpoint) => {
    return apiServerClient.fetch(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise<Response>}
   */
  post: async (endpoint, data) => {
    return apiServerClient.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise<Response>}
   */
  patch: async (endpoint, data) => {
    return apiServerClient.fetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Response>}
   */
  delete: async (endpoint) => {
    return apiServerClient.fetch(endpoint, {
      method: 'DELETE',
    });
  },
};

export default apiServerClient;