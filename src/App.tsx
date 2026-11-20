import { useState } from 'react';
import { useSession } from './hooks/useSession';
import { useIllustrations } from './hooks/useIllustrations';
import { InputScreen } from './components/InputScreen';
import { OverviewScreen } from './components/OverviewScreen';
import { SessionScreen } from './components/SessionScreen';
import { DoneScreen } from './components/DoneScreen';
import { shareUrl } from './utils/storage';

function App() {
  const {
    state,
    setState,
    sequence,
    loadWorkout,
    startSession,
    finishSet,
    finishRest,
    startWorkTimer,
    adjustTimer,
    goBack,
    skipExercise,
    resetSession,
  } = useSession();

  const { getIllustration } = useIllustrations(state.exercises);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleShare = () => {
    const url = shareUrl(state.block);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast('Lien copié'))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Lien copié');
    } catch (e) {
      showToast("Copiez l'URL dans la barre d'adresse");
    }
    document.body.removeChild(ta);
  };

  return (
    <>
      <div className="wrap">
        {state.screen === 'input' && (
          <InputScreen state={state} setState={setState} onLoad={loadWorkout} onShare={handleShare} />
        )}

        {state.screen === 'overview' && (
          <OverviewScreen
            state={state}
            setState={setState}
            onStart={() => startSession(false)}
            onResume={() => startSession(true)}
            onShare={handleShare}
            getIllustration={getIllustration}
          />
        )}

        {state.screen === 'session' && (
          <SessionScreen
            state={state}
            setState={setState}
            sequence={sequence}
            onCompleteSet={finishSet}
            onStartWork={startWorkTimer}
            onSkipRest={finishRest}
            onAdjustTimer={adjustTimer}
            onBack={goBack}
            onSkipExercise={skipExercise}
            onReset={resetSession}
            getIllustration={getIllustration}
          />
        )}

        {state.screen === 'done' && (
          <DoneScreen
            state={state}
            setState={setState}
            onRestart={() => startSession(false)}
            onShare={handleShare}
          />
        )}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}

export default App;
