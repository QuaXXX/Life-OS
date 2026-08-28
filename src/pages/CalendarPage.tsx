import { useState, useEffect, useCallback } from 'react';
import { calendarClient } from '../services/calendar/CalendarClient';
import type { CalendarEvent, AuthStatus } from '../services/calendar/types';
import { formatTime12h, formatDateRelative, addDays, formatDateISO } from '../utils/dateTime';
import { showToast } from '../utils/toast';
import { sensory } from '../utils/sensory';

interface PageProps {
  onBack: () => void;
}

// Color map matching Google Calendar colorIds
const colorMap: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
};

function getEventColor(colorId?: string): string {
  return colorMap[colorId || '1'] || colorMap['1'];
}

export function CalendarPage({ onBack }: PageProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const checkAuth = useCallback(async () => {
    setLoadingStatus(true);
    const status = await calendarClient.getStatus();
    setAuthStatus(status);
    setLoadingStatus(false);
  }, []);

  const loadEvents = useCallback(async () => {
    if (!authStatus.connected) return;
    setLoadingEvents(true);
    try {
      const data = await calendarClient.getEvents({
        startDate: selectedDate,
        endDate: selectedDate,
      });
      setEvents(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load events', 'error');
    } finally {
      setLoadingEvents(false);
    }
  }, [authStatus.connected, selectedDate]);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (authStatus.connected) loadEvents(); }, [authStatus.connected, selectedDate, loadEvents]);

  const goToday = () => {
    sensory.tapLight();
    setSelectedDate(formatDateISO(new Date()));
  };

  const scrubDay = (dir: number) => {
    sensory.tapLight();
    setSelectedDate(addDays(selectedDate, dir));
  };

  const handleConnect = () => { window.location.href = '/api/auth/google'; };
  const handleDisconnect = async () => {
    await calendarClient.logout();
    await checkAuth();
    setEvents([]);
    showToast('Google Calendar disconnected', 'info');
  };

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.startTime) return -1;
    if (!b.startTime) return 1;
    return a.startTime.localeCompare(b.startTime);
  });

  // Separate all-day / timed
  const allDayEvents = sortedEvents.filter(e => !e.startTime || e.startTime === '00:00' && e.endTime === '00:00');
  const timedEvents = sortedEvents.filter(e => e.startTime && !(e.startTime === '00:00' && e.endTime === '00:00'));

  return (
    <div className="placeholder-page flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center active:scale-90 transition-transform" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {!loadingStatus && authStatus.connected && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          )}
          <h2 className="text-[16px] font-semibold text-white tracking-tight">Calendar</h2>
        </div>

        <div className="w-10 flex justify-end">
          {!loadingStatus && authStatus.connected && (
            <button onClick={handleDisconnect} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Day Scrubber */}
      {authStatus.connected && (
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => scrubDay(-1)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 active:scale-90 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="text-center">
            <button onClick={goToday} className="text-[18px] font-semibold text-white tracking-tight hover:text-[var(--color-accent)] transition-colors">
              {formatDateRelative(selectedDate)}
            </button>
            <p className="text-[11px] text-white/30 mt-0.5">{selectedDate}</p>
          </div>

          <button onClick={() => scrubDay(1)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 active:scale-90 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
        {/* Not connected */}
        {!loadingStatus && !authStatus.connected && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="text-[16px] font-semibold text-white mb-1">Connect Calendar</h3>
            <p className="text-[13px] text-white/40 mb-6 leading-relaxed max-w-[260px]">
              Life OS creates a dedicated calendar in your Google account to keep things organized.
            </p>
            <button onClick={handleConnect} className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-black text-[14px] font-semibold active:scale-95 transition-transform">
              Sign in with Google
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loadingStatus && (
          <div className="flex flex-col gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        )}

        {/* Connected — Timeline */}
        {authStatus.connected && !loadingStatus && (
          <div className="pb-6">
            {/* All-day / Deadline banners */}
            {allDayEvents.length > 0 && (
              <div className="mb-4 flex flex-col gap-1.5">
                {allDayEvents.map((evt) => (
                  <div key={evt.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04]">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: getEventColor(evt.colorId) }} />
                    <span className="text-[13px] font-medium text-white/80 truncate">{evt.title}</span>
                    <span className="ml-auto text-[11px] text-white/30">All day</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timed events */}
            {loadingEvents ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : timedEvents.length === 0 && allDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-[14px] text-white/30 mb-1">No events</p>
                <p className="text-[12px] text-white/20">Ask Life OS to add something to your day.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {timedEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
                    {/* Color bar */}
                    <div className="w-0.5 h-10 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: getEventColor(evt.colorId) }} />

                    {/* Time column */}
                    <div className="w-[70px] shrink-0">
                      <p className="text-[13px] font-medium text-white/70">{formatTime12h(evt.startTime)}</p>
                      <p className="text-[11px] text-white/30">{formatTime12h(evt.endTime)}</p>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white/90 truncate leading-snug">{evt.title}</p>
                      {evt.description && (
                        <p className="text-[12px] text-white/40 mt-0.5 truncate">{evt.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
