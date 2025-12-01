import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveClient } from './services/gemini-live';
import AudioVisualizer from './components/AudioVisualizer';
import SessionSetup from './components/SessionSetup';
import SessionReportView from './components/SessionReport';
import { Message, LiveConfig, SessionReport, CoachMode } from './types';
import { GoogleGenAI, Type } from '@google/genai';

const App: React.FC = () => {
  const [activeStep, setActiveStep] = useState<'setup' | 'session' | 'analyzing' | 'report'>('setup');
  const [config, setConfig] = useState<LiveConfig>({ mode: CoachMode.FREE_TALK, voiceName: 'Puck' });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [report, setReport] = useState<SessionReport | null>(null);
  
  // Use ref for the client to persist across renders without re-initializing unnecessarily
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize Gemini for static analysis (report generation)
  const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartSession = useCallback(async (newConfig: LiveConfig) => {
    setConfig(newConfig);
    setError(null);
    setMessages([]);
    setActiveStep('session');

    const client = new GeminiLiveClient({
      onOpen: () => {
        setIsConnected(true);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (err) => {
        setError(err.message);
        setIsConnected(false);
        setActiveStep('setup');
      },
      onMessage: (text, isUser, isComplete) => {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          const isSameRole = lastMsg && lastMsg.role === (isUser ? 'user' : 'model');
          
          if (isSameRole && !lastMsg.isComplete) {
            // Append to current message if it's streaming updates
            const updated = [...prev];
            updated[updated.length - 1].text += text;
            if (isComplete) updated[updated.length - 1].isComplete = true;
            return updated;
          } else {
             return [...prev, {
               id: Date.now().toString(),
               role: isUser ? 'user' : 'model',
               text,
               isComplete: isComplete || false,
               timestamp: new Date()
             }];
          }
        });
      },
      onAudioData: (amp) => {
        setAudioAmplitude(amp);
      }
    });

    clientRef.current = client;
    await client.connect(newConfig);
  }, []);

  const handleEndSession = async () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    setIsConnected(false);
    setActiveStep('analyzing');
    await generateReport();
  };

  const generateReport = async () => {
    try {
      // Compile transcript
      const transcriptText = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      
      const prompt = `
        Analyze this English practice session transcript between a USER and an AI Coach.
        The user was practicing in mode: ${config.mode}. 
        ${config.scenario ? `Scenario: ${config.scenario}` : ''}
        
        Transcript:
        ${transcriptText}
        
        Provide a structured JSON response with:
        1. A score from 1-10 based on fluency and grammar.
        2. A short summary of the session.
        3. 3 key strengths.
        4. 3 areas for improvement (weaknesses).
        5. Analysis of Speaking Pace (choose one: 'Too Slow', 'Good', 'Too Fast').
        6. Intonation Score (1-10) based on the expressiveness inferred from text (use 7 as baseline if unsure, but look for questions/exclamations).
        7. Pronunciation Focus: Identify if they struggled with specific sounds based on the corrections made by the AI (e.g., 'th', 'r', 'v/w', 'vowels').
        8. A list of up to 5 specific corrections (original sentence, corrected version, explanation).
        9. Mini Lessons: Provide 2 short actionable lessons based on their errors (Title, Description, Example). e.g. "Mastering the 'th' sound".
      `;

      const response = await genAI.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              speakingPace: { type: Type.STRING, enum: ['Too Slow', 'Good', 'Too Fast'] },
              intonationScore: { type: Type.INTEGER },
              pronunciationFocus: { type: Type.ARRAY, items: { type: Type.STRING } },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  }
                }
              },
              miniLessons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    example: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });
      
      const resultText = response.text;
      if (resultText) {
        const reportData = JSON.parse(resultText) as SessionReport;
        setReport(reportData);
        setActiveStep('report');
      } else {
        throw new Error("No analysis generated");
      }

    } catch (e) {
      console.error("Analysis failed", e);
      setError("Failed to generate session report. Please try again.");
      setActiveStep('setup');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 font-sans text-slate-900">
      
      {/* ERROR TOAST */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-md flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-bold">✕</button>
        </div>
      )}

      {/* VIEW: SETUP */}
      {activeStep === 'setup' && (
        <SessionSetup onStart={handleStartSession} />
      )}

      {/* VIEW: SESSION */}
      {activeStep === 'session' && (
        <div className="w-full max-w-5xl h-[90vh] flex flex-col md:flex-row gap-6 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
          
          {/* Left: Interaction Area */}
          <div className="flex-1 flex flex-col relative bg-slate-900 text-white p-6 justify-between items-center">
            <div className="absolute top-6 left-6 flex items-center space-x-2 bg-slate-800 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`}></span>
              <span>{isConnected ? 'Live' : 'Connecting...'}</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center w-full">
              <AudioVisualizer isActive={isConnected} amplitude={audioAmplitude} />
            </div>

            <div className="w-full flex flex-col items-center gap-4 mb-4">
              <div className="text-center">
                 <p className="text-slate-400 text-sm font-medium">
                    Speaking with <span className="text-white">{config.voiceName}</span>
                 </p>
                 <p className="text-blue-400 text-xs mt-1 uppercase tracking-wider font-semibold">
                   {config.mode} {config.scenario ? `• ${config.scenario}` : ''}
                 </p>
              </div>
              
              <button 
                onClick={handleEndSession}
                className="group flex items-center justify-center w-16 h-16 bg-red-500 rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/30 active:scale-95"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <span className="text-xs text-slate-500">End Session</span>
            </div>
          </div>

          {/* Right: Transcript */}
          <div className="flex-1 md:max-w-md bg-white border-l border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Live Transcript</h3>
              <div className="text-xs text-slate-400">Auto-scrolling</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                 <div className="text-center text-slate-400 mt-20 italic px-6">
                   <p>Start speaking to see the transcript...</p>
                   {config.mode === CoachMode.PRONUNCIATION && (
                     <p className="text-xs mt-2 text-blue-500 bg-blue-50 p-2 rounded">
                       Tip: The coach will guide you through difficult words. Listen and repeat.
                     </p>
                   )}
                 </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ANALYZING */}
      {activeStep === 'analyzing' && (
        <div className="text-center animate-pulse">
           <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Generating Feedback...</h2>
           <p className="text-slate-500 mt-2">Analyzing pronunciation, grammar, and fluency.</p>
        </div>
      )}

      {/* VIEW: REPORT */}
      {activeStep === 'report' && report && (
        <SessionReportView report={report} onRestart={() => setActiveStep('setup')} />
      )}
    </div>
  );
};

export default App;