import { useState, useEffect, useRef } from 'react';
import { useSession } from './hooks/useSession';
import { useIllustrations } from './hooks/useIllustrations';
import { useEquipment } from './hooks/useEquipment';
import { InputScreen } from './components/InputScreen';
import { OverviewScreen } from './components/OverviewScreen';
import { SessionScreen } from './components/SessionScreen';
import { DoneScreen } from './components/DoneScreen';
import { EquipmentScreen } from './components/EquipmentScreen';
import { shareUrl } from './utils/storage';
import { unlockAudio } from './utils/audio';
import { withViewTransition } from './utils/viewTransition';
import type { SessionState } from './types';

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

  const { getIllustration, updateExerciseIllustration } = useIllustrations(state.exercises);
  const equipment = useEquipment();
  const [toast, setToast] = useState<string | null>(null);
  const equipmentReturnRef = useRef<SessionState['screen']>('overview');

  useEffect(() => {
    const onFirstGesture = () => {
      unlockAudio();
      document.removeEventListener('click', onFirstGesture);
      document.removeEventListener('touchstart', onFirstGesture);
    };

    document.addEventListener('click', onFirstGesture);
    document.addEventListener('touchstart', onFirstGesture);

    return () => {
      document.removeEventListener('click', onFirstGesture);
      document.removeEventListener('touchstart', onFirstGesture);
    };
  }, []);

  const loadWorkoutWithTransition = () => {
    withViewTransition(() => {
      loadWorkout();
    });
  };

  const startSessionWithTransition = (resume: boolean) => {
    withViewTransition(() => {
      startSession(resume);
    });
  };

  const resetSessionWithTransition = () => {
    withViewTransition(() => {
      resetSession();
    });
  };

  const openEquipment = () => {
    equipmentReturnRef.current = state.screen === 'equipment' ? 'overview' : state.screen;
    withViewTransition(() => {
      setState((prev) => ({ ...prev, screen: 'equipment' }));
    });
  };

  const closeEquipment = () => {
    const back = equipmentReturnRef.current === 'equipment' ? 'overview' : equipmentReturnRef.current;
    withViewTransition(() => {
      setState((prev) => ({ ...prev, screen: back }));
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
          <InputScreen
            state={state}
            setState={setState}
            onLoad={loadWorkoutWithTransition}
            onShare={handleShare}
            onOpenEquipment={openEquipment}
          />
        )}

        {state.screen === 'overview' && (
          <OverviewScreen
            state={state}
            setState={setState}
            onStart={() => startSessionWithTransition(false)}
            onResume={() => startSessionWithTransition(true)}
            onShare={handleShare}
            onOpenEquipment={openEquipment}
            getIllustration={getIllustration}
            updateExerciseIllustration={updateExerciseIllustration}
          />
        )}

        {state.screen === 'session' && (
          <SessionScreen
            state={state}
            setState={setState}
            sequence={sequence}
            inventory={equipment.inventory}
            onCompleteSet={finishSet}
            onStartWork={startWorkTimer}
            onSkipRest={finishRest}
            onAdjustTimer={adjustTimer}
            onBack={goBack}
            onSkipExercise={skipExercise}
            onReset={resetSessionWithTransition}
            onOpenEquipment={openEquipment}
            getIllustration={getIllustration}
            updateExerciseIllustration={updateExerciseIllustration}
          />
        )}

        {state.screen === 'done' && (
          <DoneScreen
            state={state}
            setState={setState}
            onRestart={() => startSessionWithTransition(false)}
            onShare={handleShare}
          />
        )}

        {state.screen === 'equipment' && (
          <EquipmentScreen
            inventory={equipment.inventory}
            onBack={closeEquipment}
            onUpsertBar={equipment.upsertBar}
            onRemoveBar={equipment.removeBar}
            onUpsertPlate={equipment.upsertPlate}
            onRemovePlate={equipment.removePlate}
            onUpsertKettlebell={equipment.upsertKettlebell}
            onRemoveKettlebell={equipment.removeKettlebell}
            onReset={equipment.resetToDefault}
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
