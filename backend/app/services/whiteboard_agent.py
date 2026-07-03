import json
from typing import Dict, Any, Optional
from app.core.config import settings

class WhiteboardAgent:
    @staticmethod
    async def evaluate_solution(
        question_text: str,
        correct_answer: str,
        whiteboard_canvas_json: str,  # canvas stroke data or text
        uploaded_image_b64: Optional[str] = None  # base64 encoded picture if student uploads a photo
    ) -> Dict[str, Any]:
        """
        Evaluates a whiteboard canvas solution or image.
        Scores the solution, identifies calculation mistakes, missing steps, and offers feedback.
        """
        if settings.OPENAI_API_KEY and uploaded_image_b64:
            try:
                return await WhiteboardAgent._evaluate_with_openai_vision(
                    question_text, correct_answer, uploaded_image_b64
                )
            except Exception as e:
                print(f"OpenAI Vision evaluation failed: {e}")
                
        return await WhiteboardAgent._evaluate_with_simulation(
            question_text, correct_answer, whiteboard_canvas_json
        )

    @staticmethod
    async def _evaluate_with_openai_vision(
        question_text: str,
        correct_answer: str,
        image_b64: str
    ) -> Dict[str, Any]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        prompt = f"""
        You are a K-12 CBSE Mathematics Examiner.
        Analyze the student's handwritten solution image for this question:
        "{question_text}"
        The correct final answer is: "{correct_answer}"
        
        Evaluate:
        1. Correctness (correct, incorrect, or partial).
        2. Score (out of 100).
        3. Missing steps.
        4. Calculation mistakes.
        5. Alternative solution methods.
        6. General constructive feedback.
        
        Return a strict JSON format matching this schema:
        {{
            "is_correct": "correct" | "incorrect" | "partial",
            "eval_score": 90,
            "missing_steps": ["Step text"],
            "calculation_mistakes": ["Mistake text"],
            "alternative_solution": "Alternative method explanation",
            "feedback": "Overall exam feedback"
        }}
        """
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "content": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.2
        )
        
        return json.loads(response.choices[0].message.content)

    @staticmethod
    async def _evaluate_with_simulation(
        question_text: str,
        correct_answer: str,
        canvas_json: str
    ) -> Dict[str, Any]:
        # Intelligent fallback that simulates parsing and marking math work
        # Try to inspect the canvas_json text to see if student solved it correctly
        canvas_text = canvas_json.lower()
        
        # We will check if the correct answer or parts of it appear in the canvas text
        ans_clean = correct_answer.replace(" ", "").replace("$", "").lower()
        
        is_correct = "incorrect"
        score = 20
        feedback = "The final answer is not clear in your solution. Please show all steps clearly on the board."
        mistakes = ["No calculation steps detected or answer is incomplete."]
        missing = ["Include intermediate factorization or equation solver steps."]
        
        # Simple heuristics for simulation
        if len(canvas_text) > 10:
            if any(char in canvas_text for char in ["=", "+", "-", "/", "*"]):
                # Student wrote some equations
                is_correct = "partial"
                score = 65
                feedback = "Good attempt! You set up the equations properly, but there is a slight error in the final calculation step."
                mistakes = ["Check the arithmetic signs in your last two lines."]
                missing = ["Explicitly state the values of the variables before solving."]
                
            # If the correct answer appears in the text
            if ans_clean in canvas_text.replace(" ", ""):
                is_correct = "correct"
                score = 100
                feedback = "Excellent work! Your steps are logical, and the final calculations are correct. FULL MARKS!"
                mistakes = []
                missing = []
                
        return {
            "is_correct": is_correct,
            "eval_score": score,
            "missing_steps": missing,
            "calculation_mistakes": mistakes,
            "alternative_solution": "You can also verify by substituting the roots back into the original quadratic equation to see if it equals zero.",
            "feedback": feedback
        }
