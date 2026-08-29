import { useState, useEffect, useCallback } from 'react';
import { calendarClient } from '../../services/calendar/CalendarClient';
import type { CalendarEvent } from '../../services/calendar/types';
import { formatTime12h, formatDateISO, formatDateRelative } from '../../utils/dateTime';
import { sensory } from '../../utils/sensory';

export function Header() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodayBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = formatDateISO(new Date());
      const events = await calendarClient.getEvents({ startDate: todayStr, endDate: todayStr });
      setTodayEvents(events);
    } catch {
      setTodayEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayBriefing();
  }, [loadTodayBriefing]);

  const handleToggleNotifications = () => {
    sensory.tapLight();
    setIsNotificationsOpen((prev) => !prev);
    if (!isNotificationsOpen) {
      loadTodayBriefing();
    }
  };

  const hasItems = todayEvents.length > 0;

  return (
    <>
      <header className="flex items-center justify-between px-4 py-4">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Left hemisphere */}
              <path d="M12 2a5 5 0 0 0-4.5 2.8A4 4 0 0 0 3 9a4 4 0 0 0 1.5 3.1A3.5 3.5 0 0 0 4 14.5 3.5 3.5 0 0 0 7 18h1V9.5a4 4 0 0 1 4-4" />
              {/* Right hemisphere */}
              <path d="M12 2a5 5 0 0 1 4.5 2.8A4 4 0 0 1 21 9a4 4 0 0 1-1.5 3.1 3.5 3.5 0 0 1 .5 2.4A3.5 3.5 0 0 1 17 18h-1V9.5a4 4 0 0 0-4-4" />
              {/* Stem */}
              <path d="M8 18v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2" />
              {/* Sulci */}
              <path d="M7 11c-1 0-1.5-.5-1.5-1" />
              <path d="M6.5 14c-.8 0-1.3-.4-1.4-1" />
              <path d="M17 11c1 0 1.5-.5 1.5-1" />
              <path d="M17.5 14c.8 0 1.3-.4 1.4-1" />
            </svg>
          </div>
          <span className="text-[var(--color-text)] text-lg font-semibold tracking-wide leading-none">
            Life OS
          </span>
        </div>

        {/* Bell */}
        <button
          onClick={handleToggleNotifications}
          className="relative w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center transition-transform duration-100 active:scale-90 shrink-0 cursor-pointer"
          aria-label="Notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {hasItems && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[var(--color-danger)] rounded-full border-2 border-[var(--color-bg)]" />
          )}
        </button>
      </header>

      {/* Notifications sheet */}
      {isNotificationsOpen && (
        <div className="absolute inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsNotificationsOpen(false)} />

          <div className="relative bg-[var(--color-surface)] rounded-t-3xl px-5 pt-4 pb-8 flex flex-col gap-4 max-h-[70%] overflow-y-auto scrollbar-hide">
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-white tracking-tight">Today</h3>
                <p className="text-[12px] text-[var(--color-muted)] mt-0.5">{formatDateRelative(formatDateISO(new Date()))}</p>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="w-8 h-8 rounded-lg bg-[var(--color-bg)] text-[var(--color-muted)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2 py-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-[var(--color-bg)] animate-pulse" />
                ))}
              </div>
            ) : todayEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[14px] font-medium text-white/80 mb-0.5">All caught up</p>
                <p className="text-[12px] text-[var(--color-muted)]">Nothing scheduled for today.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {todayEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0" />
                      <p className="text-[13px] font-medium text-white/90 truncate">{evt.title}</p>
                    </div>
                    <span className="text-[12px] font-semibold text-[var(--color-muted)] shrink-0">
                      {evt.startTime && evt.startTime !== '00:00' ? formatTime12h(evt.startTime) : 'All Day'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
