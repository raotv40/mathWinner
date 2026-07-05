'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, Download, Sparkles, AlertCircle, Wifi, WifiOff, RefreshCw, BarChart2, ShieldAlert, Users, Trash2, Brain, Video, CheckCircle2, ChevronRight, GraduationCap, FileText } from 'lucide-react';

import PracticeEngine, { QuestionData } from '../components/practice';
import VideoPlayer from '../components/video-player';

import { fetchChapters, fetchChapter, downloadChapterOffline, isOnline as checkOnline, API_BASE_URL, resolveUploadUrl } from '../lib/api';
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
  const [mcqUnlocked, setMcqUnlocked] = useState(false);
  
  // Simulation of connection toggle for testing
  const [onlineStatus, setOnlineStatus] = useState(true);
  
  // Uploading states
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  // Form Upload state
  const [uploadNum, setUploadNum] = useState(1);
  const [uploadTitle, setUploadTitle] = useState('');

  // Selected video source blob URL / fallbacks
  const [videoSrc, setVideoSrc] = useState<string>('#');

  // Custom chapter selector wrapping localStorage sync
  const selectChapter = (id: string | null) => {
    setSelectedChapterId(id);
    if (id) {
      localStorage.setItem('mathwinner_selected_chapter_id', id);
    } else {
      localStorage.removeItem('mathwinner_selected_chapter_id');
    }
  };

  useEffect(() => {
    if (!selectedChapterId) {
      setVideoSrc('#');
      return;
    }
    
    async function resolveMedia() {
      // 1. Try loading from local IndexedDB first
      try {
        const fileRecord = await db.files.get(selectedChapterId!);
        if (fileRecord && fileRecord.videoBlob) {
          const blobUrl = URL.createObjectURL(fileRecord.videoBlob);
          setVideoSrc(blobUrl);
          return;
        }
      } catch (err) {
        console.warn("Failed to read from Dexie files table:", err);
      }
      
      // 2. Fallback to API server resolved URL
      if (chapterDetails && chapterDetails.video_url) {
        setVideoSrc(resolveUploadUrl(chapterDetails.video_url));
      } else {
        setVideoSrc('#');
      }
    }
    
    resolveMedia();
  }, [selectedChapterId, chapterDetails]);

  // Load chapters
  const loadChaptersList = async () => {
    try {
      const data = await fetchChapters(selectedClass);
      setChapters(data);
      
      const savedId = localStorage.getItem('mathwinner_selected_chapter_id');
      const hasSaved = data.some(ch => ch.id === savedId);
      
      if (hasSaved) {
        selectChapter(savedId);
      } else {
        const hasSelected = data.some(ch => ch.id === selectedChapterId);
        if (data.length > 0 && (!selectedChapterId || !hasSelected)) {
          selectChapter(data[0].id);
        }
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
    
    setMcqUnlocked(false);
    
    async function loadDetails() {
      try {
        const details = await fetchChapter(selectedChapterId!);
        // Fetch practice questions either from API or offline DB
        let qs: any[] = [];
        if (!checkOnline() || !onlineStatus) {
          qs = await db.questions.where('chapter_id').equals(selectedChapterId!).toArray();
        } else {
          // fetch from api helper
          const res = await fetch(`${API_BASE_URL}/practice/${selectedChapterId}`);
          if (res.ok) qs = await res.json();
        }
        
        const isClass5 = details.class_level === 5 || selectedClass === 5;
        const defaultQuestions = isClass5 ? [
          {
            id: "q-class5-1",
            difficulty: "easy",
            category: "board",
            question_text: "Convert 5 kilometers (km) into meters (m).",
            question_type: "mcq",
            options: ["50 m", "500 m", "5000 m", "50000 m"],
            correct_answer: "5000 m",
            hints: ["Recall that 1 km = 1000 m.", "Multiply 5 by 1000."],
            step_by_step_solution: [
              { step: "1", instruction: "Conversion formula: 1 km = 1000 m." },
              { step: "2", instruction: "Multiply: 5 × 1000 = 5000 m." }
            ]
          },
          {
            id: "q-class5-2",
            difficulty: "medium",
            category: "board",
            question_text: "A line segment is 2 meters and 45 centimeters long. What is its length in centimeters (cm)?",
            question_type: "mcq",
            options: ["245 cm", "2045 cm", "2450 cm", "24.5 cm"],
            correct_answer: "245 cm",
            hints: ["1 meter = 100 cm.", "Convert 2 meters to cm and add 45 cm."],
            step_by_step_solution: [
              { step: "1", instruction: "Convert meters: 2 m = 200 cm." },
              { step: "2", instruction: "Add centimeters: 200 cm + 45 cm = 245 cm." }
            ]
          }
        ] : [
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
        ];

        setChapterDetails({
          ...details,
          questions: qs.length > 0 ? qs : defaultQuestions
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
    formData.append("class_level", selectedClass.toString());
    formData.append("chapter_number", uploadNum.toString());
    formData.append("title", uploadTitle);
    formData.append("pdf", pdfFile);
    formData.append("video", videoFile);

    try {
      const res = await fetch(`${API_BASE_URL}/chapters/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadProgress("Extracting PDF concepts & transcribing video audio in background...");
      
      // Save local blobs for persistence across server restarts
      try {
        await db.files.put({
          id: data.id,
          pdfBlob: pdfFile,
          videoBlob: videoFile
        });
      } catch (dbErr) {
        console.warn("Failed to save media blobs to IndexedDB:", dbErr);
      }

      // Auto-select the newly uploaded chapter
      selectChapter(data.id);
      
      setTimeout(async () => {
        setUploadProgress(null);
        await loadChaptersList();
      }, 5000);
    } catch (err) {
      console.error(err);
      setUploadProgress("Failed to upload. Ensure backend API is online.");
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
                <p className="text-xs text-slate-500 p-4 text-center">No chapters found. Please upload textbook & video files below.</p>
              ) : (
                chapters.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => selectChapter(ch.id)}
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
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(parseInt(e.target.value) || 1)}
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

        {/* Active Study Panel - Video & Toolkit Flow */}
        {chapterDetails && (
          <div className="space-y-6">
            {!mcqUnlocked ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
                {/* Left side: Video Player */}
                <div className="lg:col-span-8">
                  <VideoPlayer
                    chapterId={selectedChapterId!}
                    videoUrl={resolveUploadUrl(chapterDetails.video_url) || '#'}
                    formulas={chapterDetails.formulas || []}
                  />
                </div>

                {/* Right side: MathWinner Tool Kit Card */}
                <div className="lg:col-span-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-teal-400" /> MathWinner Tool Kit
                  </h3>
                  
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img 
                      src="/mathwinner_toolkit_class5.png" 
                      alt="MathWinner Toolkit Mockup" 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Class {selectedClass} physical kit</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      This physical math toolkit contains measuring tapes, conversion cards, and scale instruments. 
                      Follow along with the video instructions on the left to learn the concepts!
                    </p>
                  </div>

                  <button
                    onClick={() => setMcqUnlocked(true)}
                    className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-teal-500/25 transition text-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    I am ready with the concept, start MCQ Test →
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
                <div className="flex justify-between items-center px-2">
                  <button
                    onClick={() => setMcqUnlocked(false)}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    ← Review Video & Tool Kit
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">FLOW: 1. Video & Kit (Done) → 2. MCQ Test (Active)</span>
                </div>
                
                <PracticeEngine
                  questions={chapterDetails.questions as QuestionData[]}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
