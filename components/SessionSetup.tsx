import React from 'react';
import { CoachMode, LiveConfig, RoleplayScenario } from '../types';

interface SessionSetupProps {
  onStart: (config: LiveConfig) => void;
}

const VOICES = [
  { name: 'Puck', label: 'Puck (Neutral, Clear)' },
  { name: 'Kore', label: 'Kore (Warm, Calm)' },
  { name: 'Fenrir', label: 'Fenrir (Deep, Authoritative)' },
  { name: 'Aoede', label: 'Aoede (Soft, Friendly)' },
  { name: 'Charon', label: 'Charon (Professional, Direct)' },
];

const SCENARIOS = [
  { 
    id: RoleplayScenario.RESTAURANT, 
    icon: '🍔', 
    desc: 'Practice ordering food and asking for recommendations.' 
  },
  { 
    id: RoleplayScenario.DIRECTIONS, 
    icon: '🗺️', 
    desc: 'Ask a local for directions and understand instructions.' 
  },
  { 
    id: RoleplayScenario.INTERVIEW, 
    icon: '💼', 
    desc: 'Answer common interview questions professionally.' 
  },
];

const SessionSetup: React.FC<SessionSetupProps> = ({ onStart }) => {
  const [mode, setMode] = React.useState<CoachMode>(CoachMode.FREE_TALK);
  const [scenario, setScenario] = React.useState<RoleplayScenario>(RoleplayScenario.RESTAURANT);
  const [voice, setVoice] = React.useState<string>('Puck');

  const handleStart = () => {
    onStart({ 
      mode, 
      voiceName: voice,
      scenario: mode === CoachMode.ROLEPLAY ? scenario : RoleplayScenario.NONE
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
           <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
           </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">FluentAI Coach</h1>
        <p className="text-slate-500 mt-2">Master your English with real-time AI feedback</p>
      </div>

      <div className="space-y-8">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Choose Practice Mode</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(CoachMode).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                  mode === m 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold z-10 relative">{m}</div>
                <div className="text-xs mt-1 text-slate-500 opacity-80 z-10 relative">
                  {m === CoachMode.PRONUNCIATION ? 'Drill specific sounds' :
                   m === CoachMode.ROLEPLAY ? 'Simulated scenarios' : 'Casual chat'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Selection (Only for Roleplay) */}
        {mode === CoachMode.ROLEPLAY && (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-slate-700 mb-3">Select Scenario</label>
            <div className="grid grid-cols-1 gap-3">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                    scenario === s.id
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-2xl mr-3">{s.icon}</span>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{s.id}</div>
                    <div className="text-xs text-slate-500">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Voice Selection */}
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-3">Select Voice Coach</label>
           <select 
             value={voice}
             onChange={(e) => setVoice(e.target.value)}
             className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
           >
             {VOICES.map(v => (
               <option key={v.name} value={v.name}>{v.label}</option>
             ))}
           </select>
        </div>

        <button
          onClick={handleStart}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transform transition hover:-translate-y-0.5 active:translate-y-0"
        >
          Start Session
        </button>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
        Powered by Gemini 2.5 Flash Native Audio
      </div>
    </div>
  );
};

export default SessionSetup;