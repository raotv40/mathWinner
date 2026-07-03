import Dexie, { type Table } from 'dexie';

export interface OfflineChapter {
  id: string;
  class_level: number;
  subject: string;
  title: string;
  chapter_number: number;
  summary: string;
  formulas: any[];
  mind_map: any;
  pdf_url: string;
  video_url: string;
}

export interface OfflineConcept {
  id: string;
  chapter_id: string;
  title: string;
  description: string;
}

export interface OfflineQuestion {
  id: string;
  chapter_id: string;
  difficulty: string;
  category: string;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  hints: string[];
  step_by_step_solution: any[];
}

export interface OfflineEmbedding {
  chapter_id: string;
  source_type: string;
  content: string;
  timestamp_seconds?: number;
  embedding: number[];
}

export interface FileBlob {
  id: string; // chapter_id
  pdfBlob?: Blob;
  videoBlob?: Blob;
}

export interface OfflineProgress {
  id?: number;
  chapter_id: string;
  mastery_score: number;
  practice_completed: number;
  learning_time_minutes: number;
  daily_streak: number;
  last_active: string;
}

class MathMentorOfflineDB extends Dexie {
  chapters!: Table<OfflineChapter, string>;
  concepts!: Table<OfflineConcept, string>;
  questions!: Table<OfflineQuestion, string>;
  embeddings!: Table<OfflineEmbedding, number>;
  files!: Table<FileBlob, string>;
  progress!: Table<OfflineProgress, number>;

  constructor() {
    super('MathMentorOfflineDB');
    this.version(1).stores({
      chapters: 'id, class_level, title',
      concepts: 'id, chapter_id, title',
      questions: 'id, chapter_id, difficulty, category',
      embeddings: '++id, chapter_id, source_type',
      files: 'id',
      progress: '++id, chapter_id'
    });
  }
}

export const db = new MathMentorOfflineDB();

// Cosine similarity for client-side offline vector search (RAG)
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Client-side offline RAG query
export async function queryOfflineEmbeddings(chapterId: string, queryVector: number[], limit = 3) {
  const allEmbeddings = await db.embeddings.where('chapter_id').equals(chapterId).toArray();
  const scored = allEmbeddings.map(item => ({
    ...item,
    score: cosineSimilarity(queryVector, item.embedding)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
