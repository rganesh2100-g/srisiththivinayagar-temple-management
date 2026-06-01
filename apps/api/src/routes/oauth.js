import 'dotenv/config';
import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

// Allowed domains for OAuth
const ALLOWED_DOMAINS = [
  '5e34f49c-00e8-4e55-9306-3c6d20c04e0a.app-preview.com',
  'srisiththivinayagar.com',
];

// Helper function to extract domain from request
const extractDomain = (req) => {
  const host = req.get('host');
  if (!host) {
    throw new Error('Unable to determine request domain');
  }
  // Remove port if present
  return host.split(':')[0];
};

// Helper function to validate domain
const isAllowedDomain = (domain) => {
  return ALLOWED_DOMAINS.some(allowedDomain => 
    domain === allowedDomain || domain.endsWith('.' + allowedDomain)
  );
};

// Helper function to construct redirect URI
const constructRedirectUri = (domain) => {
  return `https://${domain}/hcgi/platform/api/oauth2-redirect`;
};

// GET /oauth/config - Get OAuth configuration with dynamic redirect URI
router.get('/config', async (req, res) => {
  logger.info('OAuth config request received');

  // Extract domain from request
  const domain = extractDomain(req);
  logger.info(`Request domain: ${domain}`);

  // Validate domain is allowed
  if (!isAllowedDomain(domain)) {
    logger.warn(`Unauthorized domain attempted: ${domain}`);
    return res.status(400).json({
      error: 'Unauthorized domain',
      message: `Domain ${domain} is not authorized for OAuth`,
    });
  }

  // Validate environment variables
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('Missing OAuth environment variables');
    throw new Error('OAuth credentials not configured');
  }

  // Construct redirect URI for current domain
  const redirectUri = constructRedirectUri(domain);
  logger.info(`Constructed redirect URI: ${redirectUri}`);

  // Return OAuth configuration
  const oauthConfig = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  };

  logger.info(`OAuth config returned for domain: ${domain}`);

  res.json(oauthConfig);
});

// GET /oauth/authorize - Initiate OAuth flow
router.get('/authorize', async (req, res) => {
  logger.info('OAuth authorize request received');

  // Extract domain from request
  const domain = extractDomain(req);
  logger.info(`Request domain: ${domain}`);

  // Validate domain is allowed
  if (!isAllowedDomain(domain)) {
    logger.warn(`Unauthorized domain attempted: ${domain}`);
    return res.status(400).json({
      error: 'Unauthorized domain',
      message: `Domain ${domain} is not authorized for OAuth`,
    });
  }

  // Validate environment variables
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

  if (!clientId) {
    logger.error('Missing GOOGLE_OAUTH_CLIENT_ID');
    throw new Error('OAuth client ID not configured');
  }

  // Construct redirect URI for current domain
  const redirectUri = constructRedirectUri(domain);
  logger.info(`Constructed redirect URI: ${redirectUri}`);

  // Build Google OAuth authorization URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.append('client_id', clientId);
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid profile email');
  googleAuthUrl.searchParams.append('access_type', 'offline');
  googleAuthUrl.searchParams.append('prompt', 'consent');

  logger.info(`OAuth authorization URL constructed for domain: ${domain}`);

  res.json({
    authorization_url: googleAuthUrl.toString(),
    domain,
  });
});

// POST /oauth/token - Exchange authorization code for tokens
router.post('/token', async (req, res) => {
  const { code } = req.body;

  // Input validation
  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code',
      message: 'code parameter is required',
    });
  }

  logger.info('OAuth token exchange request received');

  // Extract domain from request
  const domain = extractDomain(req);
  logger.info(`Request domain: ${domain}`);

  // Validate domain is allowed
  if (!isAllowedDomain(domain)) {
    logger.warn(`Unauthorized domain attempted: ${domain}`);
    return res.status(400).json({
      error: 'Unauthorized domain',
      message: `Domain ${domain} is not authorized for OAuth`,
    });
  }

  // Validate environment variables
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('Missing OAuth environment variables');
    throw new Error('OAuth credentials not configured');
  }

  // Construct redirect URI for current domain
  const redirectUri = constructRedirectUri(domain);
  logger.info(`Constructed redirect URI: ${redirectUri}`);

  // Exchange authorization code for tokens
  logger.info(`Exchanging authorization code for tokens`);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    logger.error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    throw new Error(`Failed to exchange authorization code: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  logger.info('Authorization code exchanged successfully for tokens');

  res.json({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type,
    id_token: tokenData.id_token,
  });
});

// GET /oauth/userinfo - Get user info from Google using access token
router.get('/userinfo', async (req, res) => {
  const { access_token } = req.query;

  // Input validation
  if (!access_token) {
    return res.status(400).json({
      error: 'Missing access token',
      message: 'access_token parameter is required',
    });
  }

  logger.info('OAuth userinfo request received');

  // Extract domain from request
  const domain = extractDomain(req);
  logger.info(`Request domain: ${domain}`);

  // Validate domain is allowed
  if (!isAllowedDomain(domain)) {
    logger.warn(`Unauthorized domain attempted: ${domain}`);
    return res.status(400).json({
      error: 'Unauthorized domain',
      message: `Domain ${domain} is not authorized for OAuth`,
    });
  }

  // Fetch user info from Google
  logger.info('Fetching user info from Google');

  const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    logger.error(`Failed to fetch user info: ${userInfoResponse.status} ${userInfoResponse.statusText}`);
    throw new Error(`Failed to fetch user information: ${userInfoResponse.statusText}`);
  }

  const userInfo = await userInfoResponse.json();
  logger.info(`User info retrieved: ${userInfo.email}`);

  res.json({
    sub: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    email_verified: userInfo.email_verified,
  });
});

export default router;