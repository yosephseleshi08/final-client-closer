import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopTip, setShowDesktopTip] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">App Installed</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer active:scale-95"
        title="Install Outreach Engine Pro as a standalone app"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/25 transition cursor-pointer"
          title="Add to iPhone/iPad Home Screen"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white font-['Outfit']">Install on iOS (iPhone / iPad)</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">1</span>
                  <p>Tap the <strong className="text-white">Share button</strong> (square with arrow) at the bottom of Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">2</span>
                  <p>Scroll down and select <strong className="text-white">"Add to Home Screen"</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">3</span>
                  <p>Tap <strong className="text-white">Add</strong> in top right. You can now launch and use it offline like a native app!</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Generic desktop / browser fallback button (useful to trigger or inform user)
  return (
    <>
      <button
        onClick={() => setShowDesktopTip(true)}
        className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
        title="Installable Desktop / Mobile PWA"
      >
        <Download className="h-3.5 w-3.5 text-indigo-400" />
        <span>Install App</span>
      </button>

      {showDesktopTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-['Outfit']">Install on Desktop</h3>
              </div>
              <button
                onClick={() => setShowDesktopTip(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To install Outreach Engine Pro on Chrome, Edge, or Brave:
              <br /><br />
              1. Look at the right side of your browser address bar.<br />
              2. Click the <strong className="text-white">Install App</strong> icon (monitor with down arrow).<br />
              3. Click <strong>Install</strong> to launch as a standalone desktop app.
            </p>
            <button
              onClick={() => setShowDesktopTip(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
};
