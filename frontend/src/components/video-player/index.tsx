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
  transcript?: TranscriptSegment[];
  onAskAI?: (contextText: string, concept: string) => void;
}

function formatFormulaText(formula: string): string {
  if (!formula) return '';
  let result = formula;
  
  // Replace spacing markers
  result = result.replace(/\\,/g, ' ');
  result = result.replace(/\\;/g, ' ');
  result = result.replace(/\\quad/g, '   ');
  
  // Extract text from \text{...}
  result = result.replace(/\\text\{([^}]+)\}/g, '$1');
  
  // Replace Greek letters
  result = result.replace(/\\theta/g, 'θ');
  result = result.replace(/\\pi/g, 'π');
  result = result.replace(/\\alpha/g, 'α');
  result = result.replace(/\\beta/g, 'β');
  result = result.replace(/\\gamma/g, 'γ');
  result = result.replace(/\\delta/g, 'δ');
  
  // Replace common trigonometric and math functions
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\tan/g, 'tan');
  result = result.replace(/\\cot/g, 'cot');
  result = result.replace(/\\sec/g, 'sec');
  result = result.replace(/\\csc/g, 'csc');
  
  // Replace superscripts
  result = result.replace(/\^2/g, '²');
  result = result.replace(/\^3/g, '³');
  result = result.replace(/\^n/g, 'ⁿ');
  
  // Replace symbols
  result = result.replace(/\\circ/g, '°');
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\le/g, '≤');
  result = result.replace(/\\ge/g, '≥');
  result = result.replace(/\\ne/g, '≠');
  
  // Remove remaining backslashes
  result = result.replace(/\\/g, '');
  
  // Clean up whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

export default function VideoPlayer({ chapterId, videoUrl, formulas, transcript, onAskAI }: VideoPlayerProps) {
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
  
  // Custom mock transcripts aligned to K-12 chapters
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

    if (transcript && transcript.length > 0) {
      setTranscripts(transcript);
    } else {
      setTranscripts([
        { concept_title: "Introduction", start_time: 0, end_time: 25, text: "Welcome class! Today we will explore a vital K-12 math chapter." },
        { concept_title: "Core Concepts", start_time: 26, end_time: 90, text: "Let's review the main textbook sections and structural definitions." },
        { concept_title: "Formulas & Proofs", start_time: 91, end_time: 180, text: "Now we derive the key equations and formulas. Take down notes on the formulas shown on the whiteboard." },
        { concept_title: "Worked Examples", start_time: 181, end_time: 300, text: "Let's solve some Board questions and HOTS level case studies step-by-step." }
      ]);
    }
  }, [chapterId, videoUrl, transcript]);

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

  const handleVideoError = () => {
    console.warn("Video failed to load, falling back to placeholder stream.");
    const fallbackUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    if (videoSrc !== fallbackUrl) {
      setVideoSrc(fallbackUrl);
    }
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
    <div className="flex flex-col gap-4 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800">
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
          onError={handleVideoError}
        />

        {/* Formula Overlay */}
        {activeFormula && (
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-teal-500/30 flex items-center gap-2 max-w-[80%] animate-pulse z-20">
            <Brain className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Concept Formula</p>
              <p className="text-sm font-mono text-teal-200">{formatFormulaText(activeFormula.formula)}</p>
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
  );
}
