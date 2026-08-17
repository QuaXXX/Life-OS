import { useState } from 'react';
import { VoiceProvider, useVoice } from './services/voice/VoiceContext';
import { Header } from './components/ui/Header';
import { BottomNav } from './components/ui/BottomNav';
import type { PageId } from './components/ui/BottomNav';
import { Orb } from './components/canvas/Orb';
import { TextInputBar } from './components/ui/TextInputBar';
import { ResponseBubble } from './components/ui/ResponseBubble';
import { CalendarPage } from './pages/CalendarPage';
import { NutritionPage } from './pages/NutritionPage';
import { GoalsPage } from './pages/GoalsPage';
import { ChatPage } from './pages/ChatPage';

function HomePage() {
  const { orbState, startListening, stopListening, isTextMode } = useVoice();
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  const goHome = () => setCurrentPage('home');

  if (currentPage === 'calendar') return <CalendarPage onBack={goHome} />;
  if (currentPage === 'nutrition') return <NutritionPage onBack={goHome} />;
  if (currentPage === 'goals') return <GoalsPage onBack={goHome} />;
  if (currentPage === 'chat') return <ChatPage onBack={goHome} />;

  const isListening = orbState === 'listening';
  const isThinking = orbState === 'thinking';
  const isSpeaking = orbState === 'speaking';

  let captionText = 'Tap and hold to talk, or drag to look around';
  if (isListening) captionText = 'Listening...';
  else if (isThinking) captionText = 'Thinking...';
  else if (isSpeaking) captionText = 'Speaking...';

  return (
    <div className="app-shell">
      <Header />

      <div
        className={`orb-card ${
          isListening ? 'orb-card--listening'
          : isThinking ? 'orb-card--thinking'
          : isSpeaking ? 'orb-card--speaking'
          : ''
        }`}
      >
        <Orb
          state={orbState}
          onHoldStart={startListening}
          onHoldEnd={stopListening}
        />
        {/* Keyboard toggle button — only shows when text input is collapsed */}
        {!isTextMode && <TextInputBar />}
      </div>

      {/* Caption zone: either shows the text input bar or the status caption */}
      {isTextMode ? (
        <TextInputBar />
      ) : (
        <p className={`caption ${isListening || isSpeaking || isThinking ? 'caption--active' : ''}`}>
          {captionText}
        </p>
      )}

      <ResponseBubble />

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
