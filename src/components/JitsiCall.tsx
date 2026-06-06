import React from 'react';

interface JitsiCallProps {
  roomName: string;
  displayName: string;
  onEndCall?: () => void;
}

export default function JitsiCall({ roomName, displayName, onEndCall }: JitsiCallProps) {
  // Usamos un servidor público alternativo (Systemli) que NO exige inicio de sesión
  // para crear salas, ideal para pruebas y demostraciones fluidas.
  const domain = "meet.systemli.org";
  // Jitsi modern configuration requires prejoinConfig.enabled
  const url = `https://${domain}/${roomName}#config.prejoinPageEnabled=false&config.prejoinConfig.enabled=false&config.disableDeepLinking=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName="${encodeURIComponent(displayName)}"`;

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 flex flex-col">
      {/* Banner de aviso para saltar restricción de Jitsi */}
      <div className="bg-blue-600 text-white text-xs md:text-sm p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="font-medium text-center md:text-left">
          <strong>Aviso:</strong> Jitsi limita las llamadas integradas (iframe) a 5 minutos. Para consultas sin límite de tiempo, abre la sala en una nueva pestaña.
        </p>
        <button 
          onClick={() => window.open(url, '_blank')}
          className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-1.5 px-4 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          Abrir sin límite de tiempo
        </button>
      </div>
      
      <iframe
        src={url}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *"
        className="w-full flex-1 border-0"
        title="Telemedicina Sumaq Qhali"
      />
      {onEndCall && (
        <div className="bg-slate-900 p-3 flex justify-center border-t border-slate-800">
          <button 
            onClick={onEndCall}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-8 rounded-xl shadow-xl transition-all"
          >
            Finalizar Videollamada
          </button>
        </div>
      )}
    </div>
  );
}
