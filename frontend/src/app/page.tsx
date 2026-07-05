'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, Download, Sparkles, AlertCircle, Wifi, WifiOff, RefreshCw, BarChart2, ShieldAlert, Users, Trash2, Brain, Video, CheckCircle2, ChevronRight, GraduationCap, FileText } from 'lucide-react';

import VideoPlayer from '../components/video-player';
import Whiteboard from '../components/whiteboard';
import PracticeEngine, { QuestionData } from '../components/practice';
import AITutor from '../components/tutor';
import StudentDashboard from '../components/dashboards/student';
import ParentDashboard from '../components/dashboards/parent';
import TeacherDashboard from '../components/dashboards/teacher';

import { fetchChapters, fetchChapter, downloadChapterOffline, isOnline as checkOnline } from '../lib/api';
import { db } from '../lib/db';

export default function Home() {
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<number>(10);

  useEffect(() => {
    const started = localStorage.getItem('mathwinner_journey_started');
    if (started === 'true') {
      setJourneyStarted(true);
    }
  }, []);

  const handleStartJourney = () => {
    setJourneyStarted(true);
    localStorage.setItem('mathwinner_journey_started', 'true');
  };
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterDetails, setChapterDetails] = useState<any | null>(null);
  
  // Simulation of connection toggle for testing
  const [onlineStatus, setOnlineStatus] = useState(true);
  
  // Seeding/Uploading states
  const [isSeeding, setIsSeeding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  
  // Workspace UI states
  const [activeTab, setActiveTab] = useState<'study' | 'analytics'>('study');
  const [dashboardRole, setDashboardRole] = useState<'student' | 'parent' | 'teacher'>('student');
  
  // Form Upload state
  const [uploadClass, setUploadClass] = useState(10);
  const [uploadNum, setUploadNum] = useState(1);
  const [uploadTitle, setUploadTitle] = useState('');
  
  // AI Tutor trigger helper (Pause & Ask AI)
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorConcept, setTutorConcept] = useState('');

  // Load chapters
  const loadChaptersList = async () => {
    try {
      const data = await fetchChapters(selectedClass);
      setChapters(data);
      if (data.length > 0 && !selectedChapterId) {
        setSelectedChapterId(data[0].id);
      }
    } catch (err) {
      console.warn("Failed to load chapters:", err);
    }
  };

  useEffect(() => {
    loadChaptersList();
  }, [selectedClass]);

  // Register PWA Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('ServiceWorker registered with scope: ', reg.scope))
        .catch(err => console.warn('ServiceWorker registration failed: ', err));
    }
  }, []);

  // Load active chapter details
  useEffect(() => {
    if (!selectedChapterId) {
      setChapterDetails(null);
      return;
    }
    
    async function loadDetails() {
      try {
        const details = await fetchChapter(selectedChapterId!);
        // Fetch practice questions either from API or offline DB
        let qs: any[] = [];
        if (!checkOnline() || !onlineStatus) {
          qs = await db.questions.where('chapter_id').equals(selectedChapterId!).toArray();
        } else {
          // fetch from api helper
          const res = await fetch(`http://localhost:8000/api/v1/practice/${selectedChapterId}`);
          if (res.ok) qs = await res.json();
        }
        
        setChapterDetails({
          ...details,
          questions: qs.length > 0 ? qs : [
            {
              id: "q-default-1",
              difficulty: "medium",
              category: "board",
              question_text: "Verify step-by-step the solving of standard CBSE equations of degrees 2.",
              question_type: "mcq",
              options: ["x = 5", "x = -5", "x = 0"],
              correct_answer: "x = 5",
              hints: ["Isolate variables", "Check values"],
              step_by_step_solution: [
                { step: "1", instruction: "Equation: 2x = 10" },
                { step: "2", instruction: "Divide by 2: x = 5" }
              ]
            }
          ]
        });
      } catch (err) {
        console.warn("Could not fetch details:", err);
      }
    }
    loadDetails();
  }, [selectedChapterId, onlineStatus]);

  // Network offline simulator
  const toggleNetworkSimulator = () => {
    setOnlineStatus(!onlineStatus);
    // Mock navigator.onLine value override for api.ts logic
    if (typeof window !== 'undefined') {
      Object.defineProperty(window.navigator, 'onLine', {
        value: !onlineStatus,
        configurable: true
      });
    }
  };

  // Seed default data
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/seed', { method: 'POST' });
      const msg = await res.json();
      alert(msg.message || "Seeding complete!");
      await loadChaptersList();
    } catch (err) {
      console.warn(err);
      alert("Could not connect to backend server. Running in mock setup mode.");
      // Inject local simulated chapters into IndexedDB directly for demonstration
      await db.chapters.put({
        id: "mock-chapter-quadratic",
        class_level: 10,
        subject: "Mathematics",
        title: "Quadratic Equations (Simulated Offline)",
        chapter_number: 4,
        summary: "CBSE Class 10 chapter on quadratic polynomial equations.",
        formulas: [{ formula: "ax^2 + bx + c = 0", explanation: "Standard form" }],
        mind_map: { nodes: [], links: [] },
        pdf_url: "#",
        video_url: "#"
      });
      await loadChaptersList();
    } finally {
      setIsSeeding(false);
    }
  };

  // Download Offline Package
  const triggerOfflineDownload = async () => {
    if (!selectedChapterId) return;
    setDownloadProgress("Starting download...");
    try {
      await downloadChapterOffline(selectedChapterId, (msg) => {
        setDownloadProgress(msg);
      });
      setTimeout(() => setDownloadProgress(null), 3000);
    } catch (err: any) {
      console.error(err);
      setDownloadProgress(`Error: ${err.message || 'Download failed'}`);
    }
  };

  // Upload Form file submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const pdfFile = (form.elements.namedItem('pdf') as HTMLInputElement).files?.[0];
    const videoFile = (form.elements.namedItem('video') as HTMLInputElement).files?.[0];

    if (!pdfFile || !videoFile || !uploadTitle) {
      alert("Please fill all details and choose files");
      return;
    }

    setUploadProgress("Uploading files (0%)...");
    
    const formData = new FormData();
    formData.append("class_level", uploadClass.toString());
    formData.append("chapter_number", uploadNum.toString());
    formData.append("title", uploadTitle);
    formData.append("pdf", pdfFile);
    formData.append("video", videoFile);

    try {
      const res = await fetch('http://localhost:8000/api/v1/chapters/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadProgress("Extracting PDF concepts & transcribing video audio in background...");
      setTimeout(() => {
        setUploadProgress(null);
        loadChaptersList();
      }, 5000);
    } catch (err) {
      console.error(err);
      setUploadProgress("Failed to upload. Ensure FastAPI is running on port 8000.");
    }
  };

  const handleClearLocalDB = async () => {
    if (confirm("Are you sure you want to clear the offline package database?")) {
      await db.delete();
      window.location.reload();
    }
  };

  if (!journeyStarted) {
    return (
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans min-h-screen relative overflow-hidden px-6 py-12 selection:bg-teal-500/30 selection:text-teal-200">
        {/* Decorative background grid and blobs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 z-0"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse"></div>
        <div className="absolute bottom-12 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none z-0"></div>

        <div className="max-w-4xl w-full flex flex-col items-center gap-12 z-10 relative">
          
          {/* Header Branding */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl shadow-teal-500/20 animate-bounce">
              W
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-3">
                MathWinner AI
              </h1>
              <span className="inline-block mt-2 text-xs font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400 px-3.5 py-1 rounded-full uppercase tracking-wider">
                CBSE K-12 Mathematics Platform
              </span>
              <p className="mt-4 text-base md:text-lg text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
                An offline-first, interactive learning platform designed to help students master school mathematics concept-by-concept.
              </p>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            
            {/* Highlight 1 */}
            <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-md flex flex-col gap-4 hover:border-teal-500/30 transition duration-300 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/15 group-hover:scale-110 transition duration-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">NCERT Course Mapping</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Upload official textbooks. The AI automatically maps complex chapters into structured formulas and visual concept connections.</p>
                <a 
                  href="https://ncert.nic.in/textbook.php?eemh1=0-14" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:text-teal-300 mt-3 transition duration-200"
                >
                  Download NCERT Books <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Highlight 2 */}
            <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-md flex flex-col gap-4 hover:border-teal-500/30 transition duration-300 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/15 group-hover:scale-110 transition duration-300">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sync Video Lessons</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Transcribes, syncs, and segments teacher lesson videos by topic. Fast-forward exactly to the concepts you need to learn.</p>
              </div>
            </div>

            {/* Highlight 3 */}
            <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-md flex flex-col gap-4 hover:border-teal-500/30 transition duration-300 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/15 group-hover:scale-110 transition duration-300">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Personal RAG AI Tutor</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">A virtual assistant trained on your textbook. Chat, ask questions, get explanations, and receive multilingual math support.</p>
              </div>
            </div>

            {/* Highlight 4 */}
            <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-md flex flex-col gap-4 hover:border-teal-500/30 transition duration-300 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/15 group-hover:scale-110 transition duration-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Grader & Whiteboard</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Solve math problems on a digital canvas. The whiteboard grades your formulas step-by-step and highlights calculation errors.</p>
              </div>
            </div>

            {/* Highlight 5 */}
            <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-md flex flex-col gap-4 hover:border-teal-500/30 transition duration-300 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/15 group-hover:scale-110 transition duration-300">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">SAFAL Practice Tests</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Practice with competency-based assessments mapped to CBSE SAFAL standards. Tracks stats for students, parents, and teachers.</p>
              </div>
            </div>

            {/* Highlight 6 */}
            <div className="bg-slate-900/35 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-md flex flex-col gap-4 hover:border-teal-500/30 transition duration-300 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/15 group-hover:scale-110 transition duration-300">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">100% Offline-First PWA</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Download any chapter to local storage. Learn, watch lessons, and practice offline. Syncs metrics back once connected.</p>
              </div>
            </div>

          </div>

          {/* CTA Action */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStartJourney}
              className="group relative bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-300 hover:to-blue-400 text-slate-950 font-black text-sm uppercase tracking-widest py-4.5 px-10 rounded-2xl shadow-xl shadow-teal-500/20 hover:shadow-teal-500/30 hover:scale-[1.03] transition duration-300 flex items-center gap-2 cursor-pointer z-10"
            >
              Start Journey <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition duration-350" />
            </button>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">No login or signup required. Free for students & schools.</p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="bg-slate-900/60 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/25">
            W
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              MathWinner AI <span className="text-[9px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">CBSE K-12</span>
            </h1>
            <p className="text-[10px] text-slate-400">Offline-first math classroom simulator</p>
          </div>
        </div>

        {/* Network Status indicator & simulator toggler */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleNetworkSimulator}
            className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 border transition ${
              onlineStatus 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {onlineStatus ? (
              <>
                <Wifi className="w-4 h-4" /> Online Mode (Simulated)
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" /> Offline Mode (PWA Local Cache)
              </>
            )}
          </button>

          <button
            onClick={handleClearLocalDB}
            title="Clear IndexedDB"
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/20 hover:text-red-400 border border-slate-700 transition"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1 flex flex-col gap-6">
        
        {/* Class Selection & Quick Seeding */}
        <section className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select Class</label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedClass(lvl)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center border ${
                    selectedClass === lvl
                      ? 'bg-teal-400 text-slate-950 border-teal-400 shadow-lg shadow-teal-500/25'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="bg-slate-850 hover:bg-slate-800 text-teal-300 font-semibold px-4.5 py-2.5 rounded-xl border border-slate-800 transition text-xs flex items-center gap-2"
            >
              {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Seed CBSE Sample Chapters
            </button>
          </div>
        </section>

        {/* Upload & Chapters list split */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chapter selection card */}
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-400" /> CBSE Math Chapters
            </h3>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1">
              {chapters.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 text-center">No chapters found. Please seed default sample chapters above or upload NCERT files.</p>
              ) : (
                chapters.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChapterId(ch.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-4 ${
                      selectedChapterId === ch.id
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-850/40'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Chapter {ch.chapter_number}</span>
                      <h4 className="text-xs font-bold text-white mt-1 leading-snug">{ch.title}</h4>
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedChapterId && (
              <button
                onClick={triggerOfflineDownload}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/25 transition text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4.5 h-4.5" /> Download Offline Package
              </button>
            )}

            {downloadProgress && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-teal-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <p className="leading-snug">{downloadProgress}</p>
              </div>
            )}
          </div>

          {/* Upload card */}
          <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-teal-400" /> Upload Textbook & Video lesson
            </h3>

            <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Chapter Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quadratic Equations"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Class</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={uploadClass}
                      onChange={(e) => setUploadClass(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Chapter #</label>
                    <input
                      type="number"
                      min={1}
                      value={uploadNum}
                      onChange={(e) => setUploadNum(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">NCERT PDF File (Max 200MB)</label>
                    <a 
                      href="https://ncert.nic.in/textbook.php?eemh1=0-14" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[9px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-0.5"
                    >
                      Find NCERT Books ↗
                    </a>
                  </div>
                  <input type="file" name="pdf" accept=".pdf" required className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-teal-300 file:cursor-pointer hover:file:bg-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Teacher Lesson Video (Max 5GB)</label>
                  <input type="file" name="video" accept="video/*" required className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-teal-300 file:cursor-pointer hover:file:bg-slate-700" />
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-between gap-4 mt-2">
                <button
                  type="submit"
                  disabled={!!uploadProgress}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-teal-500/25 transition text-xs disabled:opacity-50"
                >
                  Upload & Process
                </button>

                {uploadProgress && (
                  <p className="text-xs text-teal-300 flex items-center gap-1.5 animate-pulse font-semibold">
                    <RefreshCw className="w-4 h-4 animate-spin" /> {uploadProgress}
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* Tab switcher for workspace details */}
        <section className="flex border-b border-slate-800/80 gap-6 select-none">
          <button
            onClick={() => setActiveTab('study')}
            className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider transition ${
              activeTab === 'study'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Study & Solve Workspace
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider transition ${
              activeTab === 'analytics'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Class Analytics Dashboard
          </button>
        </section>

        {/* Active Study Panel */}
        {activeTab === 'study' && chapterDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left side column: Player & whiteboard */}
            <div className="lg:col-span-7 space-y-6">
              <VideoPlayer
                chapterId={selectedChapterId!}
                videoUrl={chapterDetails.chapter?.video_url || '#'}
                formulas={chapterDetails.chapter?.formulas || []}
                onAskAI={(contextText, concept) => {
                  setTutorQuery(contextText);
                  setTutorConcept(concept);
                }}
              />

              <Whiteboard
                questionId={chapterDetails.questions[0]?.id || "default"}
                correctAnswer={chapterDetails.questions[0]?.correct_answer || ""}
              />
            </div>

            {/* Right side column: practice & tutor */}
            <div className="lg:col-span-5 space-y-6">
              <PracticeEngine
                questions={chapterDetails.questions as QuestionData[]}
              />

              <AITutor
                chapterId={selectedChapterId!}
                initialQuery={tutorQuery}
                initialConcept={tutorConcept}
              />
            </div>
          </div>
        )}

        {/* Active Analytics Panel */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex gap-3 justify-end">
              {[
                { role: 'student', label: 'Student View', icon: BarChart2 },
                { role: 'parent', label: 'Parent Monitoring', icon: ShieldAlert },
                { role: 'teacher', label: 'Teacher Admin', icon: Users }
              ].map(item => (
                <button
                  key={item.role}
                  onClick={() => setDashboardRole(item.role as any)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 border transition ${
                    dashboardRole === item.role
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                      : 'bg-slate-900/30 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" /> {item.label}
                </button>
              ))}
            </div>

            <div className="animate-fade-in">
              {dashboardRole === 'student' && (
                <StudentDashboard
                  stats={{
                    student_name: "Aditya Verma",
                    class_level: selectedClass,
                    total_learning_time_minutes: 185.0,
                    current_streak: 4,
                    mastery_by_chapter: chapters.map((ch, idx) => ({
                      chapter_number: ch.chapter_number,
                      chapter_title: ch.title,
                      mastery_score: idx === 0 ? 82 : 45,
                      practice_completed: idx === 0 ? 9 : 3
                    })),
                    weak_topics: ["Trigonometric angles"],
                    strong_topics: ["Quadratic factorization"],
                    radar_skills: {
                      "Knowledge": 75,
                      "Understanding": 80,
                      "Application": 60,
                      "Reasoning": 70,
                      "Analysis": 50,
                      "Problem Solving": 68
                    }
                  }}
                />
              )}

              {dashboardRole === 'parent' && (
                <ParentDashboard
                  stats={{
                    student_name: "Aditya Verma",
                    class_level: selectedClass,
                    daily_study_time_average_minutes: 42.0,
                    total_learning_time_hours: 3.2,
                    practice_completed: 12,
                    learning_trend: [
                      { date: 'Mon', minutes: 30 },
                      { date: 'Tue', minutes: 45 },
                      { date: 'Wed', minutes: 20 },
                      { date: 'Thu', minutes: 50 },
                      { date: 'Fri', minutes: 15 },
                      { date: 'Sat', minutes: 90 },
                      { date: 'Sun', minutes: 40 }
                    ],
                    message: "Aditya is showing great focus on math chapters but needs revision on formula listings this weekend."
                  }}
                />
              )}

              {dashboardRole === 'teacher' && (
                <TeacherDashboard
                  stats={{
                    class_level: selectedClass,
                    total_students: 24,
                    class_average_mastery: 68.0,
                    common_mistakes: [
                      "Arithmetic signs confusion in step factorization",
                      "Standard trigonometric values confusion for angles 45 and 60"
                    ],
                    students_performance: [
                      { name: "Aditya Verma", average_mastery: 82, completed_chapters: 2 },
                      { name: "Preeti Sharma", average_mastery: 55, completed_chapters: 1 },
                      { name: "Rohan Das", average_mastery: 70, completed_chapters: 2 }
                    ]
                  }}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
