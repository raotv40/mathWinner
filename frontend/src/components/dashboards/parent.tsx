'use client';

import React from 'react';
import { Shield, Clock, BookOpen, MessageSquare, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface ParentDashboardProps {
  stats: {
    student_name: string;
    class_level: number;
    daily_study_time_average_minutes: number;
    total_learning_time_hours: number;
    practice_completed: number;
    learning_trend: any[];
    message: string;
  };
}

export default function ParentDashboard({ stats }: ParentDashboardProps) {
  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Daily Study Average</p>
            <p className="text-xl font-black text-white">{stats.daily_study_time_average_minutes} Mins</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Active Hours</p>
            <p className="text-xl font-black text-white">{stats.total_learning_time_hours} Hrs</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Practice Completed</p>
            <p className="text-xl font-black text-white">{stats.practice_completed} Tasks</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Study Time Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Learning Trend (Weekly)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Understand your child's daily commitment.</p>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.learning_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#6366f1', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="minutes" stroke="#6366f1" fillOpacity={1} fill="url(#colorMinutes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-teal-400" /> MathWinner AI Advice
          </h3>
          
          <div className="flex-1 space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
              <p className="text-xs text-slate-300 leading-relaxed">
                {stats.message}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Needs Revision</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Schedule a 15-minute mock test on trigonometry angles this weekend.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
