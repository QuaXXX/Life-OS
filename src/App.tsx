import { useState } from 'react';
import { VoiceProvider, useVoice } from './services/voice/VoiceContext';
import { Header } from './components/ui/Header';
import { BottomNav } from './components/ui/BottomNav';
import type { PageId } from './components/ui/BottomNav';
import { Orb } from './components/canvas/Orb';
import { CalendarPage } from './pages/CalendarPage';
import { NutritionPage } from './pages/NutritionPage';
import { GoalsPage } from './pages/GoalsPage';
import { ChatPage } from './pages/ChatPage';

function HomePage() {
  const { orbState, startListening, stopListening } = useVoice();
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  const goHome = () => setCurrentPage('home');

  // Render placeholder pages
  if (currentPage === 'calendar') return <CalendarPage onBack={goHome} />;
  if (currentPage === 'nutrition') return <NutritionPage onBack={goHome} />;
  if (currentPage === 'goals') return <GoalsPage onBack={goHome} />;
  if (currentPage === 'chat') return <ChatPage onBack={goHome} />;

  const isListening = orbState === 'listening';

  return (
    <div className="app-shell">
      <Header />

      <div className={`orb-card ${isListening ? 'orb-card--listening' : ''}`}>
        <Orb
          state={orbState}
          onHoldStart={startListening}
          onHoldEnd={stopListening}
        />
      </div>

      <p className={`caption ${isListening ? 'caption--listening' : ''}`}>
        {isListening
          ? 'Listening...'
          : 'Tap and hold to talk, or drag to look around'}
      </p>

      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
}

export default function App() {
  return (
    <VoiceProvider>
      <HomePage />
    </VoiceProvider>
  );
}
