import numpy as np
from typing import Dict, Any, List
from app.core.config import settings

class TutorAgent:
    @staticmethod
    async def get_tutor_response(
        query: str, 
        mode: str, 
        language: str, 
        chapter_data: Dict[str, Any],
        student_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        AI Tutor responder using RAG. Searches PDF and video chunks,
        applies filters (simple, visual, step-by-step, multilingual),
        and returns detailed explanations.
        """
        # 1. Mock embedding vector for query
        np.random.seed(len(query))
        query_emb = np.random.normal(0.0, 0.1, 1536)
        query_emb = query_emb / np.linalg.norm(query_emb)
        
        # 2. Retrieve top matching chunk (RAG simulation)
        best_match = None
        best_score = -1.0
        
        chunks = chapter_data.get("chunks", [])
        for chunk in chunks:
            chunk_emb = np.array(chunk["embedding"])
            score = np.dot(query_emb, chunk_emb)
            if score > best_score:
                best_score = score
                best_match = chunk
                
        matched_concept = best_match["concept_title"] if best_match else "General mathematics"
        matched_content = best_match["content"] if best_match else ""
        
        # 3. Call OpenAI if key is present
        if settings.OPENAI_API_KEY:
            try:
                return await TutorAgent._call_openai(query, mode, language, matched_concept, matched_content)
            except Exception as e:
                print(f"OpenAI tutor query failed: {e}")
                
        return await TutorAgent._generate_simulated_response(query, mode, language, matched_concept, matched_content)

    @staticmethod
    async def _call_openai(query: str, mode: str, language: str, concept: str, content: str) -> Dict[str, Any]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        system_prompt = f"""
        You are MathWinner AI, an expert K-12 CBSE Math Tutor.
        Always answer utilizing the official NCERT context:
        Concept context: {concept} - {content}
        
        Formatting rules:
        - Output mathematical expressions in clear LaTeX formatted with double dollar signs ($$equation$$) for block or single dollar sign ($equation$) for inline.
        - Answer in the selected language: {language}.
        - Adopt explanation mode: {mode} (e.g. 'simple', 'visual', 'step-by-step', 'example').
        """
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.4
        )
        
        return {
            "concept": concept,
            "answer": response.choices[0].message.content,
            "language": language,
            "mode": mode
        }

    @staticmethod
    async def _generate_simulated_response(query: str, mode: str, language: str, concept: str, content: str) -> Dict[str, Any]:
        # Formulate rich multilingual replies
        translations = {
            "English": {
                "prefix": "Sure! Let's understand this topic step-by-step.",
                "visual": "Imagine a graphical coordinate board. Plotting this function creates a curved path...",
                "simple": "Think of this like sharing apples. If you have a total value, you divide it by...",
                "step": "Step 1: Write down the given expression.\nStep 2: Factor out the common variables.\nStep 3: Solve for x."
            },
            "Hindi": {
                "prefix": "नमस्ते! आइए इसे चरण-दर-चरण समझते हैं।",
                "visual": "एक ग्राफ़िकल कोऑर्डिनेट बोर्ड की कल्पना करें। इस फ़ंक्शन को प्लॉट करने से...",
                "simple": "इसे सेब बांटने की तरह समझें। यदि आपके पास कुल मूल्य है, तो आप इसे...",
                "step": "चरण 1: दिए गए समीकरण को लिखें।\nचरण 2: सामान्य चर को गुणनखंडित करें।\nचरण 3: x का मान निकालें।"
            },
            "Telugu": {
                "prefix": "నమస్తే! ఈ భావనను సులభంగా అర్థం చేసుకుందాం.",
                "visual": "ఒక గ్రాఫ్ బోర్డును ఊహించుకోండి. ఈ ఈక్వేషన్ ద్వారా కర్వ్ పాత్ ఎలా వస్తుందో...",
                "simple": "దీనిని ఆపిల్స్ పంచడం లాగా ఊహించుకోండి. మొత్తం విలువ ఉంటే దానిని...",
                "step": "స్టెప్ 1: ఇచ్చిన సమీకరణాన్ని రాయండి.\nస్టెప్ 2: కామన్ వేరియబుల్స్ ను వేరు చేయండి.\nస్టెప్ 3: x విలువను కనుగొనండి."
            },
            "Tamil": {
                "prefix": "வணக்கம்! இதை எளிமையாகப் புரிந்துகொள்வோம்.",
                "visual": "ஒரு வரைபடத்தை கற்பனை செய்து பாருங்கள். இந்த சமன்பாட்டை வரைந்தால்...",
                "simple": "இதை ஆப்பிள்களைப் பகிர்வது போல் நினைத்துப் பாருங்கள். உங்களிடம் உள்ள மதிப்பை...",
                "step": "படி 1: கொடுக்கப்பட்ட சமன்பாட்டை எழுதவும்.\nபடி 2: பொதுவான மாறிகளை காரணியாக்குங்கள்.\nபடி 3: x-ன் மதிப்பை கண்டறியவும்."
            }
        }
        
        lang_data = translations.get(language, translations["English"])
        
        explanation = lang_data["prefix"] + "\n\n"
        if mode == "visual":
            explanation += lang_data["visual"]
        elif mode == "simple":
            explanation += lang_data["simple"]
        elif mode == "step-by-step":
            explanation += lang_data["step"]
        else:
            explanation += f"Let's focus on **{concept}**. As per the syllabus: {content}\n\nHere is a detailed application example:\n$$x^2 - 5x + 6 = 0$$\n$$(x-2)(x-3) = 0$$\nHence, the roots are $x=2$ and $x=3$."
            
        return {
            "concept": concept,
            "answer": explanation,
            "language": language,
            "mode": mode
        }
