'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Edit2, RefreshCw, CheckCircle, AlertTriangle, HelpCircle, Upload, X, Trash, Undo } from 'lucide-react';
import { evaluateWhiteboard } from '../../lib/api';

interface WhiteboardProps {
  questionId: string;
  correctAnswer: string;
  onEvaluationComplete?: (score: number) => void;
}

export default function Whiteboard({ questionId, correctAnswer, onEvaluationComplete }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2dd4bf'); // teal-400
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  
  // OCR Text Input option if the student doesn't want to draw or wants to explain their steps
  const [mathText, setMathText] = useState('');
  
  // File upload variables
  const [imageFile, setImageFile] = useState<string | null>(null);
  
  // Grading result state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  // Setup Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set resolution sizes
    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = 300;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    
    // Clear canvas white background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Update stroke values
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save history step before drawing
    setHistory([...history, canvas.toDataURL()]);

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setEvaluation(null);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory(history.slice(0, -1));
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const insertMathSymbol = (symbol: string) => {
    setMathText(prev => prev + symbol);
  };

  const triggerEvaluation = async () => {
    setIsEvaluating(true);
    setEvaluation(null);
    try {
      // Gather text or image
      const inputData = mathText || "Drawn equations in canvas";
      const base64Image = imageFile ? imageFile.split(',')[1] : undefined;
      
      const res = await evaluateWhiteboard(questionId, inputData, base64Image);
      setEvaluation(res);
      
      if (onEvaluationComplete && res.eval_score !== undefined) {
        onEvaluationComplete(res.eval_score);
      }
    } catch (err) {
      console.error(err);
      alert("Evaluation failed. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-teal-400" /> AI Interactive Whiteboard
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Solve the problem by writing equations, drawing, or uploading a picture.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Colors */}
          {['#2dd4bf', '#3b82f6', '#f43f5e', '#ffffff'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full border border-slate-700 transition"
              style={{ backgroundColor: c, transform: color === c ? 'scale(1.2)' : 'none' }}
            />
          ))}
          <div className="h-6 w-px bg-slate-800 mx-2" />
          <button onClick={undoLast} disabled={history.length === 0} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-50" title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={clearBoard} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 border border-slate-700" title="Clear Canvas">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Canvas Drawing */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full bg-slate-950 cursor-crosshair blockTouch"
            />
            {imageFile && (
              <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-4">
                <div className="relative max-w-full max-h-full">
                  <img src={imageFile} alt="Handwritten solution" className="max-h-[260px] rounded-lg border border-slate-700 object-contain" />
                  <button onClick={() => setImageFile(null)} className="absolute -top-3 -right-3 p-1 rounded-full bg-red-500 text-white shadow-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Equation Editor panel */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Equation Writer</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Write your math equations steps here (e.g. x^2 - 5x + 6 = 0)"
                value={mathText}
                onChange={(e) => setMathText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-teal-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
            
            {/* Quick Symbols */}
            <div className="flex flex-wrap gap-1.5">
              {['x', 'y', '^2', '\\sqrt{}', '=', '+', '-', '\\pm', '\\theta', '\\sin', '\\cos', '\\tan'].map(sym => (
                <button
                  key={sym}
                  onClick={() => insertMathSymbol(sym)}
                  className="text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-teal-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Submission controls & upload */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 flex flex-col gap-4 justify-between h-full">
            <div className="space-y-3">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Submit handwritten notebook page</label>
              <div className="relative border-2 border-dashed border-slate-800 rounded-xl p-4 text-center cursor-pointer hover:border-teal-500/40 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Click to upload photo of your steps</p>
              </div>
            </div>

            <button
              onClick={triggerEvaluation}
              disabled={isEvaluating}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-teal-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Evaluating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Submit to AI Tutor
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Evaluation results panel */}
      {evaluation && (
        <div className="mt-4 border-t border-slate-800 pt-6 animate-fade-in space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                evaluation.is_correct === 'correct' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : evaluation.is_correct === 'partial'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {evaluation.is_correct === 'correct' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Evaluation Result</p>
                <p className="text-lg font-bold text-white">
                  {evaluation.is_correct === 'correct' ? 'Correct Solution!' : evaluation.is_correct === 'partial' ? 'Partial Correctness' : 'Incorrect Solution'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">AI Score Marks</p>
              <p className="text-2xl font-black text-teal-400">{evaluation.eval_score} / 100</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluation.calculation_mistakes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Calculation Mistakes
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  {evaluation.calculation_mistakes.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.missing_steps?.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" /> Missing Key Steps
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  {evaluation.missing_steps.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Teacher Feedback</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{evaluation.feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}
