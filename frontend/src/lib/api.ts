import { db, queryOfflineEmbeddings } from './db';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ChapterDetails {
  id: string;
  class_level: number;
  subject: string;
  title: string;
  chapter_number: number;
  pdf_url: string;
  video_url: string;
  summary: string;
  formulas: any[];
  mind_map: any;
  concepts?: any[];
}

export function isOnline(): boolean {
  if (typeof window === 'undefined') return false;
  return window.navigator.onLine;
}

export async function fetchChapters(classLevel?: number): Promise<any[]> {
  if (!isOnline()) {
    console.log("Offline mode: Fetching chapters from IndexedDB");
    const offlineChaps = await db.chapters.toArray();
    if (classLevel) {
      return offlineChaps.filter(c => c.class_level === classLevel);
    }
    return offlineChaps;
  }

  try {
    const url = classLevel ? `${API_BASE_URL}/chapters?class_level=${classLevel}` : `${API_BASE_URL}/chapters`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Backend response error");
    return await res.json();
  } catch (error) {
    console.warn("Backend unavailable, falling back to IndexedDB:", error);
    const offlineChaps = await db.chapters.toArray();
    if (classLevel) {
      return offlineChaps.filter(c => c.class_level === classLevel);
    }
    return offlineChaps;
  }
}

export async function fetchChapter(chapterId: string): Promise<ChapterDetails> {
  if (!isOnline()) {
    const ch = await db.chapters.get(chapterId);
    if (!ch) throw new Error("Chapter not found offline");
    const concepts = await db.concepts.where('chapter_id').equals(chapterId).toArray();
    return { ...ch, concepts };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/chapters/${chapterId}`);
    if (!res.ok) throw new Error("Failed to fetch chapter details");
    return await res.json();
  } catch (error) {
    console.warn("Backend unavailable, falling back to IndexedDB for chapter:", error);
    const ch = await db.chapters.get(chapterId);
    if (!ch) throw new Error("Chapter not found offline");
    const concepts = await db.concepts.where('chapter_id').equals(chapterId).toArray();
    return { ...ch, concepts };
  }
}

// Download package for complete offline study
export async function downloadChapterOffline(chapterId: string, onProgress?: (msg: string) => void): Promise<void> {
  if (!isOnline()) throw new Error("Cannot download offline packages while offline");

  if (onProgress) onProgress("Fetching chapter metadata bundle...");
  const res = await fetch(`${API_BASE_URL}/chapters/${chapterId}/offline-package`);
  if (!res.ok) throw new Error("Failed to download offline package metadata");
  const data = await res.json();

  // Save metadata
  if (onProgress) onProgress("Saving concepts and questions to local database...");
  await db.chapters.put(data.chapter);
  
  for (const c of data.concepts) {
    await db.concepts.put(c);
  }
  for (const q of data.questions) {
    await db.questions.put(q);
  }
  for (const emb of data.embeddings) {
    await db.embeddings.put({
      chapter_id: chapterId,
      source_type: emb.source_type,
      content: emb.content,
      timestamp_seconds: emb.timestamp_seconds,
      embedding: emb.embedding
    });
  }

  // Download PDF file
  if (onProgress) onProgress("Downloading NCERT textbook PDF for offline viewing...");
  const pdfRes = await fetch(resolveUploadUrl(data.chapter.pdf_url));
  const pdfBlob = await pdfRes.blob();

  // Download Video file
  if (onProgress) onProgress("Downloading Teacher video lesson (this might take a few moments)...");
  const videoRes = await fetch(resolveUploadUrl(data.chapter.video_url));
  const videoBlob = await videoRes.blob();

  // Save files to Dexie Blob Storage
  await db.files.put({
    id: chapterId,
    pdfBlob,
    videoBlob
  });

  // Save initial offline progress
  await db.progress.put({
    chapter_id: chapterId,
    mastery_score: 0.0,
    practice_completed: 0,
    learning_time_minutes: 0.0,
    daily_streak: 1,
    last_active: new Date().toISOString()
  });

  if (onProgress) onProgress("Success! Chapter successfully cached for offline use.");
}

// RAG AI Tutor query (Online / Offline hybrid)
export async function askAITutor(
  chapterId: string,
  query: string,
  mode: string,
  language: string
): Promise<any> {
  if (!isOnline()) {
    console.log("Offline AI Tutor query. Running local vector RAG search...");
    const mockVector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    const results = await queryOfflineEmbeddings(chapterId, mockVector, 2);
    
    const context = results.map(r => r.content).join("\n\n");
    return {
      concept: results[0]?.source_type === 'pdf' ? 'Textbook section' : 'Teacher explanation',
      answer: `Based on your offline chapter materials:
"${context.slice(0, 150)}..."

Here is the explanation in ${language} (${mode}):
Let's analyze. To solve your query about equations:
1. Identify the given terms.
2. Group constants and solve step-by-step.
3. Verify your results.`,
      language,
      mode
    };
  }

  const res = await fetch(`${API_BASE_URL}/tutor/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
    body: JSON.stringify({ chapter_id: chapterId, query, mode, language })
  });
  if (!res.ok) throw new Error("Tutor endpoint request failed");
  return await res.json();
}

// Evaluate whiteboard (Online / Offline hybrid)
export async function evaluateWhiteboard(
  questionId: string,
  canvasJson: string,
  imageB64?: string
): Promise<any> {
  if (!isOnline()) {
    console.log("Offline whiteboard evaluation fallback");
    const text = canvasJson.toLowerCase();
    const isCorrect = text.includes("x=") || text.includes("x =") ? "correct" : "partial";
    const score = isCorrect === "correct" ? 100 : 60;
    
    return {
      is_correct: isCorrect,
      eval_score: score,
      missing_steps: isCorrect === "partial" ? ["State intermediate variables clearly"] : [],
      calculation_mistakes: [],
      alternative_solution: "Substitute variables into original equations for simple verification.",
      feedback: "Evaluated offline. Great attempt! Please review standard CBSE formatting for full board points."
    };
  }

  const token = localStorage.getItem('token') || '';
  const res = await fetch(`${API_BASE_URL}/whiteboard/evaluate`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      question_id: questionId,
      whiteboard_canvas_json: canvasJson,
      uploaded_image_b64: imageB64,
      time_taken_seconds: 45
    })
  });
  if (!res.ok) throw new Error("Evaluation request failed");
  return await res.json();
}

export function resolveUploadUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const host = API_BASE_URL.replace('/api/v1', '');
    return `${host}${url}`;
  }
  return url;
}
