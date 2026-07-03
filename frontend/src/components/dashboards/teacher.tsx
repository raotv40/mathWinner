'use client';

import React from 'react';
import { Users, TrendingUp, AlertCircle, FileSpreadsheet, ChevronRight } from 'lucide-react';

interface TeacherDashboardProps {
  stats: {
    class_level: number;
    total_students: number;
    class_average_mastery: number;
    common_mistakes: string[];
    students_performance: any[];
  };
}

export default function TeacherDashboard({ stats }: TeacherDashboardProps) {
  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Active Class Students</p>
            <p className="text-xl font-black text-white">{stats.total_students} Students</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Average Mastery</p>
            <p className="text-xl font-black text-white">{stats.class_average_mastery}% Score</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Student performance listings */}
        <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Student Roster & Progression</h3>
              <p className="text-xs text-slate-400 mt-0.5">Individual details for CBSE K-12 learning paths.</p>
            </div>
            
            <button className="text-xs bg-slate-850 hover:bg-slate-800 text-teal-300 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition">
              <FileSpreadsheet className="w-4 h-4" /> Export Report
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {stats.students_performance.map((student, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex items-center justify-between gap-4 transition hover:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                    {student.name.slice(0,2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{student.name}</h4>
                    <p className="text-[10px] text-slate-500">{student.completed_chapters} Chapters active</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-bold text-teal-400">{Math.round(student.average_mastery)}%</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Avg Mastery</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Common Mistakes & Classroom Gaps */}
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" /> Classroom Concept Gaps
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Recurring issues spotted by AI grader agents.</p>
          </div>

          <div className="space-y-3">
            {stats.common_mistakes.map((mistake, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-rose-950/10 border border-rose-500/10 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{mistake}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
