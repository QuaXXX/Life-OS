import { getOAuthClient, getRedirectUriForHost } from '../../src/services/calendar/serverCalendar.js';

export const config = { runtime: 'nodejs' };

export default function handler(req: any, res: any) {
  const host = req.headers.host;
  const redirectUri = getRedirectUriForHost(host);

  try {
    const oauth2Client = getOAuthClient(redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });

    res.redirect(302, authUrl);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to initiate Google OAuth' });
  }
}
