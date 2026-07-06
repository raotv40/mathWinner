import random
from typing import Dict, Any, List

class QuestionAgent:
    @staticmethod
    async def generate_questions(
        chapter_title: str, 
        count: int = 6,
        concepts: List[Dict[str, Any]] = None,
        video_segments: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates practice questions of different categories (board, olympiad, HOTS, competency)
        and difficulties (easy, medium, hard) for a given chapter, utilizing OpenAI if key is present.
        """
        from app.core.config import settings
        
        if settings.OPENAI_API_KEY:
            try:
                live_qs = await QuestionAgent._generate_with_openai(chapter_title, concepts, video_segments, count)
                if live_qs and len(live_qs) > 0:
                    return live_qs
            except Exception as e:
                print(f"Failed live AI question generation, falling back to simulation pool: {e}")
                
        title_lower = chapter_title.lower()
        questions = []
        
        # We will generate a rich set of pre-structured questions for typical K-12 chapters
        if "quadratic" in title_lower:
            pool = [
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": "Find the roots of the quadratic equation $$x^2 - 7x + 12 = 0$$.",
                    "question_type": "mcq",
                    "options": ["x = 3, 4", "x = -3, -4", "x = 2, 6", "x = 1, 12"],
                    "correct_answer": "x = 3, 4",
                    "hints": [
                        "Factorize the middle term -7x into two parts whose product is 12x^2.",
                        "The two numbers are -3 and -4.",
                        "Equation becomes (x-3)(x-4) = 0."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Write the quadratic equation: x^2 - 7x + 12 = 0"},
                        {"step": "2", "instruction": "Split the middle term: x^2 - 3x - 4x + 12 = 0"},
                        {"step": "3", "instruction": "Group the terms: x(x - 3) - 4(x - 3) = 0"},
                        {"step": "4", "instruction": "Factor out (x - 3): (x - 3)(x - 4) = 0"},
                        {"step": "5", "instruction": "Solve for x: x = 3 or x = 4"}
                    ]
                },
                {
                    "difficulty": "medium",
                    "category": "competency",
                    "question_text": "A rectangular playground has an area of $$120\\text{ m}^2$$. Its length is $$7\\text{ m}$$ more than its width. Find the dimensions of the playground.",
                    "question_type": "word-problem",
                    "options": ["Length: 15m, Width: 8m", "Length: 12m, Width: 10m", "Length: 20m, Width: 6m", "Length: 14m, Width: 7m"],
                    "correct_answer": "Length: 15m, Width: 8m",
                    "hints": [
                        "Let the width of the playground be x. Then the length is x + 7.",
                        "Area is Length * Width = x(x + 7) = 120.",
                        "Rearrange to form a quadratic equation: x^2 + 7x - 120 = 0."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Define variables: Let Width = x, Length = x + 7."},
                        {"step": "2", "instruction": "Set up area equation: x(x + 7) = 120 => x^2 + 7x - 120 = 0."},
                        {"step": "3", "instruction": "Factorize the equation: x^2 + 15x - 8x - 120 = 0."},
                        {"step": "4", "instruction": "Solve for factors: (x + 15)(x - 8) = 0."},
                        {"step": "5", "instruction": "Since width cannot be negative, x = 8. Width is 8m and Length is 8 + 7 = 15m."}
                    ]
                },
                {
                    "difficulty": "hard",
                    "category": "hots",
                    "question_text": "Assertion (A): The quadratic equation $$x^2 - 4x + 5 = 0$$ has no real roots.\nReason (R): The discriminant of the equation is negative.",
                    "question_type": "assertion-reason",
                    "options": [
                        "Both A and R are true and R is the correct explanation of A.",
                        "Both A and R are true but R is not the correct explanation of A.",
                        "A is true but R is false.",
                        "A is false but R is true."
                    ],
                    "correct_answer": "Both A and R are true and R is the correct explanation of A.",
                    "hints": [
                        "Calculate the discriminant D using formula D = b^2 - 4ac.",
                        "Here a = 1, b = -4, c = 5. So D = (-4)^2 - 4(1)(5) = 16 - 20 = -4.",
                        "Since D < 0, the roots are imaginary (not real). Hence A is true, and R is the correct explanation."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "State the coefficients: a = 1, b = -4, c = 5."},
                        {"step": "2", "instruction": "Calculate D = b^2 - 4ac = (-4)^2 - 4(1)(5) = 16 - 20 = -4."},
                        {"step": "3", "instruction": "Since D = -4 (which is < 0), the roots are not real. Assertion A is true."},
                        {"step": "4", "instruction": "Since D < 0 guarantees no real roots, Reason R is true and explains A."}
                    ]
                },
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": "Which of the following is a quadratic equation?",
                    "question_type": "mcq",
                    "options": ["x^2 - 3x + 2 = 0", "x + 5 = 10", "x^3 - x = 0", "x^2 + y = 5"],
                    "correct_answer": "x^2 - 3x + 2 = 0",
                    "hints": ["Recall standard form is ax^2 + bx + c = 0, where a != 0."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Check degree of variables: standard quadratic form has highest degree 2 in one variable."},
                        {"step": "2", "instruction": "Verify option 1: x^2 - 3x + 2 = 0 contains x with power 2 and fits ax^2+bx+c=0."}
                    ]
                },
                {
                    "difficulty": "medium",
                    "category": "board",
                    "question_text": "Find the value of k for which the quadratic equation $$2x^2 + kx + 3 = 0$$ has equal roots.",
                    "question_type": "mcq",
                    "options": ["k = ±2√6", "k = ±6", "k = ±4", "k = ±√3"],
                    "correct_answer": "k = ±2√6",
                    "hints": [
                        "For equal roots, Discriminant D = b^2 - 4ac = 0.",
                        "b = k, a = 2, c = 3."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Identify coefficients: a = 2, b = k, c = 3."},
                        {"step": "2", "instruction": "Apply condition D = 0: k^2 - 4(2)(3) = 0."},
                        {"step": "3", "instruction": "Simplify: k^2 - 24 = 0 => k = ±√24 = ±2√6."}
                    ]
                },
                {
                    "difficulty": "hard",
                    "category": "competency",
                    "question_text": "The sum of the reciprocals of Rehman's age (in years) 3 years ago and 5 years from now is 1/3. Find his present age.",
                    "question_type": "word-problem",
                    "options": ["7 years", "5 years", "10 years", "6 years"],
                    "correct_answer": "7 years",
                    "hints": [
                        "Let present age be x. Age 3 years ago is x-3, and 5 years from now is x+5.",
                        "Formulate the equation: 1/(x-3) + 1/(x+5) = 1/3."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Set Rehman's present age to x."},
                        {"step": "2", "instruction": "Form equation: [1/(x - 3)] + [1/(x + 5)] = 1/3."},
                        {"step": "3", "instruction": "Simplify: (x + 5 + x - 3) / ((x-3)(x+5)) = 1/3 => (2x+2)/(x^2+2x-15) = 1/3."},
                        {"step": "4", "instruction": "Cross multiply: 3(2x+2) = x^2+2x-15 => x^2 - 4x - 21 = 0."},
                        {"step": "5", "instruction": "Factorize: (x-7)(x+3) = 0. Since age cannot be negative, Rehman is 7 years old."}
                    ]
                }
            ]
        elif "trigonometry" in title_lower:
            pool = [
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": "Evaluate the value of $$\\sin 60^\\circ \\cos 30^\\circ + \\cos 60^\\circ \\sin 30^\\circ$$.",
                    "question_type": "mcq",
                    "options": ["1", "0", "1/2", "√3/2"],
                    "correct_answer": "1",
                    "hints": [
                        "Substitute standard values: sin 60° = √3/2, cos 30° = √3/2.",
                        "Substitute standard values: cos 60° = 1/2, sin 30° = 1/2.",
                        "Multiply and sum: (√3/2 * √3/2) + (1/2 * 1/2)."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Substitute values: sin 60° = √3/2, cos 30° = √3/2, cos 60° = 1/2, sin 30° = 1/2."},
                        {"step": "2", "instruction": "Compute products: (√3/2)*(√3/2) = 3/4 and (1/2)*(1/2) = 1/4."},
                        {"step": "3", "instruction": "Sum the results: 3/4 + 1/4 = 4/4 = 1."}
                    ]
                },
                {
                    "difficulty": "medium",
                    "category": "competency",
                    "question_text": "A ladder leaning against a wall makes an angle of $$60^\\circ$$ with the horizontal ground. If the foot of the ladder is $$3\\text{ m}$$ away from the wall, find the length of the ladder.",
                    "question_type": "word-problem",
                    "options": ["6 m", "3 m", "4.5 m", "3√3 m"],
                    "correct_answer": "6 m",
                    "hints": [
                        "Identify the right-angled triangle. Base = 3m, Angle = 60°.",
                        "We need the hypotenuse (length of ladder). Use cos 60° = Base / Hypotenuse.",
                        "cos 60° = 1/2. Solve for Hypotenuse."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Draw right triangle: Base (adjacent) = 3m, Hypotenuse = L (ladder length), Angle = 60°."},
                        {"step": "2", "instruction": "Apply cosine ratio: cos 60° = Base / Hypotenuse = 3 / L."},
                        {"step": "3", "instruction": "Substitute cos 60° = 1/2: 1/2 = 3 / L."},
                        {"step": "4", "instruction": "Solve for L: L = 2 * 3 = 6 meters."}
                    ]
                },
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": "If tan A = 4/3, what is the value of sin A?",
                    "question_type": "mcq",
                    "options": ["4/5", "3/5", "5/4", "3/4"],
                    "correct_answer": "4/5",
                    "hints": [
                        "tan A = Opposite / Adjacent.",
                        "Find Hypotenuse using Pythagoras: H^2 = O^2 + A^2.",
                        "sin A = Opposite / Hypotenuse."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Identify side lengths: Opposite = 4, Adjacent = 3."},
                        {"step": "2", "instruction": "Calculate Hypotenuse: H = √(4^2 + 3^2) = √(16 + 9) = 5."},
                        {"step": "3", "instruction": "Find sin A: sin A = Opposite/Hypotenuse = 4/5."}
                    ]
                },
                {
                    "difficulty": "medium",
                    "category": "board",
                    "question_text": "Find the value of (1 + tan^2 A) / (1 + cot^2 A).",
                    "question_type": "mcq",
                    "options": ["tan^2 A", "cot^2 A", "sec^2 A", "1"],
                    "correct_answer": "tan^2 A",
                    "hints": [
                        "1 + tan^2 A = sec^2 A.",
                        "1 + cot^2 A = cosec^2 A.",
                        "sec^2 A / cosec^2 A = (1/cos^2 A) / (1/sin^2 A)."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Apply identities: Numerator = sec^2 A, Denominator = cosec^2 A."},
                        {"step": "2", "instruction": "Rewrite as sin/cos: (1/cos^2 A) / (1/sin^2 A) = sin^2 A / cos^2 A = tan^2 A."}
                    ]
                },
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": "Evaluate 2 tan^2 45° + cos^2 30° - sin^2 60°.",
                    "question_type": "mcq",
                    "options": ["2", "1", "0", "4"],
                    "correct_answer": "2",
                    "hints": [
                        "tan 45° = 1, cos 30° = √3/2, sin 60° = √3/2."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Substitute values: 2*(1)^2 + (√3/2)^2 - (√3/2)^2."},
                        {"step": "2", "instruction": "Notice (√3/2)^2 cancel out: 2*(1) + 3/4 - 3/4 = 2."}
                    ]
                },
                {
                    "difficulty": "hard",
                    "category": "hots",
                    "question_text": "Simplify the expression (sec A + tan A)(1 - sin A).",
                    "question_type": "mcq",
                    "options": ["cos A", "sin A", "sec A", "cosec A"],
                    "correct_answer": "cos A",
                    "hints": [
                        "Convert sec A and tan A to sin and cos: sec A = 1/cos A, tan A = sin A/cos A.",
                        "The expression becomes (1 + sin A)(1 - sin A) / cos A."
                    ],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Rewrite: (1/cos A + sin A/cos A)(1 - sin A) = ((1 + sin A)/cos A) * (1 - sin A)."},
                        {"step": "2", "instruction": "Simplify numerator: (1 - sin^2 A) / cos A."},
                        {"step": "3", "instruction": "Use Pythagorean identity: cos^2 A / cos A = cos A."}
                    ]
                }
            ]
        else:
            # General CBSE K-12 sample math questions pool
            pool = [
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": f"Solve the basic introductory equation related to {chapter_title}: $$2x + 10 = 20$$.",
                    "question_type": "mcq",
                    "options": ["x = 5", "x = 10", "x = 15", "x = 2"],
                    "correct_answer": "x = 5",
                    "hints": ["Subtract 10 from both sides.", "Divide by 2.", "Check your answer."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Given: 2x + 10 = 20"},
                        {"step": "2", "instruction": "Subtract 10: 2x = 10"},
                        {"step": "3", "instruction": "Divide by 2: x = 5"}
                    ]
                },
                {
                    "difficulty": "easy",
                    "category": "board",
                    "question_text": "Convert 5 kilometers (km) into meters (m).",
                    "question_type": "mcq",
                    "options": ["50 m", "500 m", "5000 m", "50000 m"],
                    "correct_answer": "5000 m",
                    "hints": ["Recall that 1 km = 1000 m.", "Multiply 5 by 1000."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Conversion formula: 1 km = 1000 m."},
                        {"step": "2", "instruction": "Multiply: 5 * 1000 = 5000 m."}
                    ]
                },
                {
                    "difficulty": "medium",
                    "category": "board",
                    "question_text": "A line segment is 2 meters and 45 centimeters long. What is its length in centimeters (cm)?",
                    "question_type": "mcq",
                    "options": ["245 cm", "2045 cm", "2450 cm", "24.5 cm"],
                    "correct_answer": "245 cm",
                    "hints": ["1 meter = 100 cm.", "Convert 2 meters to cm and add 45 cm."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Convert meters: 2 m = 200 cm."},
                        {"step": "2", "instruction": "Add centimeters: 200 cm + 45 cm = 245 cm."}
                    ]
                },
                {
                    "difficulty": "easy",
                    "category": "competency",
                    "question_text": "If a piece of rope is 8 meters long, how many 80 cm pieces can be cut from it?",
                    "question_type": "mcq",
                    "options": ["10", "80", "100", "5"],
                    "correct_answer": "10",
                    "hints": ["Convert 8 meters to cm: 1 m = 100 cm.", "Divide the total length in cm by 80 cm."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Convert rope length: 8 m = 800 cm."},
                        {"step": "2", "instruction": "Divide by piece size: 800 cm / 80 cm = 10 pieces."}
                    ]
                },
                {
                    "difficulty": "medium",
                    "category": "olympiad",
                    "question_text": "Find the perimeter of a rectangle with length 12 cm and width 8 cm.",
                    "question_type": "mcq",
                    "options": ["40 cm", "96 cm", "20 cm", "48 cm"],
                    "correct_answer": "40 cm",
                    "hints": ["Perimeter formula: P = 2 * (length + width).", "Add 12 and 8, then multiply by 2."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Formula: P = 2 * (L + W)"},
                        {"step": "2", "instruction": "Sum dimensions: 12 + 8 = 20 cm"},
                        {"step": "3", "instruction": "Multiply by 2: 2 * 20 = 40 cm"}
                    ]
                },
                {
                    "difficulty": "hard",
                    "category": "hots",
                    "question_text": "Solve the equation: 3x - 7 = 14.",
                    "question_type": "mcq",
                    "options": ["x = 7", "x = 6", "x = 21", "x = 3"],
                    "correct_answer": "x = 7",
                    "hints": ["Add 7 to both sides.", "Divide by 3."],
                    "step_by_step_solution": [
                        {"step": "1", "instruction": "Given: 3x - 7 = 14"},
                        {"step": "2", "instruction": "Add 7: 3x = 21"},
                        {"step": "3", "instruction": "Divide by 3: x = 7"}
                    ]
                }
            ]
            
        # Shuffle/sample unique questions from the pool
        count = min(count, len(pool))
        selected = [item.copy() for item in random.sample(pool, count)]
        return selected

    @staticmethod
    async def _generate_with_openai(
        chapter_title: str,
        concepts: List[Dict[str, Any]],
        video_segments: List[Dict[str, Any]],
        count: int
    ) -> List[Dict[str, Any]]:
        from openai import AsyncOpenAI
        from app.core.config import settings
        
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Prepare context from concepts and video transcript segments
        concepts_str = "\n".join([f"- {c['title']}: {c['description']}" for c in (concepts or [])])
        
        video_str = ""
        if video_segments:
            video_str = "\n".join([f"[{s.get('start_time')}s]: {s.get('text')}" for s in video_segments[:10]])
            
        prompt = f"""
        You are a K-12 Mathematics AI Teacher specializing in CBSE academic standards.
        Generate {count} unique, high-quality multiple choice practice questions for the math chapter: "{chapter_title}".
        
        CRITICAL ASSESSMENT STANDARDS (SAFAL & NEP 2020):
        1. Aligned to SAFAL (Structured Assessment for Analyzing Learning): Shift focus away from rote memorization. Questions must test core conceptual understanding, critical thinking, logical reasoning, and real-life application of knowledge.
        2. Expected Outcomes Mapping: You MUST ensure that all chapter expected outcomes/concepts listed below are tested. Distribute the questions evenly across the provided textbook concepts so that no concept is left untested.
        3. Competency Focus: At least 3 questions must be case-based or real-world competency scenarios where students apply mathematical concepts to solve practical situations.
        
        CRITICAL: The questions MUST be directly grounded on and relevant to the concepts and teacher explanations from the video transcript and textbook context below.
        
        Textbook Concepts:
        {concepts_str}
        
        Teacher Video Explanations (Excerpt):
        {video_str}
        
        Return a strict JSON payload containing a list of questions under the "questions" key.
        Each question object MUST strictly match the following JSON format:
        {{
            "difficulty": "easy" or "medium" or "hard",
            "category": "board" or "olympiad" or "hots" or "competency",
            "question_text": "Clean question text. Do NOT use LaTeX $ or $$ delimiters. Output standard readable math equations directly.",
            "question_type": "mcq",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "The exact string matching one of the options",
            "hints": ["Hint 1", "Hint 2"],
            "step_by_step_solution": [
                {{"step": "1", "instruction": "Step 1 details"}},
                {{"step": "2", "instruction": "Step 2 details"}}
            ]
        }}
        """
        
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            data = json.loads(response.choices[0].message.content)
            return data.get("questions", [])
        except Exception as e:
            print(f"OpenAI question generation failed: {e}")
            return []
