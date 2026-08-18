import { getOAuthClient, getRedirectUriForHost, getOrCreateDedicatedCalendarId } from '../../src/services/calendar/serverCalendar.js';
import { google } from 'googleapis';

export const config = { runtime: 'nodejs' };

export default async function handler(req: any, res: any) {
  const code = req.query.code || req.body?.code;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  const host = req.headers.host || 'localhost:5173';
  const redirectUri = getRedirectUriForHost(host);

  try {
    const oauth2Client = getOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // If we don't get a refresh token, it means the user previously authorized the app
      // and Google is only returning an access token. They must revoke access and re-auth,
      // or we must ensure prompt=consent is always passed (which we did).
      console.warn('No refresh token received from Google.');
    }

    // Automatically create or link the dedicated "Life OS" calendar
    let dedicatedCalendarId = '';
    try {
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      dedicatedCalendarId = await getOrCreateDedicatedCalendarId(calendar);
    } catch (e) {
      console.warn('Dedicated calendar creation warning during callback:', e);
    }

    // Prepare Cookies
    const isLocalhost = host.includes('localhost');
    const secureFlag = isLocalhost ? '' : 'Secure; ';
    const cookies: string[] = [];
    
    if (tokens.refresh_token) {
      cookies.push(`life_os_refresh_token=${tokens.refresh_token}; HttpOnly; ${secureFlag}Path=/; Max-Age=31536000; SameSite=Lax`);
    }
    if (dedicatedCalendarId) {
      cookies.push(`life_os_calendar_id=${dedicatedCalendarId}; HttpOnly; ${secureFlag}Path=/; Max-Age=31536000; SameSite=Lax`);
    }

    if (cookies.length > 0) {
      res.setHeader('Set-Cookie', cookies);
    }

    // Redirect to home page
    const destination = isLocalhost ? 'http://localhost:5173/' : `https://${host}/`;
    res.redirect(302, destination);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    res.status(500).json({ error: err.message || 'Failed to exchange token' });
  }
}
