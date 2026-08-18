import { clearStoredTokens } from '../../src/services/calendar/serverCalendar';

export const config = { runtime: 'nodejs' };

export default function handler(_req: any, res: any) {
  clearStoredTokens();
  res.status(200).json({ connected: false });
}
