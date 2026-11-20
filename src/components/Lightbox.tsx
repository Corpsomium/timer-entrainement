import { useEffect, useState } from 'react';
import { withViewTransition } from '../utils/viewTransition';

interface LightboxProps {
  images: string[];
  labels: string[];
  exerciseName: string;
  onClose: () => void;
}

export function Lightbox({ images, labels, exerciseName, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, images.length, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      withViewTransition(() => {
        setCurrentIndex((i) => i - 1);
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      withViewTransition(() => {
        setCurrentIndex((i) => i + 1);
      });
    }
  };

  return (
    <div className="lightbox" onClick={handleBackdropClick}>
      <button className="lightbox-close" onClick={onClose} aria-label="Fermer">
        ×
      </button>

      <div className="lightbox-content">
        <h3 className="lightbox-title">{exerciseName}</h3>
        
        <div className="lightbox-image-container">
          <img
            src={images[currentIndex]}
            alt={`${exerciseName} - ${labels[currentIndex]}`}
            className="lightbox-image"
          />
          <div className="lightbox-label">{labels[currentIndex]}</div>
        </div>

        {images.length > 1 && (
          <div className="lightbox-nav">
            <button
              className="lightbox-nav-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Image précédente"
            >
              ←
            </button>
            <div className="lightbox-counter">
              {currentIndex + 1} / {images.length}
            </div>
            <button
              className="lightbox-nav-btn"
              onClick={handleNext}
              disabled={currentIndex === images.length - 1}
              aria-label="Image suivante"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
