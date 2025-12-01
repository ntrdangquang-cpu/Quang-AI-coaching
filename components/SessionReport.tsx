import React from 'react';
import { SessionReport } from '../types';

interface SessionReportProps {
  report: SessionReport;
  onRestart: () => void;
}

const ScoreCircle: React.FC<{ score: number; label?: string }> = ({ score, label }) => {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 10) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48" cy="48" r="40"
            stroke="currentColor" strokeWidth="8"
            fill="transparent"
            className="text-slate-700/20"
          />
          <circle
            cx="48" cy="48" r="40"
            stroke="currentColor" strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-white transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-xs text-slate-400">/ 10</span>
        </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-300 mt-2">{label}</span>}
    </div>
  );
};

const SessionReportView: React.FC<SessionReportProps> = ({ report, onRestart }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Session Analysis</h2>
              <p className="text-slate-400 max-w-lg">{report.summary}</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                 {report.pronunciationFocus?.map((focus, i) => (
                   <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold text-blue-300 border border-slate-700">
                     Focus: {focus}
                   </span>
                 ))}
              </div>
            </div>
            
            <div className="flex gap-6">
              <ScoreCircle score={report.score} label="Overall" />
              <ScoreCircle score={report.intonationScore} label="Intonation" />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Speaking Pace</div>
                <div className={`text-lg font-bold ${
                  report.speakingPace === 'Good' ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {report.speakingPace}
                </div>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Corrections</div>
                <div className="text-lg font-bold text-blue-600">{report.corrections.length}</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Key Strength</div>
                <div className="text-lg font-bold text-indigo-600 truncate px-2">{report.strengths[0] || '-'}</div>
             </div>
          </div>

          {/* Grid for Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-green-50 p-6 rounded-2xl border border-green-100">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Strengths
              </h3>
              <ul className="space-y-3">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start text-green-700 text-sm">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span> 
                    {s}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
              <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Areas for Improvement
              </h3>
              <ul className="space-y-3">
                {report.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start text-amber-700 text-sm">
                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></span>
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Mini Lessons */}
          {report.miniLessons && report.miniLessons.length > 0 && (
             <section>
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </span>
                  Mini Lessons
               </h3>
               <div className="grid md:grid-cols-2 gap-4">
                 {report.miniLessons.map((lesson, idx) => (
                   <div key={idx} className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-5 hover:bg-indigo-50 transition-colors">
                     <h4 className="font-bold text-indigo-900 mb-2">{lesson.title}</h4>
                     <p className="text-sm text-slate-700 mb-3">{lesson.description}</p>
                     <div className="text-xs font-mono bg-white p-2 rounded border border-indigo-100 text-indigo-700">
                       Ex: "{lesson.example}"
                     </div>
                   </div>
                 ))}
               </div>
             </section>
          )}

          {/* Corrections Table */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg mr-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </span>
              Detailed Corrections
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">You Said</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Better Way</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Why</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {report.corrections.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm text-red-500 font-medium">{item.original}</td>
                      <td className="px-6 py-4 text-sm text-green-600 font-medium">{item.corrected}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-center pt-8">
            <button 
              onClick={onRestart}
              className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
              Start New Session
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SessionReportView;