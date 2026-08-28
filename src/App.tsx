import { useState } from 'react';
import { VoiceProvider, useVoice } from './services/voice/VoiceContext';
import { Header } from './components/ui/Header';
import { BottomNav } from './components/ui/BottomNav';
import type { PageId } from './components/ui/BottomNav';
import { Orb } from './components/canvas/Orb';
import { TextInputBar } from './components/ui/TextInputBar';
import { ResponseBubble } from './components/ui/ResponseBubble';
import { ToastContainer } from './components/ui/ToastContainer';
import { CalendarPage } from './pages/CalendarPage';
import { NutritionPage } from './pages/NutritionPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { TradingPage } from './pages/TradingPage';

function HomePage() {
  const { orbState, startListening, stopListening, isTextMode } = useVoice();
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  const goHome = () => setCurrentPage('home');
  
  const isListening = orbState === 'listening';
  const isThinking = orbState === 'thinking';
  const isSpeaking = orbState === 'speaking';

  let captionText = 'Tap and hold to talk, or drag to look around';
  if (isListening) captionText = 'Listening...';
  else if (isThinking) captionText = 'Thinking...';
  else if (isSpeaking) captionText = 'Speaking...';

  return (
    <>
      {currentPage === 'calendar' ? <CalendarPage onBack={goHome} /> :
       currentPage === 'nutrition' ? <NutritionPage onBack={goHome} /> :
       currentPage === 'workout' ? <WorkoutPage onBack={goHome} /> :
       currentPage === 'trading' ? <TradingPage onBack={goHome} /> :
       (
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
             {!isTextMode && <TextInputBar />}
           </div>

           <ResponseBubble />

           {isTextMode ? (
             <TextInputBar />
           ) : (
             <p className={`caption ${isListening || isSpeaking || isThinking ? 'caption--active' : ''}`}>
               {captionText}
             </p>
           )}

           <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
         </div>
       )}
    </>
  );
}

export default function App() {
  return (
    <VoiceProvider>
      <HomePage />
      <ToastContainer />
    </VoiceProvider>
  );
}
