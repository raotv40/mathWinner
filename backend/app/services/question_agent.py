import random
from typing import Dict, Any, List

class QuestionAgent:
    @staticmethod
    def generate_questions(chapter_title: str, count: int = 5) -> List[Dict[str, Any]]:
        """
        Generates practice questions of different categories (board, olympiad, HOTS, competency)
        and difficulties (easy, medium, hard) for a given chapter.
        """
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
                }
            ]
            
        # Shuffle/sample up to the count requested
        selected = []
        for _ in range(count):
            item = random.choice(pool)
            selected.append(item.copy())
            
        return selected
