import React from 'react';
import { useTranslation } from 'react-i18next';

interface JitsiCallProps {
  roomName: string;
  displayName: string;
  onEndCall?: () => void;
}

export default function JitsiCall({ roomName, displayName, onEndCall }: JitsiCallProps) {
  const { t } = useTranslation();
  // Usamos un servidor público alternativo (Systemli) que NO exige inicio de sesión
  // para crear salas, ideal para pruebas y demostraciones fluidas.
  const domain = "meet.systemli.org";
  // Jitsi modern configuration requires prejoinConfig.enabled
  const url = `https://${domain}/${roomName}#config.prejoinPageEnabled=false&config.prejoinConfig.enabled=false&config.disableDeepLinking=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.toolbarButtons=%5B%22microphone%22,%22camera%22,%22chat%22,%22tileview%22%5D&userInfo.displayName="${encodeURIComponent(displayName)}"`;

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 flex flex-col">
      {/* Banner de aviso */}
      <div className="bg-primary text-white text-xs md:text-sm p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="font-medium text-center md:text-left">
          {t('alert_message')}
        </p>
        <button 
          onClick={() => window.open(url, '_blank')}
          className="bg-white text-primary hover:bg-primary-light font-bold py-1.5 px-4 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          {t('open_no_limit')}
        </button>
      </div>
      
      <iframe
        src={url}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *"
        className="w-full flex-1 border-0"
        title="Telemedicina Sumaq Qhali"
      />
      
    </div>
  );
}
