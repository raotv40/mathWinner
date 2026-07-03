'use client';

import React from 'react';
import { Flame, Clock, CheckSquare, Star, Award, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface StudentDashboardProps {
  stats: {
    student_name: string;
    class_level: number;
    total_learning_time_minutes: number;
    current_streak: number;
    mastery_by_chapter: any[];
    weak_topics: string[];
    strong_topics: string[];
    radar_skills: Record<string, number>;
  };
}

export default function StudentDashboard({ stats }: StudentDashboardProps) {
  // Map radar skills to Recharts format
  const radarData = Object.entries(stats.radar_skills).map(([subject, value]) => ({
    subject,
    A: value,
    fullMark: 100,
  }));

  // Daily learning time for simple bar chart representation
  const weeklyStudyTime = [
    { name: 'Mon', minutes: 30 },
    { name: 'Tue', minutes: 50 },
    { name: 'Wed', minutes: 20 },
    { name: 'Thu', minutes: 60 },
    { name: 'Fri', minutes: 45 },
    { name: 'Sat', minutes: 90 },
    { name: 'Sun', minutes: 40 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Streak card */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Flame className="w-7 h-7 fill-orange-400 animate-bounce" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Daily Streak</p>
            <p className="text-xl font-black text-white">{stats.current_streak} Days</p>
          </div>
        </div>

        {/* Study Time Card */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Learning Time</p>
            <p className="text-xl font-black text-white">{Math.round(stats.total_learning_time_minutes)} Mins</p>
          </div>
        </div>

        {/* Practice completed card */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CheckSquare className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tasks Solved</p>
            <p className="text-xl font-black text-white">
              {stats.mastery_by_chapter.reduce((acc, ch) => acc + (ch.practice_completed || 0), 0)} Qs
            </p>
          </div>
        </div>

        {/* Mastery Badge Card */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mastery Level</p>
            <p className="text-xl font-black text-white">Gold Scholar</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SAFAL Competency Radar Chart */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-teal-400" /> SAFAL Competency Profile
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Aligned with CBSE school boards evaluation guidelines.</p>
          </div>

          <div className="h-[260px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={8} />
                <Radar name="Student" dataKey="A" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Learning Time Analytics Bar Chart */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-400" /> Weekly Study Trend
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Track your daily practice minutes.</p>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStudyTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#2dd4bf', fontSize: '12px' }}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chapters Mastery progression heat list */}
      <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Chapter Mastery Heatlist</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your chapter evaluation grading metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.mastery_by_chapter.map((ch, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full uppercase">
                    Chapter {ch.chapter_number}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-1.5 line-clamp-1">{ch.chapter_title}</h4>
                </div>
                <span className="text-xs font-black text-teal-400">{ch.mastery_score}%</span>
              </div>
              
              <div className="w-full h-1.5 rounded-full bg-slate-850 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    ch.mastery_score >= 80 
                      ? 'bg-emerald-400' 
                      : ch.mastery_score >= 50 
                      ? 'bg-amber-400' 
                      : 'bg-rose-500'
                  }`} 
                  style={{ width: `${ch.mastery_score}%` }} 
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{ch.practice_completed} solved</span>
                <span className="font-semibold">{ch.mastery_score >= 80 ? 'Mastered' : ch.mastery_score >= 50 ? 'Developing' : 'Needs Work'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
