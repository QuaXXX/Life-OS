import { parseCookies } from '../../src/services/calendar/serverCalendar.js';

export const config = { runtime: 'nodejs' };

export default function handler(req: any, res: any) {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies['life_os_refresh_token'];
  const calendarId = cookies['life_os_calendar_id'];

  const connected = Boolean(refreshToken);

  res.status(200).json({
    connected,
    calendarName: 'Life OS',
    calendarId: calendarId,
  });
}
