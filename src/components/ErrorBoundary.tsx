import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  language?: "es" | "qu";
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  override render() {
    const language = this.props.language || "es";
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{language === "es" ? "Ocurrió un error inesperado" : "Mana suyasqa pantay rikurirqun"}</h2>
            <p className="text-sm text-slate-500 mb-4">
              {this.state.error?.message || (language === "es" ? "Error desconocido" : "Mana riqsisqa pantay")}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("sumaq_user");
                localStorage.removeItem("sumaq_token");
                window.location.href = "/";
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
            >
              {language === "es" ? "Reiniciar Aplicación" : "Aplicacionta Yapamanta Qallariy"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
