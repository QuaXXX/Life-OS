export const config = { runtime: 'nodejs' };

export default function handler(req: any, res: any) {
  const host = req.headers.host || 'localhost:5173';
  const isLocalhost = host.includes('localhost');
  const secureFlag = isLocalhost ? '' : 'Secure; ';

  res.setHeader('Set-Cookie', [
    `life_os_refresh_token=; HttpOnly; ${secureFlag}Path=/; Max-Age=0; SameSite=Lax`,
    `life_os_calendar_id=; HttpOnly; ${secureFlag}Path=/; Max-Age=0; SameSite=Lax`
  ]);

  res.status(200).json({ connected: false });
}
