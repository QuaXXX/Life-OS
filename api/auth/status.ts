import { loadStoredTokens } from '../../src/services/calendar/serverCalendar';

export const config = { runtime: 'nodejs' };

export default function handler(_req: any, res: any) {
  const tokens = loadStoredTokens();
  const connected = Boolean(tokens && tokens.refresh_token);

  res.status(200).json({
    connected,
    calendarName: 'Life OS',
    calendarId: tokens?.calendar_id,
  });
}
