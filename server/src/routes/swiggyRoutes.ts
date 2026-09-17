import { Router } from 'express';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';

const router = Router();
const swiggyClient = SwiggyMcpClient.getInstance();

function getUserId(req: any): string {
  return (req.query.userId as string) || (req.headers['x-user-id'] as string) || (req.user?.id as string) || 'default_user';
}

/**
 * GET /api/integrations/swiggy/connect
 * Initiates OAuth 2.1 + PKCE flow with Swiggy
 */
router.get('/connect', (req, res) => {
  try {
    const userId = getUserId(req);
    const { authUrl, state } = swiggyClient.createAuthorizationUrl(userId);

    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.json({ success: true, authUrl, state });
    }

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
  const userId = getUserId(req);

  if (error) {
    console.warn('Swiggy OAuth callback returned error:', error, error_description);
    return res.redirect(`/?integration=swiggy_error&error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code || !state) {
    return res.status(400).redirect('/?integration=swiggy_error&error=Missing+code+or+state');
  }

  try {
    await swiggyClient.handleCallback(String(code), String(state), userId);
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
    const userId = getUserId(req);
    const status = swiggyClient.getStatus(userId);
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
    const userId = getUserId(req);
    swiggyClient.disconnect(userId);
    res.json({ success: true, message: 'Swiggy disconnected successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/integrations/swiggy/addresses
 * Returns synced delivery addresses from official Swiggy get_addresses tool
 */
router.get('/addresses', async (req, res) => {
  try {
    const userId = getUserId(req);
    const status = swiggyClient.getStatus(userId);
    if (!status.connected) {
      return res.status(401).json({
        success: false,
        message: 'Swiggy is not connected. User OAuth authorization required.'
      });
    }

    const addresses = await swiggyClient.callMcpTool<any[]>('get_addresses', {}, userId);
    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
