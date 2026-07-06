'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, Download, Sparkles, AlertCircle, Wifi, WifiOff, RefreshCw, BarChart2, ShieldAlert, Users, Trash2, Brain, Video, CheckCircle2, ChevronRight, GraduationCap, FileText, Play, AlertTriangle, HelpCircle, X } from 'lucide-react';

import PracticeEngine, { QuestionData } from '../components/practice';
import VideoPlayer from '../components/video-player';

import { fetchChapters, fetchChapter, downloadChapterOffline, isOnline as checkOnline, API_BASE_URL, resolveUploadUrl, deleteChapter } from '../lib/api';
import { db } from '../lib/db';

export default function Home() {
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mathwinner_selected_class');
      return saved ? parseInt(saved, 10) : 5; // Default to Class 5
    }
    return 5;
  });

  useEffect(() => {
    const started = localStorage.getItem('mathwinner_journey_started');
    if (started === 'true') {
      setJourneyStarted(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('mathwinner_selected_class', selectedClass.toString());
  }, [selectedClass]);

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
  const [notification, setNotification] = useState<string | null>(null);
  
  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  useEffect(() => {
    const msg = localStorage.getItem('mathwinner_delete_msg');
    if (msg) {
      setNotification(msg);
      localStorage.removeItem('mathwinner_delete_msg');
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);
  
  // Form Upload state
  const [uploadNum, setUploadNum] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mathwinner_upload_num');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  const [uploadTitle, setUploadTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mathwinner_upload_title') || '';
    }
    return '';
  });

  // Sync upload form inputs to localStorage
  useEffect(() => {
    localStorage.setItem('mathwinner_upload_title', uploadTitle);
  }, [uploadTitle]);

  useEffect(() => {
    localStorage.setItem('mathwinner_upload_num', uploadNum.toString());
  }, [uploadNum]);

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

  const handleDeleteChapter = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid triggering card selection
    if (!confirm("Are you sure you want to delete this chapter and all its cached files?")) return;
    
    try {
      await deleteChapter(id);
      
      // If we deleted the actively selected chapter, clear active details view
      if (selectedChapterId === id) {
        selectChapter(null);
      }
      
      setNotification("Chapter deleted successfully");
      setTimeout(() => setNotification(null), 3000);
      
      await loadChaptersList();
    } catch (err) {
      console.warn("Failed to delete chapter:", err);
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
          id: data.chapter_id,
          pdfBlob: pdfFile,
          videoBlob: videoFile
        });
      } catch (dbErr) {
        console.warn("Failed to save media blobs to IndexedDB:", dbErr);
      }

      // Auto-select the newly uploaded chapter
      selectChapter(data.chapter_id);
      
      setTimeout(async () => {
        setUploadProgress(null);
        setUploadTitle('');
        setUploadNum(prev => prev + 1);
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
      localStorage.setItem('mathwinner_delete_msg', 'Offline database cache cleared successfully');
      window.location.reload();
    }
  };

  if (!journeyStarted) {
    const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (username.trim() === 'admin' && password === 'admin123') {
        setJourneyStarted(true);
        localStorage.setItem('mathwinner_journey_started', 'true');
        setLoginError(null);
      } else {
        setLoginError('Invalid username or password. (Hint: admin / admin123)');
      }
    };

    return (
      <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col md:flex-row min-h-screen relative overflow-hidden selection:bg-teal-500/30 selection:text-teal-200">
        {/* Background Grids */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 z-0"></div>
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none z-0"></div>

        {/* Left Pane: Philosophy & Flow */}
        <div className="flex-1 flex flex-col justify-center p-8 md:p-16 z-10 relative overflow-y-auto max-h-screen border-r border-slate-900 bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-xl space-y-8">
            {/* Branding header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-3xl bg-gradient-to-tr from-teal-400 to-blue-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-teal-500/20">
                  W
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-wider uppercase text-white">
                    MathWinner AI
                  </h1>
                  <span className="inline-block text-[9px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    CBSE K-12 Pedagogy
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                India's National Education Policy (NEP) 2020 grounded mathematics simulator designed to shift learning from rote memorization to hands-on conceptual clarity.
              </p>
            </div>

            {/* Stepper Flow */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Student Learning Flow
              </h3>
              
              <div className="relative border-l border-slate-800 pl-6 space-y-6">
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-slate-950 border border-teal-500/50 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">1. Select Class Level</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Filter CBSE curriculum mapping instantly by Class 1 to 12.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">2. Upload / Select Chapter</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Choose pre-seeded lessons or upload custom textbook PDFs and teacher videos.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">3. Learn Hands-on with Video & AI</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Watch lesson videos mapped to structured concepts with dynamic timestamps.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">4. Master with MathWinner Tool Kit (Hero Product)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Haptic (tactile/touch) learning drives cognitive retention. Physically manipulate the scales, tapes, and conversion cards to model concepts in real-time.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">5. Take SAFAL Competency Exam</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Solve diagnostic assessments testing conceptual application instead of rote retrieval.</p>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">6. Identify Opportunities for Improvement</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Get competency scorecard diagnostics pinpointing precise areas of guidance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 z-10 relative">
          <div className="bg-slate-900/40 p-8 md:p-10 rounded-3xl border border-slate-800/80 backdrop-blur-md max-w-sm w-full shadow-2xl flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white tracking-wide">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">Access the offline-first classroom simulator</p>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-2xl text-[11px] font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-lg shadow-teal-500/15 hover:shadow-teal-500/25 transition duration-200 cursor-pointer"
              >
                Login
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800/60">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Demo Credentials</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Username: <span className="text-teal-400 font-mono">admin</span> | Password: <span className="text-teal-400 font-mono">admin123</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col font-sans">
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

      {/* Notification Toast */}
      {notification && (
        <div 
          style={{ animation: 'slideDown 0.25s ease-out forwards' }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-950/95 border border-emerald-500/30 text-emerald-300 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs backdrop-blur-md animate-fade-in"
        >
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" /> {notification}
        </div>
      )}

      {/* User Manual Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full max-h-[85vh] rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden animate-fade-in text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  MathWinner AI Platform: User Guide & Manual
                </h2>
              </div>
              <button 
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  1. Student Learning Flow
                </h3>
                <p className="text-[11px] text-slate-400">
                  MathWinner AI shifts K-12 mathematics education from memorization to outcomes-based mastery under NEP-2020 diagnostic guidelines:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1.5">
                  <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl">
                    <span className="font-bold text-teal-400 uppercase text-[9px] tracking-wider block">Step 1: Select Class & Lesson</span>
                    <p className="text-[10px] text-slate-500 mt-1">Select class level (Class 1-12) to instantly filter syllabus. Select a chapter from the sidebar or upload custom textbooks and teacher videos.</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl">
                    <span className="font-bold text-teal-400 uppercase text-[9px] tracking-wider block">Step 2: MathWinner Tool Kit & Haptic Learning</span>
                    <p className="text-[10px] text-slate-500 mt-1">Watch lesson videos on the left. Simultaneously engage in haptic (touch-based) learning by physically interacting with measuring tapes, conversion cards, and geometric scales in the MathWinner Tool Kit (Hero Product).</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl">
                    <span className="font-bold text-teal-400 uppercase text-[9px] tracking-wider block">Step 3: Solve Competency Quiz</span>
                    <p className="text-[10px] text-slate-500 mt-1">Unlock the MCQ Test. Solve standard CBSE case scenarios testing conceptual application rather than memorizing formula lists.</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-850 p-3.5 rounded-2xl">
                    <span className="font-bold text-teal-400 uppercase text-[9px] tracking-wider block">Step 4: Inspect Outcome Diagnostics</span>
                    <p className="text-[10px] text-slate-500 mt-1">View step-by-step solutions for errors. Analyze the outcome diagnostics card pinpointing exact conceptual gaps for guidance.</p>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  2. Step-by-Step Actions Guide
                </h3>
                <ul className="space-y-2.5 list-disc pl-4 text-[11px] text-slate-400">
                  <li>
                    <strong className="text-slate-200">Switching Class Levels:</strong> Click Class buttons in sidebar header. Chapters list updates immediately.
                  </li>
                  <li>
                    <strong className="text-slate-200">Uploading Custom Material:</strong> Fill title and chapter number, attach NCERT Textbook chapter PDF, attach lesson video (.mp4 under 25MB to run Whisper API), click Upload.
                  </li>
                  <li>
                    <strong className="text-slate-200">Video timeline navigation:</strong> Watch overlay formulas adjust during topics. Double click or tap bookmarks to skip precisely.
                  </li>
                  <li>
                    <strong className="text-slate-250">Deleting custom chapters:</strong> Hover over sidebar cards and click the Trash icon. Wipes local cache and Neon database records automatically.
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  3. Educational Philosophy: Haptics & SAFAL
                </h3>
                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl overflow-hidden p-3.5 text-[10px] text-slate-500 leading-normal space-y-1.5">
                  <p>
                    Traditional tests encourage rote memorization of formulas. MathWinner AI is built on the philosophy that <span className="text-teal-400 font-semibold">haptic (tactile/touch) manipulation</span> of physical toolkits is the most effective bridge to internalize abstract concepts.
                  </p>
                  <p>
                    By coupling physical toolkit experiments (hero product) with video theory and CBSE's <span className="text-teal-400 font-semibold">Structured Assessment for Analyzing Learning (SAFAL)</span> diagnostic questions, we target the exact logical phase of conceptual misunderstandings instead of generic pass/fail scoring.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowManualModal(false)}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2.5 px-6 rounded-xl transition cursor-pointer"
              >
                Got It, Close
              </button>
            </div>

          </div>
        </div>
      )}

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualModal(true)}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-teal-300 font-bold border border-slate-750 transition cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-teal-400" /> User Manual
          </button>

          <button
            onClick={() => {
              setJourneyStarted(false);
              localStorage.removeItem('mathwinner_journey_started');
            }}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition cursor-pointer"
          >
            Log Out
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
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between gap-3.5 group/card ${
                      selectedChapterId === ch.id
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-850/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Tiny Video Thumbnail Preview */}
                      <div className="w-12 h-8 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shrink-0 relative">
                        <video 
                          src={ch.video_url ? resolveUploadUrl(ch.video_url) : '#'} 
                          preload="metadata" 
                          muted
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 text-white fill-white translate-x-[0.5px]" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Chapter {ch.chapter_number}</span>
                        <h4 className="text-xs font-bold text-white mt-0.5 leading-snug truncate">{ch.title}</h4>
                      </div>
                    </div>

                    {/* Delete Action Trigger */}
                    <span
                      onClick={(e) => handleDeleteChapter(e, ch.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover/card:opacity-100 focus:opacity-100 shrink-0 cursor-pointer"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Upload card */}
          <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
            {chapterDetails ? (
              // Active Chapter Details Mode
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5" /> Active Chapter Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Chapter Title</span>
                        <p className="text-sm font-bold text-white mt-1">{chapterDetails.title}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Class Level</span>
                          <p className="text-sm font-bold text-white mt-1">Class {chapterDetails.class_level}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Chapter Number</span>
                          <p className="text-sm font-bold text-white mt-1">Chapter {chapterDetails.chapter_number}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Uploaded Content Status</span>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4.5 h-4.5" /> NCERT Textbook PDF (Loaded)
                        </div>
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4.5 h-4.5" /> Teacher Video Lesson (Loaded)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      // Switch to uploading a new chapter by clearing selection
                      selectChapter(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 px-6 rounded-xl border border-slate-700 transition text-xs cursor-pointer"
                  >
                    + Upload Another Chapter
                  </button>
                </div>
              </div>
            ) : (
              // Upload New Chapter Mode
              <>
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
              </>
            )}
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
                    transcript={chapterDetails.transcript}
                  />
                </div>

                {/* Right side: MathWinner Tool Kit Stack */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* 1. MathWinner Tool Kit Card */}
                  <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
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
                  </div>

                  {/* 2. Ready to Test / Processing / Error Box Stack */}
                  {chapterDetails.summary && chapterDetails.summary.startsWith("Processing failed:") ? (
                    <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-3.5 shadow-xl text-left">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-400" /> AI Analysis Failed
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          The background task crashed on the server:
                        </p>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl font-mono text-[10px] text-rose-300 break-words leading-relaxed select-text max-h-[120px] overflow-y-auto">
                        {chapterDetails.summary.substring(18)}
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Please delete this chapter and upload a fresh video file (under 25MB).
                      </p>
                    </div>
                  ) : chapterDetails.summary && chapterDetails.summary.startsWith("Processing") ? (
                    <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-4 shadow-xl text-left">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> AI Processing Active
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          We are transcribing your video lesson and generating the CBSE SAFAL exam questions. This takes about 30–45 seconds.
                        </p>
                      </div>
                      <div className="w-full bg-slate-950/60 border border-slate-850 p-4.5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mb-2"></div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider animate-pulse">Running Whisper & GPT...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-4 shadow-xl">
                      <div className="space-y-1 text-left">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-teal-400" /> Ready to Test?
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                          Complete your hands-on toolkit experiments and video theory before starting the exam.
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setMcqUnlocked(true)}
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        I am ready with the concept, start MCQ Test →
                      </button>
                    </div>
                  )}
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

                {/* Outdated Exam Warning & Regenerator */}
                {chapterDetails.questions && chapterDetails.questions.length < 5 && (
                  <div className="bg-amber-950/25 border border-amber-500/30 p-4.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                    <div className="space-y-1 text-left">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" /> Outdated Exam Cached ({chapterDetails.questions.length} questions)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        This chapter's diagnostic test was generated under previous limits. Re-generate to instantly load the full 6-question SAFAL diagnostic exam.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          setUploadProgress("Regenerating exam questions...");
                          const response = await fetch(`${API_BASE_URL}/chapters/${selectedChapterId}/regenerate-questions`, {
                            method: "POST"
                          });
                          if (!response.ok) throw new Error("Failed to regenerate");
                          
                          setNotification("Exam questions regenerated successfully!");
                          setTimeout(() => setNotification(null), 3000);
                          
                          // Reload active chapter details to fetch fresh questions
                          await loadChaptersList();
                          if (selectedChapterId) {
                            const updated = await fetchChapter(selectedChapterId);
                            setChapterDetails(updated);
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Failed to regenerate questions. Ensure backend is online.");
                        } finally {
                          setUploadProgress(null);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 px-4 rounded-xl shadow-lg transition whitespace-nowrap cursor-pointer shrink-0"
                    >
                      Regenerate Exam
                    </button>
                  </div>
                )}
                
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
