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
      // Offline / not connected fallback
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

  const hasRemindersOrEvents = todayEvents.length > 0;

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3.5">
        {/* Brand logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-inner">
            {/* Minimalist Neural Spark / Brain glyph */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a5 5 0 0 0-4.5 2.8A4 4 0 0 0 3 9a4 4 0 0 0 1.5 3.1A3.5 3.5 0 0 0 4 14.5 3.5 3.5 0 0 0 7 18h1V9.5a4 4 0 0 1 4-4" />
              <path d="M12 2a5 5 0 0 1 4.5 2.8A4 4 0 0 1 21 9a4 4 0 0 1-1.5 3.1 3.5 3.5 0 0 1 .5 2.4A3.5 3.5 0 0 1 17 18h-1V9.5a4 4 0 0 0-4-4" />
              <path d="M8 18v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2" />
            </svg>
          </div>
          <span className="text-white text-[16.5px] font-semibold tracking-tight leading-none select-none">
            Life OS
          </span>
        </div>

        {/* Notification Bell with interactive Drawer */}
        <button
          onClick={handleToggleNotifications}
          className="relative w-9 h-9 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center transition-transform duration-100 active:scale-90 shrink-0 cursor-pointer"
          aria-label="Notifications and Reminders"
          title="Today's Reminders & Briefing"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {/* Subtle indicator dot when active events exist */}
          {hasRemindersOrEvents && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-accent)] rounded-full shadow-[0_0_6px_rgba(93,202,165,0.8)]" />
          )}
        </button>
      </header>

      {/* Notifications Drawer / Bottom Sheet */}
      {isNotificationsOpen && (
        <div className="absolute inset-0 z-[70] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-[4px] animate-in fade-in duration-200"
            onClick={() => setIsNotificationsOpen(false)}
          />

          <div className="relative w-full bg-[#161a22] border-t border-white/10 rounded-t-[32px] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-250 flex flex-col gap-4 max-h-[75%] overflow-y-auto scrollbar-hide">
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-1" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[17px] font-semibold text-white tracking-tight">Today's Briefing</h3>
                <p className="text-[12px] text-white/40 mt-0.5">{formatDateRelative(formatDateISO(new Date()))}</p>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* List of Today's items */}
            {loading ? (
              <div className="flex flex-col gap-2.5 py-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : todayEvents.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-11 h-11 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-white/85 mb-1">All caught up</p>
                <p className="text-[12px] text-white/35 max-w-[220px]">No pending reminders or scheduled events for today.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                {todayEvents.map((evt) => (
                  <div key={evt.id} className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-white/90 truncate">{evt.title}</p>
                        {evt.description && <p className="text-[11.5px] text-white/35 truncate">{evt.description}</p>}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-white/60 shrink-0">
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
