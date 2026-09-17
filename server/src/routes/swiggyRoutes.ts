import { Router } from 'express';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';

const router = Router();
const swiggyClient = SwiggyMcpClient.getInstance();

/**
 * GET /api/integrations/swiggy/connect
 * Initiates OAuth 2.1 + PKCE flow with Swiggy
 */
router.get('/connect', (req, res) => {
  try {
    const { authUrl, state } = swiggyClient.createAuthorizationUrl();

    // If client requested JSON (e.g. from single-page app button)
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.json({ success: true, authUrl, state });
    }

    // Direct browser redirect to Swiggy consent screen
    return res.redirect(authUrl);
  } catch (err: any) {
    console.error('Swiggy connect error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to initiate Swiggy connection' });
  }
});

/**
 * GET /api/integrations/swiggy/callback
 * Handles OAuth 2.1 redirect from Swiggy
 */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.warn('Swiggy OAuth callback returned error:', error, error_description);
    return res.redirect(`/?integration=swiggy_error&error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code || !state) {
    return res.status(400).redirect('/?integration=swiggy_error&error=Missing+code+or+state');
  }

  try {
    await swiggyClient.handleCallback(String(code), String(state));
    // Successful authentication: redirect back to admin or integrations view
    res.redirect('/?integration=swiggy_success');
  } catch (err: any) {
    console.error('Swiggy callback verification failed:', err);
    res.redirect(`/?integration=swiggy_error&error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});

/**
 * GET /api/integrations/swiggy/status
 * Returns current Swiggy connection and integration status
 */
router.get('/status', (req, res) => {
  try {
    const status = swiggyClient.getStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/integrations/swiggy/disconnect
 * Disconnects and clears Swiggy session
 */
router.post('/disconnect', (req, res) => {
  try {
    swiggyClient.disconnect();
    res.json({ success: true, message: 'Swiggy disconnected successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/integrations/swiggy/addresses
 * Fetches real saved addresses from Swiggy for the authenticated user
 */
router.get('/addresses', async (req, res) => {
  try {
    const address = await swiggyClient.syncPrimaryAddress();
    res.json({ success: true, data: address });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
