'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, FastForward, Bookmark, Brain, ChevronRight } from 'lucide-react';
import { db } from '../../lib/db';

interface TranscriptSegment {
  concept_title: string;
  start_time: number;
  end_time: number;
  text: string;
}

interface VideoPlayerProps {
  chapterId: string;
  videoUrl: string;
  formulas: any[];
  onAskAI?: (contextText: string, concept: string) => void;
}

export default function VideoPlayer({ chapterId, videoUrl, formulas, onAskAI }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoSrc, setVideoSrc] = useState(videoUrl);
  
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [activeConcept, setActiveConcept] = useState<string>('Introduction');
  
  // Custom mock transcripts aligned to typical CBSE math chapters
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([
    { concept_title: "Introduction", start_time: 0, end_time: 25, text: "Welcome class! Today we will explore a vital K-12 math chapter." },
    { concept_title: "Core Concepts", start_time: 26, end_time: 90, text: "Let's review the main textbook sections and structural definitions." },
    { concept_title: "Formulas & Proofs", start_time: 91, end_time: 180, text: "Now we derive the key equations and formulas. Take down notes on the formulas shown on the whiteboard." },
    { concept_title: "Worked Examples", start_time: 181, end_time: 300, text: "Let's solve some Board questions and HOTS level case studies step-by-step." }
  ]);

  // Load local blob if offline
  useEffect(() => {
    async function loadOfflineVideo() {
      let hasLocal = false;
      try {
        const fileRecord = await db.files.get(chapterId);
        if (fileRecord?.videoBlob) {
          const localUrl = URL.createObjectURL(fileRecord.videoBlob);
          setVideoSrc(localUrl);
          console.log("Loaded video from IndexedDB storage!");
          hasLocal = true;
        }
      } catch (err) {
        console.warn("Could not load local video blob:", err);
      }

      if (!hasLocal) {
        const urlStr = videoUrl || '';
        if (urlStr.includes('mock_chapter') || urlStr === '#' || !urlStr) {
          // Reliable public educational placeholder video stream
          setVideoSrc("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
        } else {
          setVideoSrc(urlStr);
        }
      }
      setIsPlaying(false);
    }
    loadOfflineVideo();
  }, [chapterId, videoUrl]);

  // Sync concept timeline
  useEffect(() => {
    const active = transcripts.find(t => currentTime >= t.start_time && currentTime <= t.end_time);
    if (active && active.concept_title !== activeConcept) {
      setActiveConcept(active.concept_title);
      // Auto-scroll active transcript line
      const activeEl = document.getElementById(`seg-${active.start_time}`);
      if (activeEl && transcriptContainerRef.current) {
        transcriptContainerRef.current.scrollTo({
          top: activeEl.offsetTop - 120,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, transcripts, activeConcept]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skipToTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const changeSpeed = () => {
    if (!videoRef.current) return;
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.25;
    else if (playbackRate === 1.25) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;
    
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const addBookmark = () => {
    if (bookmarks.includes(currentTime)) return;
    setBookmarks([...bookmarks, currentTime].sort((a, b) => a - b));
  };

  const triggerAskAI = () => {
    if (!onAskAI) return;
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    const currentSegment = transcripts.find(t => currentTime >= t.start_time && currentTime <= t.end_time);
    const contextText = currentSegment ? currentSegment.text : "Teacher lesson topic";
    onAskAI(contextText, activeConcept);
  };

  // Find if there is a formula to overlay for the current concept
  const activeFormula = formulas?.find(f => {
    const fLower = f.explanation?.toLowerCase() || "";
    return fLower.includes(activeConcept.toLowerCase()) || activeConcept.toLowerCase().includes(fLower);
  }) || formulas?.[0];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800">
      
      {/* Left: Video Player */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group">
          <video
            key={videoSrc}
            ref={videoRef}
            src={videoSrc}
            controls
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
          />

          {/* Formula Overlay */}
          {activeFormula && (
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-teal-500/30 flex items-center gap-2 max-w-[80%] animate-pulse z-20">
              <Brain className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Concept Formula</p>
                <p className="text-sm font-mono text-teal-200">{activeFormula.formula}</p>
              </div>
            </div>
          )}

          {/* Big center play icon on hover when paused */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-20"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 rounded-full bg-teal-500/95 flex items-center justify-center shadow-lg shadow-teal-500/35 transition hover:scale-110">
                <Play className="w-8 h-8 text-slate-950 fill-slate-950 translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Custom Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-3 z-20">
            {/* Timeline slider */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-teal-400 cursor-pointer h-1 rounded-lg"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-white hover:text-teal-400 transition">
                  {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
                </button>
                <span className="text-xs text-slate-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/20 uppercase">
                  {activeConcept}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={changeSpeed} className="text-xs font-mono font-bold text-white hover:text-teal-400 bg-slate-800 px-2 py-1 rounded transition border border-slate-700">
                  {playbackRate}x
                </button>
                <button onClick={addBookmark} title="Add Bookmark" className="text-white hover:text-teal-400 transition">
                  <Bookmark className="w-5 h-5" />
                </button>
                <button onClick={triggerAskAI} className="flex items-center gap-1 text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-teal-500/25 transition">
                  <Brain className="w-4 h-4" /> Pause & Ask AI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookmarks Timeline */}
        {bookmarks.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1"><Bookmark className="w-4.5 h-4.5 text-teal-400" /> Bookmarks:</span>
            {bookmarks.map((time, idx) => (
              <button
                key={idx}
                onClick={() => skipToTime(time)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1 transition"
              >
                {formatTime(time)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Sync Clickable Transcript */}
      <div className="flex flex-col gap-3 h-[280px] lg:h-auto">
        <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-teal-400" /> Clickable Transcript
        </h3>
        
        <div 
          ref={transcriptContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent rounded-2xl bg-slate-900/50 p-4 border border-slate-800 space-y-3"
        >
          {transcripts.map((seg) => {
            const isActive = currentTime >= seg.start_time && currentTime <= seg.end_time;
            return (
              <div
                key={seg.start_time}
                id={`seg-${seg.start_time}`}
                onClick={() => skipToTime(seg.start_time)}
                className={`p-3 rounded-xl cursor-pointer border transition duration-200 ${
                  isActive 
                    ? 'bg-teal-500/10 border-teal-500/40 shadow-inner shadow-teal-500/5' 
                    : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-teal-400' : 'text-slate-400'}`}>
                    {seg.concept_title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {formatTime(seg.start_time)}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isActive ? 'text-white font-medium' : 'text-slate-300'}`}>
                  {seg.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
