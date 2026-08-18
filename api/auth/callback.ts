import { getOAuthClient, getRedirectUriForHost, saveStoredTokens, getOrCreateDedicatedCalendarId } from '../../src/services/calendar/serverCalendar';
import { google } from 'googleapis';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const code = req.query.code || req.body?.code;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  const host = req.headers.host;
  const redirectUri = getRedirectUriForHost(host);

  try {
    const oauth2Client = getOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    saveStoredTokens({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      scope: tokens.scope || undefined,
      token_type: tokens.token_type || undefined,
      expiry_date: tokens.expiry_date || undefined,
    });

    // Automatically create or link the dedicated "Life OS" calendar
    try {
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await getOrCreateDedicatedCalendarId(calendar);
    } catch (e) {
      console.warn('Dedicated calendar creation warning during callback:', e);
    }

    // Redirect to home page
    const destination = host && host.includes('vercel.app')
      ? 'https://life-os-azure-pi.vercel.app/'
      : 'http://localhost:5173/';

    res.redirect(302, destination);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    res.status(500).json({ error: err.message || 'Failed to exchange token' });
  }
}
