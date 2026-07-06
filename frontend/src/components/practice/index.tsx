'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronRight, CheckCircle, XCircle, Lightbulb, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  step: string;
  instruction: string;
}

export interface QuestionData {
  id: string;
  difficulty: string;
  category: string;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  hints: string[];
  step_by_step_solution: Step[];
  concept_title?: string;
}

interface PracticeEngineProps {
  questions: QuestionData[];
  onAnswerSubmit?: (questionId: string, isCorrect: boolean) => void;
}

function formatQuestionText(text: string): string {
  if (!text) return '';
  let result = text;
  
  // Replace double dollar delimiters $$math$$ with styled or clean text
  result = result.replace(/\$\$(.*?)\$\$/g, '$1');
  
  // Replace single dollar delimiters $math$ with math text
  result = result.replace(/\$(.*?)\$/g, '$1');
  
  // Replace standard LaTeX symbols if present
  result = result.replace(/\\,/g, ' ');
  result = result.replace(/\\text\{([^}]+)\}/g, '$1');
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\theta/g, 'θ');
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\^2/g, '²');
  result = result.replace(/\^3/g, '³');
  
  return result;
}

export default function PracticeEngine({ questions, onAnswerSubmit }: PracticeEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Hint states
  const [hintsRevealed, setHintsRevealed] = useState<number>(0); // 0 to 3
  // Step solver states
  const [stepsRevealed, setStepsRevealed] = useState<number>(0); // how many steps shown
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Quiz completion and score tracking
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectQuestions, setIncorrectQuestions] = useState<QuestionData[]>([]);

  // Reset quiz state when active questions array changes
  React.useEffect(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setHintsRevealed(0);
    setStepsRevealed(0);
    setShowAnswer(false);
    setQuizCompleted(false);
    setScore(0);
    setIncorrectQuestions([]);
  }, [questions]);

  const activeQuestion = questions[currentIdx];

  if (quizCompleted) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center gap-6 animate-fade-in max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
          <Sparkles className="w-8 h-8" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white uppercase tracking-wider">Practice Completed!</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Congratulations! You have completed all K-12 measurement exercises for this concept.
          </p>
        </div>
        
        <div className="w-full bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex justify-around">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Accuracy</p>
            <p className="text-xl font-bold text-teal-400 mt-1">{questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</p>
          </div>
          <div className="border-r border-slate-800"></div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Score</p>
            <p className="text-xl font-bold text-white mt-1">{score} / {questions.length}</p>
          </div>
        </div>

        {/* Opportunities for Improvement */}
        <div className="w-full bg-slate-950/40 border border-slate-850 p-6 rounded-2xl text-left space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" /> Opportunities for Improvement
            </h4>
            <span className="text-[9px] font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full uppercase">
              NEP-2020 Diagnostic
            </span>
          </div>
          
          {incorrectQuestions.length === 0 ? (
            <div className="bg-emerald-950/20 border border-emerald-500/25 p-4 rounded-xl text-center">
              <p className="text-xs text-emerald-400 font-medium leading-relaxed">
                ✨ Outstanding! You got a perfect score. You have fully mastered all concepts in this practice set. Try a harder class level or class syllabus!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                Our diagnostic engine analyzed your incorrect responses. To improve, focus on the following competency gaps:
              </p>
              
              <div className="space-y-3.5">
                {incorrectQuestions.map((q, idx) => {
                  const txt = q.question_text.toLowerCase();
                  const concept = q.concept_title || "General Competency";
                  
                  let recommendation = {
                    title: `Concept master: ${concept}`,
                    assessment: "Struggled with applying formula logic or solving variables in this specific competency case.",
                    action: "Review the step-by-step AI solution below. Write the formula on the digital whiteboard and practice isolation steps."
                  };

                  if (txt.includes("discriminant") || concept.toLowerCase().includes("discriminant")) {
                    recommendation = {
                      title: "Discriminant & Roots Characterization",
                      assessment: "Calculation error or concept confusion when mapping the discriminant (D = b^2 - 4ac) to the nature of roots (imaginary vs. real).",
                      action: "Action: Open the digital Whiteboard, write D = b^2 - 4ac, and calculate D for equations where coefficients have negative signs."
                    };
                  } else if (txt.includes("roots") || txt.includes("factoriz") || concept.toLowerCase().includes("roots")) {
                    recommendation = {
                      title: "Factorization & Equation Formulation",
                      assessment: "Difficulty in splitting the middle term or correctly factorizing quadratic trinomials to isolate roots.",
                      action: "Action: Re-watch the teacher's video explanation on splitting middle terms, paying close attention to factor sign combinations."
                    };
                  } else if (txt.includes("ladder") || txt.includes("angle of elevation") || concept.toLowerCase().includes("height")) {
                    recommendation = {
                      title: "Heights & Distances Application",
                      assessment: "Struggled with translating word problems into right-angled triangles and selecting correct trigonometric ratios.",
                      action: "Action: Sketch the problem scenario (e.g. wall, ladder, angle) on paper first. Identify which side is adjacent and opposite before selecting ratios."
                    };
                  } else if (txt.includes("sin") || txt.includes("cos") || txt.includes("tan") || concept.toLowerCase().includes("ratio")) {
                    recommendation = {
                      title: "Trigonometric Ratio Formulas",
                      assessment: "Confused sine, cosine, or tangent ratios relative to the base angle, or made errors calculating side ratios.",
                      action: "Action: Remember 'Some School Girls Have Curly Brown Hair Turn Red' (Sine = Opp/Hyp, Cos = Adj/Hyp, Tan = Opp/Adj). Check calculations."
                    };
                  } else if (txt.includes("convert") || txt.includes("km") || txt.includes("cm") || txt.includes("meter")) {
                    recommendation = {
                      title: "Metric Unit Scale Conversions",
                      assessment: "Calculation mismatch converting lengths (e.g. km to meters, or meters to cm) within word problems.",
                      action: "Action: Use the physical conversion sliders inside the MathWinner Tool Kit box. Physical modeling prevents decimal shifts."
                    };
                  } else if (txt.includes("perimeter") || txt.includes("rectangle") || txt.includes("square")) {
                    recommendation = {
                      title: "Geometric Boundaries & Perimeters",
                      assessment: "Misapplied perimeter formula or calculated areas instead of boundary length sums.",
                      action: "Action: Review standard perimeter formulas (Rectangle P = 2(L + W), Square P = 4S) and double-check algebraic dimensions."
                    };
                  }

                  return (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 hover:border-slate-800 transition flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {recommendation.title}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                          Question {questions.indexOf(q) + 1}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <span className="font-semibold text-slate-300">Diagnostic:</span> {recommendation.assessment}
                        </p>
                        <p className="text-xs text-teal-300 font-semibold leading-relaxed flex items-start gap-1">
                          <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                          <span>{recommendation.action}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => {
              setQuizCompleted(false);
              setCurrentIdx(0);
              setSelectedOption(null);
              setIsSubmitted(false);
              setIsCorrect(false);
              setHintsRevealed(0);
              setStepsRevealed(0);
              setShowAnswer(false);
              setScore(0);
            }}
            className="w-full bg-slate-850 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl border border-slate-700 transition text-xs cursor-pointer"
          >
            Retake Practice Set
          </button>
        </div>
      </div>
    );
  }

  if (!activeQuestion) {
    return (
      <div className="text-center p-8 bg-slate-900/40 rounded-3xl border border-slate-800">
        <p className="text-slate-400">No practice questions available for this chapter yet.</p>
      </div>
    );
  }

  const handleOptionSelect = (option: string) => {
    if (isSubmitted) return;
    setSelectedOption(option);
  };

  const submitAnswer = () => {
    if (isSubmitted || !selectedOption) return;
    
    const correct = selectedOption.trim().toLowerCase() === activeQuestion.correct_answer.trim().toLowerCase();
    setIsCorrect(correct);
    setIsSubmitted(true);
    
    // Auto-reveal all solution steps and final answer on verification
    setStepsRevealed(activeQuestion.step_by_step_solution.length);
    setShowAnswer(true);
    
    if (correct) {
      setScore(prev => prev + 1);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#2dd4bf', '#3b82f6', '#10b981']
      });
    } else {
      setIncorrectQuestions(prev => [...prev, activeQuestion]);
    }

    if (onAnswerSubmit) {
      onAnswerSubmit(activeQuestion.id, correct);
    }
  };

  const nextQuestion = () => {
    if (currentIdx === questions.length - 1) {
      setQuizCompleted(true);
      return;
    }
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setHintsRevealed(0);
    setStepsRevealed(0);
    setShowAnswer(false);
    setCurrentIdx((prev) => prev + 1);
  };

  const revealHint = () => {
    if (hintsRevealed < activeQuestion.hints.length) {
      setHintsRevealed(prev => prev + 1);
    }
  };

  const revealNextStep = () => {
    if (stepsRevealed < activeQuestion.step_by_step_solution.length) {
      setStepsRevealed(prev => prev + 1);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 flex flex-col gap-6">
      
      {/* Top Details */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-850 border border-slate-800 text-slate-300 font-mono">
            Q {currentIdx + 1} of {questions.length}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
            activeQuestion.difficulty === 'easy' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : activeQuestion.difficulty === 'medium'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {activeQuestion.difficulty}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold uppercase tracking-wider">
            {activeQuestion.category}
          </span>
        </div>
        
        <div className="flex gap-2">
          {hintsRevealed < activeQuestion.hints.length && (
            <button 
              onClick={revealHint} 
              className="text-xs bg-slate-850 hover:bg-slate-800 text-teal-300 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 transition"
            >
              <Lightbulb className="w-4 h-4" /> Hint {hintsRevealed + 1}
            </button>
          )}
        </div>
      </div>

      {/* Main Question Box */}
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-850/80">
          {/* We assume LaTeX gets parsed or printed cleanly */}
          <p className="text-sm md:text-base font-medium text-slate-100 leading-relaxed whitespace-pre-line">
            {formatQuestionText(activeQuestion.question_text)}
          </p>
        </div>

        {/* Hints Box */}
        {hintsRevealed > 0 && (
          <div className="bg-slate-900/40 p-4 rounded-xl border border-teal-500/20 space-y-2">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="w-4 h-4" /> Revealed Hints:
            </h4>
            <div className="space-y-1.5">
              {activeQuestion.hints.slice(0, hintsRevealed).map((hint, idx) => (
                <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-teal-500">{idx + 1}.</span> {formatQuestionText(hint)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {activeQuestion.options && activeQuestion.options.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {activeQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(opt)}
                  disabled={isSubmitted}
                  className={`p-4 rounded-xl text-left border flex items-center gap-3 transition-all ${
                    isSubmitted 
                      ? opt === activeQuestion.correct_answer 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                        : isSelected
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                          : 'bg-slate-900/20 border-slate-850/40 opacity-50'
                      : isSelected
                        ? 'bg-teal-500/10 border-teal-500/40 text-teal-300 shadow-md shadow-teal-500/5'
                        : 'bg-slate-900/30 border-slate-850 hover:bg-slate-850/40'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center border shrink-0 ${
                    isSelected ? 'bg-teal-400 text-slate-950 border-teal-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {optionLabel}
                  </span>
                  <span className="text-xs md:text-sm font-medium">{formatQuestionText(opt)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
        <div className="flex gap-2">
          {!isSubmitted && stepsRevealed < activeQuestion.step_by_step_solution.length && (
            <button 
              onClick={revealNextStep} 
              className="text-xs bg-slate-850 hover:bg-slate-850/80 text-slate-300 px-3.5 py-2.5 rounded-xl border border-slate-800 transition cursor-pointer"
            >
              {stepsRevealed === 0 ? "Show Step-by-Step Solver" : `Reveal Step ${stepsRevealed + 1}`}
            </button>
          )}
          
          {!isSubmitted && !showAnswer && (
            <button 
              onClick={() => {
                setShowAnswer(true);
                setStepsRevealed(activeQuestion.step_by_step_solution.length);
              }} 
              className="text-xs bg-slate-850 hover:bg-slate-850/80 text-slate-300 px-3.5 py-2.5 rounded-xl border border-slate-800 transition cursor-pointer"
            >
              Reveal Final Answer
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {!isSubmitted ? (
            <button
              onClick={submitAnswer}
              disabled={!selectedOption}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 transition disabled:opacity-50"
            >
              Verify Answer
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-teal-500/25 transition flex items-center gap-1.5"
            >
              {currentIdx === questions.length - 1 ? (
                <>End Quiz</>
              ) : (
                <>Next Question <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Answer & Step-by-Step reveals boxes */}
      {showAnswer && (
        <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 animate-fade-in">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Correct Answer:</h4>
          <p className="text-sm font-bold text-white mt-1">{activeQuestion.correct_answer}</p>
        </div>
      )}

      {stepsRevealed > 0 && (
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-3 animate-fade-in">
          <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Step-by-Step AI Solution
          </h4>
          <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
            {activeQuestion.step_by_step_solution.slice(0, stepsRevealed).map((step, idx) => (
              <div key={idx} className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold border border-slate-700 text-teal-400 flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="pt-0.5">
                  <p className="text-xs md:text-sm text-slate-200 whitespace-pre-line leading-relaxed">{formatQuestionText(step.instruction)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Feedback alerts */}
      {isSubmitted && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
          isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {isCorrect ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">{isCorrect ? 'Awesome job!' : 'Incorrect Option'}</p>
            <p className="text-xs text-slate-300 mt-0.5">
              {isCorrect 
                ? 'Your answer is 100% correct. You have gained +15 mastery score points.' 
                : `The correct option is: "${formatQuestionText(activeQuestion.correct_answer)}". Click the step solver above to inspect the logical resolution.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
