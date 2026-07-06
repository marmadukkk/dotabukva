import React from 'react';
import { Language, t } from '../i18n';

interface LoadingOverlayProps {
  language: Language;
  isLoadingData: boolean;
  isTableImagesLoading: boolean;
  screen: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  language,
  isLoadingData,
  isTableImagesLoading,
  screen,
}) => {
  const isDrumLoading = isLoadingData && screen === 'leader-view';
  const isTableLoading = screen === 'guesser-view' && (isLoadingData || isTableImagesLoading);

  if (!isDrumLoading && !isTableLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="text-[#d4af37] text-sm tracking-[3px] font-semibold">{t(language, 'nav.loading')}</div>
    </div>
  );
};

export default LoadingOverlay;
