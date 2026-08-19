import { useState, useEffect, useCallback } from 'react';
import { calendarClient } from '../services/calendar/CalendarClient';
import type { AuthStatus, CreateEventInput } from '../services/calendar/types';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface PageProps {
  onBack: () => void;
}

interface PendingAction {
  type: 'create';
  title: string;
  detailsText: string;
  data: any;
}

export function CalendarPage({ onBack }: PageProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State (Add)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '11:00',
    description: '',
  });

  // Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const checkAuth = useCallback(async () => {
    setLoadingStatus(true);
    const status = await calendarClient.getStatus();
    setAuthStatus(status);
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleOpenAddForm = () => {
    setFormData({
      title: '',
      date: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '11:00',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setPendingAction({
      type: 'create',
      title: 'Confirm Event',
      detailsText: `Add "${formData.title}" on ${formData.date} at ${formData.startTime}?`,
      data: formData,
    });
    setIsFormOpen(false);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (action.type === 'create') {
        await calendarClient.createEvent(action.data);
        setSuccessMsg('Event added successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    await calendarClient.logout();
    await checkAuth();
  };

  return (
    <div className="placeholder-page flex flex-col h-full bg-[#12151a]">
      {/* Sleek Header */}
      <div className="flex items-center gap-4 px-6 pt-12 pb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-[20px] font-semibold text-white tracking-tight">Calendar Sync</h2>
      </div>

      <div className="px-6 flex-1 flex flex-col">
        {/* Status Card */}
        <div className="bg-white/[0.03] rounded-[20px] p-6 mb-6 border border-white/[0.05]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/90 font-medium text-[15px]">Google Calendar</h3>
            {!loadingStatus && authStatus.connected && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                Connected
              </span>
            )}
          </div>
          <p className="text-white/40 text-[13px] leading-relaxed">
            Life OS creates a dedicated calendar in your account. You can safely add events here without cluttering your primary schedule.
          </p>

          <div className="mt-6">
            {loadingStatus ? (
              <div className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
            ) : authStatus.connected ? (
              <button 
                onClick={handleDisconnect} 
                className="text-[13px] text-white/30 hover:text-white/80 transition-colors w-full text-left py-2"
              >
                Disconnect Account
              </button>
            ) : (
              <button 
                onClick={handleConnectGoogle} 
                className="w-full py-3.5 rounded-[14px] bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.82 3.08-3.78 3.08-2.28 0-4.14-1.86-4.14-4.14s1.86-4.14 4.14-4.14c1.04 0 1.98.39 2.71 1.03l2.05-2.05C18.41 6.36 16.44 5.5 14.18 5.5 9.77 5.5 6.2 9.07 6.2 13.48s3.57 7.98 7.98 7.98c4.6 0 7.64-3.23 7.64-7.78 0-.58-.06-1.12-.17-1.58z" />
                </svg>
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {authStatus.connected && !loadingStatus && (
          <button 
            onClick={handleOpenAddForm} 
            className="w-full py-4 rounded-[20px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[15px] font-medium hover:bg-[var(--color-accent)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-[var(--color-accent)]/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Event
          </button>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] text-center backdrop-blur-md">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-[13px] text-center backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {successMsg}
          </div>
        )}
      </div>

      {/* Add Form Modal - Bottom Sheet Style */}
      {isFormOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" onClick={() => setIsFormOpen(false)} />
          <div className="relative bg-[#1a1e25] rounded-t-[28px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 pb-safe">
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />
            <h3 className="text-[18px] font-semibold text-white tracking-tight mb-5">
              Add Event
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Event Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder-white/40 outline-none focus:bg-white/10 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:bg-white/10 transition-colors [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                  />
                </div>
                <div>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:bg-white/10 transition-colors [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                  />
                </div>
                <div>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:bg-white/10 transition-colors [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-4 rounded-xl bg-[var(--color-accent)] text-black text-[15px] font-semibold hover:brightness-110 transition-all active:scale-[0.98]">
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Step Modal */}
      {pendingAction && (
        <ConfirmModal
          title={pendingAction.title}
          detailsText={pendingAction.detailsText}
          onConfirm={executePendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
