"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import { categoryNameToSlug } from "@/lib/topicMap";

// GAT Questions in English
const questions = [
  // Quantitative - Algebra (10 questions)
  {
    id: 1,
    section: "Quantitative",
    category: "Algebra",
    question: "If x + 7 = 15, what is the value of x?",
    options: ["6", "7", "8", "9"],
    correct: 2,
    explanation: "To find x, subtract 7 from both sides:\nx + 7 - 7 = 15 - 7\nx = 8",
  },
  {
    id: 2,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve for x: 3x - 6 = 15",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "Add 6 to both sides:\n3x = 21\nDivide by 3:\nx = 7",
  },
  {
    id: 3,
    section: "Quantitative",
    category: "Algebra",
    question: "If 4x = 36, then x² =",
    options: ["9", "36", "81", "144"],
    correct: 2,
    explanation: "First find x:\n4x = 36\nx = 9\nThen calculate x²:\nx² = 9² = 81",
  },
  {
    id: 4,
    section: "Quantitative",
    category: "Algebra",
    question: "Simplify: 2(x + 3) - 4",
    options: ["2x + 2", "2x + 6", "2x - 1", "2x + 10"],
    correct: 0,
    explanation: "Distribute 2:\n2x + 6 - 4\nCombine like terms:\n2x + 2",
  },
  {
    id: 5,
    section: "Quantitative",
    category: "Algebra",
    question: "What is the value of 5² - 3²?",
    options: ["4", "8", "16", "22"],
    correct: 2,
    explanation: "5² = 25\n3² = 9\n25 - 9 = 16",
  },

  // Add more Algebra questions (41-50)
  {
    id: 41,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve: 5x + 15 = 40",
    options: ["3", "4", "5", "6"],
    correct: 2,
    explanation: "5x + 15 = 40\n5x = 25\nx = 5",
  },
  {
    id: 42,
    section: "Quantitative",
    category: "Algebra",
    question: "If x = 3 and y = 4, what is x² + y²?",
    options: ["20", "25", "12", "7"],
    correct: 1,
    explanation: "x² + y² = 3² + 4² = 9 + 16 = 25",
  },
  {
    id: 43,
    section: "Quantitative",
    category: "Algebra",
    question: "Simplify: 4(2x - 3) + 2",
    options: ["8x - 10", "8x - 12", "8x - 14", "8x + 10"],
    correct: 0,
    explanation: "4(2x - 3) + 2 = 8x - 12 + 2 = 8x - 10",
  },
  {
    id: 44,
    section: "Quantitative",
    category: "Algebra",
    question: "What is √225?",
    options: ["13", "14", "15", "16"],
    correct: 2,
    explanation: "√225 = 15 because 15 × 15 = 225",
  },
  {
    id: 45,
    section: "Quantitative",
    category: "Algebra",
    question: "If 6x = 42, find x",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "6x = 42\nx = 42 ÷ 6 = 7",
  },
  {
    id: 46,
    section: "Quantitative",
    category: "Algebra",
    question: "What is 2⁵?",
    options: ["16", "32", "64", "128"],
    correct: 1,
    explanation: "2⁵ = 2 × 2 × 2 × 2 × 2 = 32",
  },
  {
    id: 47,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve: 3x - 9 = 0",
    options: ["1", "2", "3", "4"],
    correct: 2,
    explanation: "3x - 9 = 0\n3x = 9\nx = 3",
  },
  {
    id: 48,
    section: "Quantitative",
    category: "Algebra",
    question: "If a² = 64, then a =",
    options: ["6", "7", "8", "9"],
    correct: 2,
    explanation: "a² = 64\na = √64 = 8",
  },
  {
    id: 49,
    section: "Quantitative",
    category: "Algebra",
    question: "Simplify: (3x)(4x)",
    options: ["7x", "12x", "12x²", "7x²"],
    correct: 2,
    explanation: "(3x)(4x) = 3 × 4 × x × x = 12x²",
  },
  {
    id: 50,
    section: "Quantitative",
    category: "Algebra",
    question: "What is the value of 4³?",
    options: ["12", "16", "64", "256"],
    correct: 2,
    explanation: "4³ = 4 × 4 × 4 = 64",
  },

  // More Geometry questions (51-60)
  {
    id: 51,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the area of a triangle with base 12 and height 8?",
    options: ["48", "96", "20", "40"],
    correct: 0,
    explanation: "Area = ½ × base × height = ½ × 12 × 8 = 48",
  },
  {
    id: 52,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the circumference of a circle with diameter 14? (π = 22/7)",
    options: ["22", "44", "88", "154"],
    correct: 1,
    explanation: "Circumference = π × diameter = (22/7) × 14 = 44",
  },
  {
    id: 53,
    section: "Quantitative",
    category: "Geometry",
    question: "A rectangle has length 15 and width 8. What is its perimeter?",
    options: ["23", "46", "120", "92"],
    correct: 1,
    explanation: "Perimeter = 2(length + width) = 2(15 + 8) = 2 × 23 = 46",
  },
  {
    id: 54,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the area of a square with perimeter 24?",
    options: ["24", "36", "48", "144"],
    correct: 1,
    explanation: "Side = 24 ÷ 4 = 6\nArea = 6² = 36",
  },
  {
    id: 55,
    section: "Quantitative",
    category: "Geometry",
    question: "In a right triangle, if one angle is 90° and another is 30°, what is the third angle?",
    options: ["30°", "45°", "60°", "90°"],
    correct: 2,
    explanation: "Sum of angles = 180°\nThird angle = 180 - 90 - 30 = 60°",
  },
  {
    id: 56,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the volume of a cube with side 5?",
    options: ["25", "75", "125", "150"],
    correct: 2,
    explanation: "Volume = side³ = 5³ = 125",
  },
  {
    id: 57,
    section: "Quantitative",
    category: "Geometry",
    question: "The diagonal of a square is 10√2. What is the side length?",
    options: ["5", "10", "15", "20"],
    correct: 1,
    explanation: "For a square: diagonal = side × √2\nSide = 10√2 ÷ √2 = 10",
  },
  {
    id: 58,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the sum of interior angles of a hexagon?",
    options: ["540°", "600°", "720°", "1080°"],
    correct: 2,
    explanation: "Sum = (n-2) × 180° = (6-2) × 180° = 720°",
  },
  {
    id: 59,
    section: "Quantitative",
    category: "Geometry",
    question: "A cylinder has radius 3 and height 7. What is its volume? (π = 22/7)",
    options: ["66", "132", "198", "264"],
    correct: 2,
    explanation: "Volume = πr²h = (22/7) × 9 × 7 = 198",
  },
  {
    id: 60,
    section: "Quantitative",
    category: "Geometry",
    question: "Two complementary angles have a ratio of 2:3. What is the larger angle?",
    options: ["36°", "45°", "54°", "72°"],
    correct: 2,
    explanation: "Complementary angles sum to 90°\n2x + 3x = 90\n5x = 90, x = 18\nLarger = 3 × 18 = 54°",
  },

  // More Ratios questions (71-78)
  {
    id: 71,
    section: "Quantitative",
    category: "Ratios",
    question: "What is 40% of 150?",
    options: ["40", "50", "60", "75"],
    correct: 2,
    explanation: "40% of 150 = 0.4 × 150 = 60",
  },
  {
    id: 72,
    section: "Quantitative",
    category: "Ratios",
    question: "If 3:x = 9:15, find x",
    options: ["3", "4", "5", "6"],
    correct: 2,
    explanation: "3:x = 9:15\n3 × 15 = 9 × x\n45 = 9x\nx = 5",
  },
  {
    id: 73,
    section: "Quantitative",
    category: "Ratios",
    question: "A price increased from $80 to $100. What is the percentage increase?",
    options: ["20%", "25%", "30%", "80%"],
    correct: 1,
    explanation: "Increase = 100 - 80 = 20\nPercentage = (20/80) × 100 = 25%",
  },
  {
    id: 74,
    section: "Quantitative",
    category: "Ratios",
    question: "If 8 workers can complete a job in 6 days, how many days for 12 workers?",
    options: ["2", "3", "4", "9"],
    correct: 2,
    explanation: "Inverse proportion: 8 × 6 = 12 × x\n48 = 12x\nx = 4 days",
  },
  {
    id: 75,
    section: "Quantitative",
    category: "Ratios",
    question: "What fraction is 25% equivalent to?",
    options: ["1/5", "1/4", "1/3", "2/5"],
    correct: 1,
    explanation: "25% = 25/100 = 1/4",
  },
  {
    id: 76,
    section: "Quantitative",
    category: "Ratios",
    question: "The ratio of cats to dogs is 5:3. If there are 24 animals in total, how many cats?",
    options: ["12", "15", "9", "18"],
    correct: 1,
    explanation: "Total parts = 5 + 3 = 8\nCats = (5/8) × 24 = 15",
  },
  {
    id: 77,
    section: "Quantitative",
    category: "Ratios",
    question: "A bag contains red and blue balls in ratio 2:5. If there are 35 balls, how many are red?",
    options: ["5", "10", "14", "25"],
    correct: 1,
    explanation: "Total parts = 7\nRed = (2/7) × 35 = 10",
  },
  {
    id: 78,
    section: "Quantitative",
    category: "Ratios",
    question: "After a 30% discount, a shirt costs $35. What was the original price?",
    options: ["$45", "$50", "$55", "$60"],
    correct: 1,
    explanation: "70% of original = $35\nOriginal = 35 ÷ 0.7 = $50",
  },

  // More Statistics questions (86-92)
  {
    id: 86,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the average of 12, 15, 18, 21, 24?",
    options: ["17", "18", "19", "20"],
    correct: 1,
    explanation: "Average = (12+15+18+21+24) ÷ 5 = 90 ÷ 5 = 18",
  },
  {
    id: 87,
    section: "Quantitative",
    category: "Statistics",
    question: "Find the median of: 4, 7, 2, 9, 5, 3, 8",
    options: ["4", "5", "6", "7"],
    correct: 1,
    explanation: "Sorted: 2, 3, 4, 5, 7, 8, 9\nMedian (middle) = 5",
  },
  {
    id: 88,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the mode of: 5, 3, 5, 7, 5, 8, 3, 5?",
    options: ["3", "5", "7", "8"],
    correct: 1,
    explanation: "5 appears 4 times (most frequent)\nMode = 5",
  },
  {
    id: 89,
    section: "Quantitative",
    category: "Statistics",
    question: "The probability of rolling a 6 on a fair die is:",
    options: ["1/3", "1/4", "1/5", "1/6"],
    correct: 3,
    explanation: "A die has 6 faces, each equally likely\nP(6) = 1/6",
  },
  {
    id: 90,
    section: "Quantitative",
    category: "Statistics",
    question: "If the mean of 5 numbers is 12, what is their sum?",
    options: ["50", "55", "60", "65"],
    correct: 2,
    explanation: "Mean = Sum ÷ Count\n12 = Sum ÷ 5\nSum = 60",
  },
  {
    id: 91,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the range of: 15, 8, 22, 11, 19?",
    options: ["11", "14", "19", "22"],
    correct: 1,
    explanation: "Range = Max - Min = 22 - 8 = 14",
  },
  {
    id: 92,
    section: "Quantitative",
    category: "Statistics",
    question: "Two dice are rolled. What is the probability of getting a sum of 7?",
    options: ["1/6", "1/9", "1/12", "1/36"],
    correct: 0,
    explanation: "Possible outcomes = 36\nWays to get 7: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6\nP = 6/36 = 1/6",
  },

  // More Analogies (101-110)
  {
    id: 101,
    section: "Verbal",
    category: "Analogies",
    question: "Pen : Write :: Scissors : ?",
    options: ["Paper", "Cut", "Sharp", "Metal"],
    correct: 1,
    explanation: "Pen is used to write\nScissors are used to cut",
  },
  {
    id: 102,
    section: "Verbal",
    category: "Analogies",
    question: "Eye : See :: Ear : ?",
    options: ["Sound", "Hear", "Nose", "Talk"],
    correct: 1,
    explanation: "Eye is used to see\nEar is used to hear",
  },
  {
    id: 103,
    section: "Verbal",
    category: "Analogies",
    question: "Tree : Forest :: Star : ?",
    options: ["Moon", "Sky", "Galaxy", "Night"],
    correct: 2,
    explanation: "Many trees make a forest\nMany stars make a galaxy",
  },
  {
    id: 104,
    section: "Verbal",
    category: "Analogies",
    question: "Author : Book :: Composer : ?",
    options: ["Sing", "Music", "Piano", "Notes"],
    correct: 1,
    explanation: "Author creates books\nComposer creates music",
  },
  {
    id: 105,
    section: "Verbal",
    category: "Analogies",
    question: "Hungry : Eat :: Tired : ?",
    options: ["Work", "Walk", "Sleep", "Run"],
    correct: 2,
    explanation: "When hungry, you eat\nWhen tired, you sleep",
  },
  {
    id: 106,
    section: "Verbal",
    category: "Analogies",
    question: "Ice : Cold :: Fire : ?",
    options: ["Warm", "Hot", "Burn", "Red"],
    correct: 1,
    explanation: "Ice is cold\nFire is hot",
  },
  {
    id: 107,
    section: "Verbal",
    category: "Analogies",
    question: "Pilot : Plane :: Captain : ?",
    options: ["Car", "Train", "Ship", "Bike"],
    correct: 2,
    explanation: "Pilot operates a plane\nCaptain operates a ship",
  },
  {
    id: 108,
    section: "Verbal",
    category: "Analogies",
    question: "Cup : Coffee :: Bowl : ?",
    options: ["Water", "Soup", "Milk", "Plate"],
    correct: 1,
    explanation: "Cup is for coffee\nBowl is for soup",
  },
  {
    id: 109,
    section: "Verbal",
    category: "Analogies",
    question: "Cow : Calf :: Horse : ?",
    options: ["Pony", "Foal", "Mare", "Stallion"],
    correct: 1,
    explanation: "Calf is baby of cow\nFoal is baby of horse",
  },
  {
    id: 110,
    section: "Verbal",
    category: "Analogies",
    question: "Moon : Night :: Sun : ?",
    options: ["Light", "Day", "Hot", "Yellow"],
    correct: 1,
    explanation: "Moon is associated with night\nSun is associated with day",
  },

  // More Sentence Completion (131-138)
  {
    id: 131,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The scientist made an important _____ that changed our understanding.",
    options: ["mistake", "discovery", "problem", "question"],
    correct: 1,
    explanation: "A discovery changes understanding. Context indicates positive outcome.",
  },
  {
    id: 132,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Despite his _____, he failed the exam.",
    options: ["laziness", "effort", "absence", "ignorance"],
    correct: 1,
    explanation: "'Despite' shows contrast - he tried hard but still failed.",
  },
  {
    id: 133,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The teacher _____ the students for their excellent work.",
    options: ["punished", "ignored", "praised", "scolded"],
    correct: 2,
    explanation: "Excellent work deserves praise.",
  },
  {
    id: 134,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Knowledge is more _____ than gold.",
    options: ["heavy", "shiny", "valuable", "yellow"],
    correct: 2,
    explanation: "Knowledge is more valuable - common saying about worth of knowledge.",
  },
  {
    id: 135,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The _____ of the situation required immediate action.",
    options: ["humor", "urgency", "simplicity", "comedy"],
    correct: 1,
    explanation: "Urgency requires immediate action.",
  },
  {
    id: 136,
    section: "Verbal",
    category: "Sentence Completion",
    question: "A journey of a thousand miles begins with a single _____.",
    options: ["thought", "dream", "step", "mile"],
    correct: 2,
    explanation: "Famous proverb: begins with a single step.",
  },
  {
    id: 137,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The medicine had a _____ effect on his health.",
    options: ["harmful", "beneficial", "neutral", "strange"],
    correct: 1,
    explanation: "Medicine typically has a beneficial (positive) effect.",
  },
  {
    id: 138,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Her _____ nature made her popular among friends.",
    options: ["selfish", "generous", "angry", "quiet"],
    correct: 1,
    explanation: "Generous nature makes people popular.",
  },

  // More Reading Comprehension (161-165)
  {
    id: 161,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Water is essential for life. Without it, humans can survive only 3 days.' How long can humans survive without water?",
    options: ["1 day", "3 days", "7 days", "10 days"],
    correct: 1,
    explanation: "The text states 'only 3 days'.",
  },
  {
    id: 162,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'The cheetah is the fastest land animal, reaching speeds of 70 mph.' What is the cheetah's top speed?",
    options: ["50 mph", "60 mph", "70 mph", "80 mph"],
    correct: 2,
    explanation: "Text clearly states '70 mph'.",
  },
  {
    id: 163,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.' How old was the edible honey found?",
    options: ["1000 years", "2000 years", "3000 years", "4000 years"],
    correct: 2,
    explanation: "The text mentions '3000-year-old honey'.",
  },
  {
    id: 164,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'The heart beats about 100,000 times per day, pumping blood throughout the body.' How many times does the heart beat daily?",
    options: ["10,000", "50,000", "100,000", "1,000,000"],
    correct: 2,
    explanation: "Text states 'about 100,000 times per day'.",
  },
  {
    id: 165,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Einstein developed the theory of relativity, revolutionizing physics.' Who developed the theory of relativity?",
    options: ["Newton", "Einstein", "Darwin", "Galileo"],
    correct: 1,
    explanation: "The text directly names Einstein.",
  },

  // Odd Word Out (181-190)
  {
    id: 181,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Apple, Orange, Carrot, Banana",
    options: ["Apple", "Orange", "Carrot", "Banana"],
    correct: 2,
    explanation: "Carrot is a vegetable; others are fruits.",
  },
  {
    id: 182,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Chair, Table, Lamp, Apple",
    options: ["Chair", "Table", "Lamp", "Apple"],
    correct: 3,
    explanation: "Apple is food; others are furniture/household items.",
  },
  {
    id: 183,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Dog, Cat, Bird, Chair",
    options: ["Dog", "Cat", "Bird", "Chair"],
    correct: 3,
    explanation: "Chair is not an animal; others are animals.",
  },
  {
    id: 184,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Red, Blue, Square, Green",
    options: ["Red", "Blue", "Square", "Green"],
    correct: 2,
    explanation: "Square is a shape; others are colors.",
  },
  {
    id: 185,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Monday, Friday, April, Sunday",
    options: ["Monday", "Friday", "April", "Sunday"],
    correct: 2,
    explanation: "April is a month; others are days of the week.",
  },
  {
    id: 186,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Piano, Guitar, Violin, Painting",
    options: ["Piano", "Guitar", "Violin", "Painting"],
    correct: 3,
    explanation: "Painting is visual art; others are musical instruments.",
  },
  {
    id: 187,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Run, Walk, Jump, Think",
    options: ["Run", "Walk", "Jump", "Think"],
    correct: 3,
    explanation: "Think is mental; others are physical actions.",
  },
  {
    id: 188,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Doctor, Teacher, Hospital, Engineer",
    options: ["Doctor", "Teacher", "Hospital", "Engineer"],
    correct: 2,
    explanation: "Hospital is a place; others are professions.",
  },
  {
    id: 189,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Paris, London, France, Tokyo",
    options: ["Paris", "London", "France", "Tokyo"],
    correct: 2,
    explanation: "France is a country; others are capital cities.",
  },
  {
    id: 190,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which word does NOT belong: Hammer, Screwdriver, Nail, Wrench",
    options: ["Hammer", "Screwdriver", "Nail", "Wrench"],
    correct: 2,
    explanation: "Nail is a fastener; others are tools.",
  },

  // Keep the rest of the existing questions from id 6-20, 21-40
  {
    id: 6,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the area of a rectangle with length 8 and width 5?",
    options: ["13", "26", "40", "80"],
    correct: 2,
    explanation: "Area of rectangle = length × width\nArea = 8 × 5 = 40",
  },
  {
    id: 7,
    section: "Quantitative",
    category: "Geometry",
    question: "The sum of angles in a triangle is:",
    options: ["90°", "180°", "270°", "360°"],
    correct: 1,
    explanation: "The sum of all interior angles in any triangle is always 180°",
  },
  {
    id: 8,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the perimeter of a square with side 6?",
    options: ["12", "18", "24", "36"],
    correct: 2,
    explanation: "Perimeter of square = 4 × side\nPerimeter = 4 × 6 = 24",
  },
  {
    id: 9,
    section: "Quantitative",
    category: "Geometry",
    question: "In a right triangle with legs 6 and 8, what is the hypotenuse?",
    options: ["7", "10", "12", "14"],
    correct: 1,
    explanation: "Using Pythagorean theorem:\nc² = 6² + 8²\nc² = 36 + 64 = 100\nc = √100 = 10",
  },
  {
    id: 10,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the area of a circle with radius 7? (π = 22/7)",
    options: ["44", "88", "154", "308"],
    correct: 2,
    explanation: "Area of circle = π × r²\nArea = (22/7) × 7² = (22/7) × 49 = 154",
  },
  {
    id: 11,
    section: "Quantitative",
    category: "Ratios",
    question: "If the ratio of boys to girls is 3:5 and there are 15 boys, how many girls are there?",
    options: ["20", "25", "30", "35"],
    correct: 1,
    explanation: "3:5 = 15:x\n3x = 15 × 5 = 75\nx = 25 girls",
  },
  {
    id: 12,
    section: "Quantitative",
    category: "Ratios",
    question: "What is 25% of 80?",
    options: ["15", "20", "25", "30"],
    correct: 1,
    explanation: "25% of 80 = (25/100) × 80 = 0.25 × 80 = 20",
  },
  {
    id: 13,
    section: "Quantitative",
    category: "Ratios",
    question: "If a car travels 240 km in 4 hours, what is its average speed?",
    options: ["40 km/h", "50 km/h", "60 km/h", "70 km/h"],
    correct: 2,
    explanation: "Speed = Distance ÷ Time\nSpeed = 240 ÷ 4 = 60 km/h",
  },
  {
    id: 14,
    section: "Quantitative",
    category: "Ratios",
    question: "A shirt costs $40 after a 20% discount. What was the original price?",
    options: ["$45", "$48", "$50", "$52"],
    correct: 2,
    explanation: "If 80% of original = $40\nOriginal = 40 ÷ 0.80 = $50",
  },
  {
    id: 15,
    section: "Quantitative",
    category: "Ratios",
    question: "The ratio 2:3 is equivalent to:",
    options: ["4:6", "3:4", "6:8", "5:6"],
    correct: 0,
    explanation: "2:3 multiplied by 2 gives 4:6\nBoth ratios are equivalent",
  },
  {
    id: 16,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the average of 10, 15, 20, 25, 30?",
    options: ["18", "20", "22", "25"],
    correct: 1,
    explanation: "Average = Sum ÷ Count\nSum = 10+15+20+25+30 = 100\nAverage = 100 ÷ 5 = 20",
  },
  {
    id: 17,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the median of: 3, 7, 9, 12, 15?",
    options: ["7", "9", "10", "12"],
    correct: 1,
    explanation: "The numbers are already in order.\nMedian is the middle value: 9",
  },
  {
    id: 18,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the mode of: 2, 3, 3, 4, 5, 3, 6?",
    options: ["2", "3", "4", "5"],
    correct: 1,
    explanation: "Mode is the most frequent value.\n3 appears 3 times, more than any other number.",
  },
  {
    id: 19,
    section: "Quantitative",
    category: "Statistics",
    question: "The range of 5, 8, 12, 15, 20 is:",
    options: ["5", "10", "15", "20"],
    correct: 2,
    explanation: "Range = Maximum - Minimum\nRange = 20 - 5 = 15",
  },
  {
    id: 20,
    section: "Quantitative",
    category: "Statistics",
    question: "If a coin is flipped, what is the probability of getting heads?",
    options: ["1/4", "1/3", "1/2", "2/3"],
    correct: 2,
    explanation: "A fair coin has 2 outcomes: heads or tails.\nProbability of heads = 1/2",
  },
  {
    id: 21,
    section: "Verbal",
    category: "Analogies",
    question: "Book : Reading :: Fork : ?",
    options: ["Writing", "Eating", "Cooking", "Cutting"],
    correct: 1,
    explanation: "Relationship: Object and its primary use\nBook is for reading\nFork is for eating",
  },
  {
    id: 22,
    section: "Verbal",
    category: "Analogies",
    question: "Doctor : Hospital :: Teacher : ?",
    options: ["Library", "School", "Office", "Home"],
    correct: 1,
    explanation: "Relationship: Professional and workplace\nDoctor works in hospital\nTeacher works in school",
  },
  {
    id: 23,
    section: "Verbal",
    category: "Analogies",
    question: "Hot : Cold :: Light : ?",
    options: ["Bright", "Heavy", "Dark", "Warm"],
    correct: 2,
    explanation: "Relationship: Opposites\nHot is opposite of cold\nLight is opposite of dark",
  },
  {
    id: 24,
    section: "Verbal",
    category: "Analogies",
    question: "Bird : Fly :: Fish : ?",
    options: ["Walk", "Run", "Swim", "Jump"],
    correct: 2,
    explanation: "Relationship: Animal and its movement\nBird flies\nFish swims",
  },
  {
    id: 25,
    section: "Verbal",
    category: "Analogies",
    question: "Painter : Brush :: Writer : ?",
    options: ["Book", "Pen", "Paper", "Ink"],
    correct: 1,
    explanation: "Relationship: Professional and their tool\nPainter uses brush\nWriter uses pen",
  },
  {
    id: 26,
    section: "Verbal",
    category: "Analogies",
    question: "Morning : Breakfast :: Evening : ?",
    options: ["Lunch", "Dinner", "Snack", "Sleep"],
    correct: 1,
    explanation: "Relationship: Time and associated meal\nMorning - Breakfast\nEvening - Dinner",
  },
  {
    id: 27,
    section: "Verbal",
    category: "Analogies",
    question: "Year : Months :: Week : ?",
    options: ["Hours", "Days", "Minutes", "Seconds"],
    correct: 1,
    explanation: "Relationship: Larger unit composed of smaller units\nYear has months\nWeek has days",
  },
  {
    id: 28,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The sun rises in the _____ and sets in the west.",
    options: ["north", "south", "east", "center"],
    correct: 2,
    explanation: "The sun rises in the east and sets in the west. This is a basic geographical fact.",
  },
  {
    id: 29,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Water _____ at 100 degrees Celsius.",
    options: ["freezes", "melts", "boils", "evaporates"],
    correct: 2,
    explanation: "Water boils at 100°C (212°F) at sea level.",
  },
  {
    id: 30,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The opposite of 'ancient' is _____.",
    options: ["old", "modern", "antique", "historic"],
    correct: 1,
    explanation: "Ancient means very old, so the opposite is modern (new/current).",
  },
  {
    id: 31,
    section: "Verbal",
    category: "Sentence Completion",
    question: "He was so _____ that he couldn't keep a secret.",
    options: ["quiet", "talkative", "shy", "reserved"],
    correct: 1,
    explanation: "Talkative means someone who talks a lot, which explains why they couldn't keep a secret.",
  },
  {
    id: 32,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Despite the heavy rain, the team _____ to play the match.",
    options: ["refused", "decided", "failed", "forgot"],
    correct: 1,
    explanation: "'Despite' indicates contrast - they played even though it was raining, so they 'decided' to continue.",
  },
  {
    id: 33,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The library was so _____ that you could hear a pin drop.",
    options: ["loud", "crowded", "quiet", "busy"],
    correct: 2,
    explanation: "If you could hear a pin drop, the place must be very quiet.",
  },
  {
    id: 34,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Practice makes _____.",
    options: ["better", "perfect", "good", "sense"],
    correct: 1,
    explanation: "'Practice makes perfect' is a common English saying meaning repetition leads to mastery.",
  },
  {
    id: 35,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'The Amazon rainforest produces about 20% of the world's oxygen.' What percentage of oxygen does the Amazon produce?",
    options: ["10%", "15%", "20%", "25%"],
    correct: 2,
    explanation: "The answer is directly stated in the text: 'about 20%'",
  },
  {
    id: 36,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Thomas Edison invented the light bulb in 1879.' Who invented the light bulb?",
    options: ["Benjamin Franklin", "Thomas Edison", "Nikola Tesla", "Alexander Bell"],
    correct: 1,
    explanation: "The text clearly states Thomas Edison invented the light bulb.",
  },
  {
    id: 37,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Exercise improves mood, increases energy, and helps with sleep.' How many benefits of exercise are mentioned?",
    options: ["One", "Two", "Three", "Four"],
    correct: 2,
    explanation: "Three benefits: 1) improves mood, 2) increases energy, 3) helps with sleep",
  },
  {
    id: 38,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'The Great Wall of China is over 13,000 miles long.' The Great Wall is more than:",
    options: ["10,000 miles", "11,000 miles", "12,000 miles", "14,000 miles"],
    correct: 2,
    explanation: "The text says 'over 13,000 miles', so it's more than 12,000 miles but the text says over 13,000.",
  },
  {
    id: 39,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Dolphins are mammals, not fish. They breathe air and give birth to live young.' Dolphins are:",
    options: ["Fish", "Reptiles", "Mammals", "Amphibians"],
    correct: 2,
    explanation: "The text explicitly states 'Dolphins are mammals, not fish.'",
  },
  {
    id: 40,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'The human body has 206 bones. More than half of these are in the hands and feet.' Where are most bones located?",
    options: ["In the spine", "In the skull", "In hands and feet", "In the legs"],
    correct: 2,
    explanation: "The text states 'More than half of these are in the hands and feet.'",
  },
  // Additional Algebra Questions (200-220)
  {
    id: 200,
    section: "Quantitative",
    category: "Algebra",
    question: "If 2x + 3y = 12 and y = 2, find x",
    options: ["2", "3", "4", "5"],
    correct: 1,
    explanation: "2x + 3(2) = 12\n2x + 6 = 12\n2x = 6\nx = 3",
  },
  {
    id: 201,
    section: "Quantitative",
    category: "Algebra",
    question: "Simplify: (x + 4)² - 16",
    options: ["x² + 8x", "x² + 4x", "x² + 16", "x²"],
    correct: 0,
    explanation: "(x + 4)² - 16 = x² + 8x + 16 - 16 = x² + 8x",
  },
  {
    id: 202,
    section: "Quantitative",
    category: "Algebra",
    question: "What is the value of 3⁴?",
    options: ["12", "27", "81", "243"],
    correct: 2,
    explanation: "3⁴ = 3 × 3 × 3 × 3 = 81",
  },
  {
    id: 203,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve: |2x - 6| = 10",
    options: ["x = 8 or x = -2", "x = 8 only", "x = -2 only", "x = 2 or x = -8"],
    correct: 0,
    explanation: "2x - 6 = 10 → x = 8\nor 2x - 6 = -10 → x = -2",
  },
  {
    id: 204,
    section: "Quantitative",
    category: "Algebra",
    question: "If f(x) = x² - 4x + 3, find f(2)",
    options: ["-1", "0", "1", "3"],
    correct: 0,
    explanation: "f(2) = 4 - 8 + 3 = -1",
  },
  {
    id: 205,
    section: "Quantitative",
    category: "Algebra",
    question: "What is √196?",
    options: ["12", "13", "14", "15"],
    correct: 2,
    explanation: "√196 = 14 because 14 × 14 = 196",
  },
  // Additional Geometry Questions (206-220)
  {
    id: 206,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the area of a parallelogram with base 9 and height 4?",
    options: ["13", "26", "36", "72"],
    correct: 2,
    explanation: "Area = base × height = 9 × 4 = 36",
  },
  {
    id: 207,
    section: "Quantitative",
    category: "Geometry",
    question: "A square has diagonal 8√2. What is its area?",
    options: ["32", "64", "128", "16"],
    correct: 1,
    explanation: "Side = diagonal/√2 = 8\nArea = 8² = 64",
  },
  {
    id: 208,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the sum of interior angles of a pentagon?",
    options: ["360°", "450°", "540°", "720°"],
    correct: 2,
    explanation: "Sum = (n-2) × 180° = (5-2) × 180° = 540°",
  },
  {
    id: 209,
    section: "Quantitative",
    category: "Geometry",
    question: "Find the area of a trapezoid with parallel sides 6 and 10, and height 4",
    options: ["32", "40", "24", "48"],
    correct: 0,
    explanation: "Area = ½(a + b) × h = ½(6 + 10) × 4 = 32",
  },
  {
    id: 210,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the circumference of a circle with radius 5? (π = 3.14)",
    options: ["15.7", "31.4", "78.5", "25"],
    correct: 1,
    explanation: "Circumference = 2πr = 2 × 3.14 × 5 = 31.4",
  },
  // Additional Ratios Questions (211-220)
  {
    id: 211,
    section: "Quantitative",
    category: "Ratios",
    question: "If 15% of a number is 45, what is the number?",
    options: ["200", "250", "300", "350"],
    correct: 2,
    explanation: "15% × x = 45\nx = 45 ÷ 0.15 = 300",
  },
  {
    id: 212,
    section: "Quantitative",
    category: "Ratios",
    question: "A map scale is 1:50000. If distance on map is 4cm, actual distance is:",
    options: ["2 km", "20 km", "200 km", "0.2 km"],
    correct: 0,
    explanation: "Actual = 4 × 50000 = 200000 cm = 2000 m = 2 km",
  },
  {
    id: 213,
    section: "Quantitative",
    category: "Ratios",
    question: "A recipe needs flour and sugar in ratio 5:2. For 350g flour, how much sugar?",
    options: ["100g", "120g", "140g", "160g"],
    correct: 2,
    explanation: "5:2 = 350:x\n5x = 700\nx = 140g",
  },
  {
    id: 214,
    section: "Quantitative",
    category: "Ratios",
    question: "Price increased from $60 to $75. Find percentage increase.",
    options: ["15%", "20%", "25%", "30%"],
    correct: 2,
    explanation: "Increase = 15, Percentage = (15/60) × 100 = 25%",
  },
  {
    id: 215,
    section: "Quantitative",
    category: "Ratios",
    question: "If a:b = 2:3 and b:c = 4:5, find a:c",
    options: ["8:15", "2:5", "6:5", "4:15"],
    correct: 0,
    explanation: "a:b:c = 8:12:15, so a:c = 8:15",
  },
  // Additional Statistics Questions (216-225)
  {
    id: 216,
    section: "Quantitative",
    category: "Statistics",
    question: "Find median of: 12, 5, 8, 3, 9, 7, 11",
    options: ["7", "8", "9", "7.5"],
    correct: 1,
    explanation: "Sorted: 3, 5, 7, 8, 9, 11, 12. Middle = 8",
  },
  {
    id: 217,
    section: "Quantitative",
    category: "Statistics",
    question: "What is the probability of drawing a red card from a standard deck?",
    options: ["1/4", "1/3", "1/2", "2/3"],
    correct: 2,
    explanation: "26 red cards out of 52. P = 26/52 = 1/2",
  },
  {
    id: 218,
    section: "Quantitative",
    category: "Statistics",
    question: "If variance is 25, what is the standard deviation?",
    options: ["5", "12.5", "625", "2.5"],
    correct: 0,
    explanation: "Standard deviation = √variance = √25 = 5",
  },
  {
    id: 219,
    section: "Quantitative",
    category: "Statistics",
    question: "In how many ways can 4 books be arranged on a shelf?",
    options: ["4", "16", "24", "256"],
    correct: 2,
    explanation: "4! = 4 × 3 × 2 × 1 = 24 ways",
  },
  // Additional Analogies (220-235)
  {
    id: 220,
    section: "Verbal",
    category: "Analogies",
    question: "Finger : Hand :: Toe : ?",
    options: ["Leg", "Foot", "Arm", "Knee"],
    correct: 1,
    explanation: "Finger is part of hand. Toe is part of foot.",
  },
  {
    id: 221,
    section: "Verbal",
    category: "Analogies",
    question: "Bee : Hive :: Ant : ?",
    options: ["Hill", "Colony", "Nest", "Burrow"],
    correct: 1,
    explanation: "Bee lives in hive. Ant lives in colony.",
  },
  {
    id: 222,
    section: "Verbal",
    category: "Analogies",
    question: "Bread : Baker :: Dress : ?",
    options: ["Tailor", "Designer", "Seller", "Fabric"],
    correct: 0,
    explanation: "Baker makes bread. Tailor makes dress.",
  },
  {
    id: 223,
    section: "Verbal",
    category: "Analogies",
    question: "Winter : Cold :: Summer : ?",
    options: ["Warm", "Hot", "Mild", "Cool"],
    correct: 1,
    explanation: "Winter is cold. Summer is hot.",
  },
  {
    id: 224,
    section: "Verbal",
    category: "Analogies",
    question: "Knife : Cut :: Needle : ?",
    options: ["Thread", "Sew", "Sharp", "Cloth"],
    correct: 1,
    explanation: "Knife is used to cut. Needle is used to sew.",
  },
  {
    id: 225,
    section: "Verbal",
    category: "Analogies",
    question: "Sheep : Flock :: Fish : ?",
    options: ["Group", "School", "Pack", "Herd"],
    correct: 1,
    explanation: "Group of sheep is flock. Group of fish is school.",
  },
  // Additional Sentence Completion (226-240)
  {
    id: 226,
    section: "Verbal",
    category: "Sentence Completion",
    question: "Actions speak louder than _____.",
    options: ["thoughts", "words", "deeds", "sounds"],
    correct: 1,
    explanation: "Common proverb: Actions speak louder than words.",
  },
  {
    id: 227,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The early bird catches the _____.",
    options: ["food", "worm", "prey", "insect"],
    correct: 1,
    explanation: "Famous proverb: The early bird catches the worm.",
  },
  {
    id: 228,
    section: "Verbal",
    category: "Sentence Completion",
    question: "All that glitters is not _____.",
    options: ["silver", "gold", "diamond", "bright"],
    correct: 1,
    explanation: "Famous saying: All that glitters is not gold.",
  },
  {
    id: 229,
    section: "Verbal",
    category: "Sentence Completion",
    question: "His _____ behavior surprised everyone at the meeting.",
    options: ["expected", "predictable", "unusual", "normal"],
    correct: 2,
    explanation: "Unusual behavior would surprise people.",
  },
  {
    id: 230,
    section: "Verbal",
    category: "Sentence Completion",
    question: "The weather was so _____ that we canceled our outdoor plans.",
    options: ["beautiful", "pleasant", "terrible", "nice"],
    correct: 2,
    explanation: "Terrible weather causes cancellation of outdoor plans.",
  },
  // Additional Reading Comprehension (231-245)
  {
    id: 231,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'The Sahara Desert is the world's largest hot desert, covering 9 million square kilometers.' The Sahara covers:",
    options: ["7 million km²", "8 million km²", "9 million km²", "10 million km²"],
    correct: 2,
    explanation: "Text states '9 million square kilometers'.",
  },
  {
    id: 232,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Photosynthesis is the process by which plants convert sunlight into food.' Photosynthesis converts:",
    options: ["Food to sunlight", "Sunlight to food", "Water to oxygen", "Air to sugar"],
    correct: 1,
    explanation: "Plants convert sunlight into food through photosynthesis.",
  },
  {
    id: 233,
    section: "Verbal",
    category: "Reading Comprehension",
    question: "Text: 'Mount Everest, at 8,849 meters, is Earth's highest mountain above sea level.' How tall is Everest?",
    options: ["8,748 m", "8,849 m", "8,948 m", "9,000 m"],
    correct: 1,
    explanation: "Text clearly states 8,849 meters.",
  },
  // Additional Odd Word Out (234-250)
  {
    id: 234,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: Mercury, Venus, Moon, Mars",
    options: ["Mercury", "Venus", "Moon", "Mars"],
    correct: 2,
    explanation: "Moon is a satellite. Others are planets.",
  },
  {
    id: 235,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: Addition, Subtraction, Division, Equation",
    options: ["Addition", "Subtraction", "Division", "Equation"],
    correct: 3,
    explanation: "Equation is a mathematical statement. Others are operations.",
  },
  {
    id: 236,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: Inch, Meter, Kilogram, Foot",
    options: ["Inch", "Meter", "Kilogram", "Foot"],
    correct: 2,
    explanation: "Kilogram is mass. Others are length units.",
  },
  {
    id: 237,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: Oxygen, Hydrogen, Water, Nitrogen",
    options: ["Oxygen", "Hydrogen", "Water", "Nitrogen"],
    correct: 2,
    explanation: "Water is a compound. Others are elements.",
  },
  {
    id: 238,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: Ear, Nose, Hand, Eye",
    options: ["Ear", "Nose", "Hand", "Eye"],
    correct: 2,
    explanation: "Hand is a limb. Others are sensory organs on face.",
  },
  {
    id: 239,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: King, Queen, President, Prince",
    options: ["King", "Queen", "President", "Prince"],
    correct: 2,
    explanation: "President is elected. Others are royalty.",
  },
  {
    id: 240,
    section: "Verbal",
    category: "Odd Word Out",
    question: "Which doesn't belong: Breakfast, Lunch, Dinner, Kitchen",
    options: ["Breakfast", "Lunch", "Dinner", "Kitchen"],
    correct: 3,
    explanation: "Kitchen is a place. Others are meals.",
  },
  // ========== Additional Questions (241-300) ==========
  // Advanced Algebra (241-260)
  {
    id: 241,
    section: "Quantitative",
    category: "Algebra",
    question: "If x³ = 64, what is x?",
    options: ["2", "3", "4", "8"],
    correct: 2,
    explanation: "x³ = 64, x = ∛64 = 4",
  },
  {
    id: 242,
    section: "Quantitative",
    category: "Algebra",
    question: "Simplify: 5² × 5³",
    options: ["25", "125", "625", "3125"],
    correct: 3,
    explanation: "5² × 5³ = 5^(2+3) = 5⁵ = 3125",
  },
  {
    id: 243,
    section: "Quantitative",
    category: "Algebra",
    question: "If 2x + 3y = 18 and y = 2, find x",
    options: ["4", "5", "6", "7"],
    correct: 2,
    explanation: "2x + 3(2) = 18\n2x + 6 = 18\n2x = 12\nx = 6",
  },
  {
    id: 244,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve: 5x - 15 = 2x + 6",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "5x - 2x = 6 + 15\n3x = 21\nx = 7",
  },
  {
    id: 245,
    section: "Quantitative",
    category: "Algebra",
    question: "What is (x + 5)² when x = 3?",
    options: ["49", "56", "64", "81"],
    correct: 2,
    explanation: "(3 + 5)² = 8² = 64",
  },
  {
    id: 246,
    section: "Quantitative",
    category: "Algebra",
    question: "If x² - 25 = 0, then x =",
    options: ["±3", "±4", "±5", "±6"],
    correct: 2,
    explanation: "x² = 25, x = ±√25 = ±5",
  },
  {
    id: 247,
    section: "Quantitative",
    category: "Algebra",
    question: "What is √(64 + 36)?",
    options: ["8", "9", "10", "11"],
    correct: 2,
    explanation: "√(64 + 36) = √100 = 10",
  },
  {
    id: 248,
    section: "Quantitative",
    category: "Algebra",
    question: "If 4x = 2x + 16, what is x?",
    options: ["6", "7", "8", "9"],
    correct: 2,
    explanation: "4x - 2x = 16\n2x = 16\nx = 8",
  },
  {
    id: 249,
    section: "Quantitative",
    category: "Algebra",
    question: "What is (-3)⁴?",
    options: ["-81", "-27", "27", "81"],
    correct: 3,
    explanation: "(-3)⁴ = 81 (even power makes it positive)",
  },
  {
    id: 250,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve: |x - 4| = 7",
    options: ["x = 11 or -3", "x = 3 or -11", "x = 11 only", "x = -3 only"],
    correct: 0,
    explanation: "x - 4 = 7 → x = 11\nor x - 4 = -7 → x = -3",
  },
  {
    id: 251,
    section: "Quantitative",
    category: "Algebra",
    question: "If f(x) = 2x² - 3x, find f(4)",
    options: ["16", "20", "24", "28"],
    correct: 1,
    explanation: "f(4) = 2(16) - 3(4) = 32 - 12 = 20",
  },
  {
    id: 252,
    section: "Quantitative",
    category: "Algebra",
    question: "Simplify: 12x³ ÷ 4x",
    options: ["3x", "3x²", "4x²", "8x²"],
    correct: 1,
    explanation: "12x³ ÷ 4x = 3x²",
  },
  {
    id: 253,
    section: "Quantitative",
    category: "Algebra",
    question: "If x + y = 12 and x - y = 4, what is x?",
    options: ["6", "7", "8", "9"],
    correct: 2,
    explanation: "Adding: 2x = 16, x = 8",
  },
  {
    id: 254,
    section: "Quantitative",
    category: "Algebra",
    question: "What is ⁵√32?",
    options: ["2", "3", "4", "5"],
    correct: 0,
    explanation: "⁵√32 = 2 because 2⁵ = 32",
  },
  {
    id: 255,
    section: "Quantitative",
    category: "Algebra",
    question: "Solve: 3(x - 2) = x + 8",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "3x - 6 = x + 8\n2x = 14\nx = 7",
  },
  {
    id: 256,
    section: "Quantitative",
    category: "Algebra",
    question: "What is (5x)(2x³)?",
    options: ["7x⁴", "10x³", "10x⁴", "7x³"],
    correct: 2,
    explanation: "(5x)(2x³) = 10x⁴",
  },
  {
    id: 257,
    section: "Quantitative",
    category: "Algebra",
    question: "If 2x² = 72, what is x?",
    options: ["±4", "±5", "±6", "±7"],
    correct: 2,
    explanation: "x² = 36, x = ±6",
  },
  {
    id: 258,
    section: "Quantitative",
    category: "Algebra",
    question: "What is log₃(81)?",
    options: ["2", "3", "4", "5"],
    correct: 2,
    explanation: "log₃(81) = 4 because 3⁴ = 81",
  },
  {
    id: 259,
    section: "Quantitative",
    category: "Algebra",
    question: "If x/4 + x/8 = 6, find x",
    options: ["12", "14", "16", "18"],
    correct: 2,
    explanation: "2x/8 + x/8 = 6\n3x/8 = 6\nx = 16",
  },
  {
    id: 260,
    section: "Quantitative",
    category: "Algebra",
    question: "What is (x + 3)(x - 3)?",
    options: ["x² - 9", "x² + 9", "x² - 6x", "x² + 6x"],
    correct: 0,
    explanation: "Difference of squares: (x+3)(x-3) = x² - 9",
  },
  // Advanced Geometry (261-275)
  {
    id: 261,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the area of a rhombus with diagonals 8 and 10?",
    options: ["20", "30", "40", "50"],
    correct: 2,
    explanation: "Area = (d₁ × d₂)/2 = (8 × 10)/2 = 40",
  },
  {
    id: 262,
    section: "Quantitative",
    category: "Geometry",
    question: "Volume of a cube with edge 5 cm:",
    options: ["25 cm³", "75 cm³", "100 cm³", "125 cm³"],
    correct: 3,
    explanation: "Volume = e³ = 5³ = 125 cm³",
  },
  {
    id: 263,
    section: "Quantitative",
    category: "Geometry",
    question: "What is the sum of interior angles of an octagon?",
    options: ["900°", "1080°", "1260°", "1440°"],
    correct: 1,
    explanation: "Sum = (n-2) × 180° = (8-2) × 180° = 1080°",
  },
  {
    id: 264,
    section: "Quantitative",
    category: "Geometry",
    question: "Surface area of a sphere with radius 3 (π = 3.14):",
    options: ["28.26", "56.52", "113.04", "150.72"],
    correct: 2,
    explanation: "Surface area = 4πr² = 4 × 3.14 × 9 = 113.04",
  },
  {
    id: 265,
    section: "Quantitative",
    category: "Geometry",
    question: "If the perimeter of a square is 36, what is its area?",
    options: ["64", "72", "81", "100"],
    correct: 2,
    explanation: "Side = 36/4 = 9\nArea = 9² = 81",
  },
  {
    id: 266,
    section: "Quantitative",
    category: "Geometry",
    question: "Volume of a cone with radius 4 and height 6 (π = 3.14):",
    options: ["25.12", "50.24", "75.36", "100.48"],
    correct: 3,
    explanation: "V = (1/3)πr²h = (1/3) × 3.14 × 16 × 6 = 100.48",
  },
  {
    id: 267,
    section: "Quantitative",
    category: "Geometry",
    question: "The diagonal of a rectangle is 13 and width is 5. What is the length?",
    options: ["10", "11", "12", "14"],
    correct: 2,
    explanation: "l² + 5² = 13²\nl² = 169 - 25 = 144\nl = 12",
  },
  {
    id: 268,
    section: "Quantitative",
    category: "Geometry",
    question: "How many diagonals does a hexagon have?",
    options: ["6", "7", "8", "9"],
    correct: 3,
    explanation: "Diagonals = n(n-3)/2 = 6(3)/2 = 9",
  },
  {
    id: 269,
    section: "Quantitative",
    category: "Geometry",
    question: "Interior angle of a regular decagon:",
    options: ["135°", "140°", "144°", "150°"],
    correct: 2,
    explanation: "Interior angle = (n-2)×180/n = (8×180)/10 = 144°",
  },
  {
    id: 270,
    section: "Quantitative",
    category: "Geometry",
    question: "Height of an equilateral triangle with side 6:",
    options: ["3√2", "3√3", "6√2", "6√3"],
    correct: 1,
    explanation: "Height = (√3/2) × side = (√3/2) × 6 = 3√3",
  },
  {
    id: 271,
    section: "Quantitative",
    category: "Geometry",
    question: "Area of a semicircle with diameter 14 (π = 22/7):",
    options: ["77", "154", "231", "308"],
    correct: 0,
    explanation: "Area = (1/2)πr² = (1/2) × (22/7) × 49 = 77",
  },
  {
    id: 272,
    section: "Quantitative",
    category: "Geometry",
    question: "If the volume of a cube is 216, what is its surface area?",
    options: ["144", "180", "216", "252"],
    correct: 2,
    explanation: "Side = ∛216 = 6\nSurface area = 6 × 6² = 216",
  },
  {
    id: 273,
    section: "Quantitative",
    category: "Geometry",
    question: "The circumference of a circle is 44. What is its area? (π = 22/7)",
    options: ["154", "176", "198", "220"],
    correct: 0,
    explanation: "2πr = 44, r = 7\nArea = πr² = (22/7) × 49 = 154",
  },
  {
    id: 274,
    section: "Quantitative",
    category: "Geometry",
    question: "Volume of a rectangular prism: 4 × 5 × 6",
    options: ["100", "110", "120", "130"],
    correct: 2,
    explanation: "Volume = 4 × 5 × 6 = 120",
  },
  {
    id: 275,
    section: "Quantitative",
    category: "Geometry",
    question: "Lateral surface area of a cylinder with r=3 and h=7 (π = 22/7):",
    options: ["88", "110", "132", "154"],
    correct: 2,
    explanation: "Lateral area = 2πrh = 2 × (22/7) × 3 × 7 = 132",
  },
  // Advanced Ratios (276-285)
  {
    id: 276,
    section: "Quantitative",
    category: "Ratios",
    question: "If the ratio of A to B is 3:7 and B is 35, what is A?",
    options: ["12", "15", "18", "21"],
    correct: 1,
    explanation: "3/7 = A/35\nA = (3 × 35)/7 = 15",
  },
  {
    id: 277,
    section: "Quantitative",
    category: "Ratios",
    question: "A price dropped from $120 to $90. What is the percentage decrease?",
    options: ["20%", "25%", "30%", "35%"],
    correct: 1,
    explanation: "Decrease = 30\nPercentage = (30/120) × 100 = 25%",
  },
  {
    id: 278,
    section: "Quantitative",
    category: "Ratios",
    question: "If 5 machines produce 100 items in 2 hours, how many items do 8 machines produce in 3 hours?",
    options: ["200", "240", "280", "320"],
    correct: 1,
    explanation: "Rate per machine per hour = 10\n8 machines × 3 hours = 240 items",
  },
  {
    id: 279,
    section: "Quantitative",
    category: "Ratios",
    question: "What number is 120% of 85?",
    options: ["92", "98", "102", "112"],
    correct: 2,
    explanation: "120% of 85 = 1.2 × 85 = 102",
  },
  {
    id: 280,
    section: "Quantitative",
    category: "Ratios",
    question: "A recipe uses sugar and flour in ratio 2:5. For 300g of flour, how much sugar?",
    options: ["100g", "110g", "120g", "130g"],
    correct: 2,
    explanation: "2/5 = x/300\nx = (2 × 300)/5 = 120g",
  },
  {
    id: 281,
    section: "Quantitative",
    category: "Ratios",
    question: "An investment of $1000 grows by 10% per year. What is it worth after 2 years?",
    options: ["$1100", "$1200", "$1210", "$1250"],
    correct: 2,
    explanation: "After 1 year: $1100\nAfter 2 years: $1100 × 1.1 = $1210",
  },
  {
    id: 282,
    section: "Quantitative",
    category: "Ratios",
    question: "If 8 is to 12 as x is to 15, find x",
    options: ["8", "9", "10", "11"],
    correct: 2,
    explanation: "8/12 = x/15\nx = (8 × 15)/12 = 10",
  },
  {
    id: 283,
    section: "Quantitative",
    category: "Ratios",
    question: "A car uses 8 liters of fuel for 100 km. How many liters for 350 km?",
    options: ["24", "26", "28", "30"],
    correct: 2,
    explanation: "8/100 = x/350\nx = (8 × 350)/100 = 28 liters",
  },
  {
    id: 284,
    section: "Quantitative",
    category: "Ratios",
    question: "What is 45 as a percentage of 180?",
    options: ["20%", "25%", "30%", "35%"],
    correct: 1,
    explanation: "(45/180) × 100 = 25%",
  },
  {
    id: 285,
    section: "Quantitative",
    category: "Ratios",
    question: "If a side of a square increases by 20%, by what percent does the area increase?",
    options: ["20%", "40%", "44%", "50%"],
    correct: 2,
    explanation: "New area = (1.2)² = 1.44\nIncrease = 44%",
  },
  // Advanced Statistics (286-295)
  {
    id: 286,
    section: "Quantitative",
    category: "Statistics",
    question: "Mean of 8, 12, 15, 17, 23:",
    options: ["14", "15", "16", "17"],
    correct: 1,
    explanation: "Sum = 75, Mean = 75/5 = 15",
  },
  {
    id: 287,
    section: "Quantitative",
    category: "Statistics",
    question: "Median of 3, 7, 8, 9, 12, 15:",
    options: ["8", "8.5", "9", "9.5"],
    correct: 1,
    explanation: "Two middle values: 8 and 9\nMedian = (8+9)/2 = 8.5",
  },
  {
    id: 288,
    section: "Quantitative",
    category: "Statistics",
    question: "How many ways can 5 people be arranged in a line?",
    options: ["25", "60", "100", "120"],
    correct: 3,
    explanation: "5! = 5×4×3×2×1 = 120",
  },
  {
    id: 289,
    section: "Quantitative",
    category: "Statistics",
    question: "Probability of drawing a face card from a standard deck:",
    options: ["3/13", "4/13", "1/4", "1/3"],
    correct: 0,
    explanation: "Face cards = 12 (J, Q, K × 4 suits)\nP = 12/52 = 3/13",
  },
  {
    id: 290,
    section: "Quantitative",
    category: "Statistics",
    question: "If variance is 49, what is the standard deviation?",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "Standard deviation = √variance = √49 = 7",
  },
  {
    id: 291,
    section: "Quantitative",
    category: "Statistics",
    question: "How many ways to choose 3 items from 7 (without order)?",
    options: ["21", "35", "42", "56"],
    correct: 1,
    explanation: "C(7,3) = 7!/(3!×4!) = 35",
  },
  {
    id: 292,
    section: "Quantitative",
    category: "Statistics",
    question: "Probability of getting heads twice in 3 coin flips:",
    options: ["1/8", "3/8", "1/2", "5/8"],
    correct: 1,
    explanation: "P(exactly 2 heads) = C(3,2) × (1/2)³ = 3 × 1/8 = 3/8",
  },
  {
    id: 293,
    section: "Quantitative",
    category: "Statistics",
    question: "Range of 5, 9, 13, 17, 21, 25:",
    options: ["16", "18", "20", "22"],
    correct: 2,
    explanation: "Range = 25 - 5 = 20",
  },
  {
    id: 294,
    section: "Quantitative",
    category: "Statistics",
    question: "If mean of 6 numbers is 14, and one number 8 is removed, what is the new mean?",
    options: ["14.4", "15", "15.2", "16"],
    correct: 2,
    explanation: "Sum = 84\nNew sum = 84 - 8 = 76\nNew mean = 76/5 = 15.2",
  },
  {
    id: 295,
    section: "Quantitative",
    category: "Statistics",
    question: "Probability of NOT rolling a 6 on a die:",
    options: ["1/6", "1/3", "5/6", "2/3"],
    correct: 2,
    explanation: "P(not 6) = 1 - P(6) = 1 - 1/6 = 5/6",
  },
  // More Analogies (296-300)
  {
    id: 296,
    section: "Verbal",
    category: "Analogies",
    question: "Canvas : Painter :: Stage : ?",
    options: ["Director", "Actor", "Audience", "Curtain"],
    correct: 1,
    explanation: "Painter works on canvas. Actor performs on stage.",
  },
  {
    id: 297,
    section: "Verbal",
    category: "Analogies",
    question: "Thirsty : Drink :: Sleepy : ?",
    options: ["Eat", "Rest", "Work", "Play"],
    correct: 1,
    explanation: "When thirsty, you drink. When sleepy, you rest.",
  },
  {
    id: 298,
    section: "Verbal",
    category: "Analogies",
    question: "Keyboard : Computer :: Pedal : ?",
    options: ["Car", "Bicycle", "Piano", "Boat"],
    correct: 2,
    explanation: "Keyboard is input for computer. Pedal is input for piano.",
  },
  {
    id: 299,
    section: "Verbal",
    category: "Analogies",
    question: "Chef : Kitchen :: Pilot : ?",
    options: ["Airport", "Cockpit", "Runway", "Hangar"],
    correct: 1,
    explanation: "Chef works in kitchen. Pilot works in cockpit.",
  },
  {
    id: 300,
    section: "Verbal",
    category: "Analogies",
    question: "Wool : Sheep :: Silk : ?",
    options: ["Cotton", "Worm", "Spider", "Fabric"],
    correct: 1,
    explanation: "Wool comes from sheep. Silk comes from silkworm.",
  },
];

export default function GATTestPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !showResults) {
      setShowResults(true);
    }
  }, [timeLeft, showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    setShowExplanation(false);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishTest = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index].correct) correct++;
    });
    return correct;
  };

  const getScorePercentage = () => {
    return Math.round((calculateScore() / questions.length) * 100);
  };

  const getSectionScores = () => {
    const sections: { [key: string]: { correct: number; total: number } } = {};
    questions.forEach((q, index) => {
      if (!sections[q.section]) {
        sections[q.section] = { correct: 0, total: 0 };
      }
      sections[q.section].total++;
      if (selectedAnswers[index] === q.correct) {
        sections[q.section].correct++;
      }
    });
    return sections;
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = getScorePercentage();
    const sectionScores = getSectionScores();

    // Calculate category stats
    const categoryStats: { [key: string]: { correct: number; total: number } } = {};
    questions.forEach((q, index) => {
      const key = `${q.section}-${q.category}`;
      if (!categoryStats[key]) {
        categoryStats[key] = { correct: 0, total: 0 };
      }
      categoryStats[key].total++;
      if (selectedAnswers[index] === q.correct) {
        categoryStats[key].correct++;
      }
    });

    const categoryPerformance = Object.entries(categoryStats).map(([key, stats]) => ({
      name: key.split('-')[1],
      section: key.split('-')[0],
      percentage: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total,
    })).sort((a, b) => b.percentage - a.percentage);

    const strengths = categoryPerformance.filter(c => c.percentage >= 70).slice(0, 3);
    const weaknesses = categoryPerformance.filter(c => c.percentage < 70).slice(-3).reverse();

    // ===== Section-level cause/strength/action insights =====
    // Aggregated from the same categoryPerformance data, grouped by `section`.
    // Section-level — distinct from the topic-level strengths/weaknesses below.
    const sectionAgg: { [s: string]: { correct: number; total: number } } = {};
    for (const c of categoryPerformance) {
      if (!sectionAgg[c.section]) sectionAgg[c.section] = { correct: 0, total: 0 };
      sectionAgg[c.section].correct += c.correct;
      sectionAgg[c.section].total += c.total;
    }
    const sectionInsights = Object.entries(sectionAgg)
      .map(([name, s]) => ({
        name,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
    const weakestSection = sectionInsights[0] || null;
    const strongestSection = sectionInsights[sectionInsights.length - 1] || null;
    const sectionsTied =
      !weakestSection || !strongestSection || sectionInsights.length < 2
        ? true
        : strongestSection.accuracy - weakestSection.accuracy < 5;
    const sectionActionCount = 15;

    const timeSpent = 60 * 60 - timeLeft;
    const avgTimePerQuestion = Math.round(timeSpent / questions.length);
    const estimatedScore = Math.round(65 + (percentage * 0.35));

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors duration-300" dir="ltr">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Detailed Test Report</h1>
            <p className="text-gray-500 dark:text-gray-400">GAT Practice Test</p>
          </div>

          {/* Main Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  percentage >= 80 ? 'bg-green-100 dark:bg-green-900/40' :
                  percentage >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40' :
                  'bg-red-100 dark:bg-red-900/40'
                }`}>
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${
                      percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                      percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {percentage}%
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{score}/{questions.length}</p>
                  </div>
                </div>
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                  percentage >= 80 ? 'bg-green-500 text-white' :
                  percentage >= 60 ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : 'Needs Work'}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {percentage >= 80 ? 'Excellent Performance!' : percentage >= 60 ? 'Good Job, Keep Improving!' : 'More Practice Needed'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Estimated Qiyas Score: <span className="font-bold text-[#006C35] dark:text-[#4ade80]">{estimatedScore}</span> / 100
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    ⏱️ Time: {Math.floor(timeSpent / 60)} min
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    ⚡ Avg: {avgTimePerQuestion}s/question
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(sectionScores).map(([section, scores]) => (
              <div key={section} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    section === 'Quantitative' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
                  }`}>
                    <span className="text-2xl">{section === 'Quantitative' ? '🔢' : '📝'}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{section}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {section === 'Quantitative' ? 'Math & Logic' : 'Language & Reading'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-3xl font-bold ${
                    section === 'Quantitative' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>{scores.correct}/{scores.total}</span>
                  <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                    {Math.round((scores.correct / scores.total) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      section === 'Quantitative' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${(scores.correct / scores.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Category Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span>
              Performance by Topic
            </h3>
            <div className="space-y-3">
              {categoryPerformance.map((cat, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    cat.section === 'Quantitative'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {cat.section === 'Quantitative' ? 'Quant' : 'Verbal'}
                  </span>
                  <span className="flex-1 font-medium text-gray-700 dark:text-gray-300 text-sm">{cat.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{cat.correct}/{cat.total}</span>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat.percentage >= 80 ? 'bg-green-500' :
                        cat.percentage >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-12 text-right ${
                    cat.percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                    cat.percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Section-level cause / strength / action insights =====
              Built from `sectionInsights` (aggregated from categoryPerformance).
              Section-level — distinct from the topic-level strengths/weaknesses
              card below. */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🧭</span>
              Smart Insights & Next Step
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <span className="text-lg shrink-0">📉</span>
                <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                  {sectionsTied || !weakestSection
                    ? "Your performance is balanced across sections — no single section is dragging your score down."
                    : `Your score is held back mainly by «${weakestSection.name}» (${weakestSection.accuracy}%).`}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="text-lg shrink-0">💪</span>
                <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">
                  {sectionsTied || !strongestSection
                    ? "No standout section yet — keep training to surface your strengths."
                    : `Your strongest section is «${strongestSection.name}» (${strongestSection.accuracy}%).`}
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span className="text-lg shrink-0">⚡</span>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                    {sectionsTied || !weakestSection
                      ? `Maintain your pace: solve ${sectionActionCount} mixed questions daily and review every mistake.`
                      : `Practice ${sectionActionCount} «${weakestSection.name}» questions over the next 2 days, and read every wrong-answer explanation.`}
                  </p>
                  {/* Routes to existing /practice route. We map the
                      weakest GAT section name (Quantitative / Verbal) to
                      a stable slug (quantitative_en / verbal_en) and
                      pass it as ?focus=… so /practice can deep-link
                      later — no changes to the practice UI required.
                      When sections are tied we omit the param. */}
                  <button
                    onClick={() => {
                      const slugMap: Record<string, string> = {
                        Quantitative: "quantitative_en",
                        Verbal: "verbal_en",
                      };
                      const slug = weakestSection ? slugMap[weakestSection.name] : undefined;

                      // ===== Personalized topic prioritization =====
                      // Inside the weakest section, identify up to 2 sub-topics
                      // where the user is below 70% accuracy and forward them
                      // as ?topics=... so /practice/test ranks them first.
                      // Falls back silently to plain ?focus=... when nothing
                      // qualifies (balanced section, all topics ≥70%, or no
                      // known slug for the topic name) — same URL as today.
                      let topicsParam = "";
                      if (slug && weakestSection) {
                        const weakTopicSlugs = categoryPerformance
                          .filter((c) => c.section === weakestSection.name)
                          .filter((c) => c.percentage < 70)
                          .sort((a, b) => a.percentage - b.percentage)
                          .slice(0, 2)
                          .map((c) => categoryNameToSlug(c.name))
                          .filter((s): s is NonNullable<typeof s> => s !== null);
                        if (weakTopicSlugs.length > 0) {
                          topicsParam = `&topics=${encodeURIComponent(
                            weakTopicSlugs.join(",")
                          )}`;
                        }
                      }

                      const target =
                        sectionsTied || !slug
                          ? "/practice"
                          : `/practice?focus=${encodeURIComponent(slug)}${topicsParam}`;
                      router.push(target);
                    }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#006C35] text-white text-xs font-bold hover:bg-[#004d26] transition-colors"
                  >
                    Start Training Now
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
                <span>💪</span>
                Strengths
              </h3>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{s.name} ({s.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">Keep practicing to discover your strengths</p>
              )}
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800">
              <h3 className="font-bold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2">
                <span>🎯</span>
                Areas to Improve
              </h3>
              {weaknesses.length > 0 ? (
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{w.name} ({w.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">Great performance across all topics!</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
              <span>💡</span>
              Recommendations
            </h3>
            <ul className="space-y-3">
              {weaknesses.length > 0 && (
                <li className="flex items-start gap-3 text-blue-700 dark:text-blue-300">
                  <span className="mt-1">📚</span>
                  <span className="text-sm">Focus on improving: {weaknesses.map(w => w.name).join(', ')}</span>
                </li>
              )}
              {avgTimePerQuestion > 90 && (
                <li className="flex items-start gap-3 text-blue-700 dark:text-blue-300">
                  <span className="mt-1">⏰</span>
                  <span className="text-sm">Try to increase your pace - ideal is 60-90 seconds per question</span>
                </li>
              )}
              <li className="flex items-start gap-3 text-blue-700 dark:text-blue-300">
                <span className="mt-1">🔄</span>
                <span className="text-sm">Review incorrect answers to understand your mistakes</span>
              </li>
              <li className="flex items-start gap-3 text-blue-700 dark:text-blue-300">
                <span className="mt-1">📈</span>
                <span className="text-sm">Practice daily for at least 30 minutes for best results</span>
              </li>
            </ul>
          </div>

          {/* Question Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📋</span>
              Answer Summary
            </h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((_, index) => {
                const isCorrect = selectedAnswers[index] === questions[index].correct;
                const isUnanswered = selectedAnswers[index] === null;
                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg font-medium text-sm flex items-center justify-center ${
                      isUnanswered
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        : isCorrect
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    }`}>
                    {index + 1}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40" />
                <span className="text-gray-600 dark:text-gray-400">Correct ({score})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/40" />
                <span className="text-gray-600 dark:text-gray-400">Wrong ({questions.length - score - selectedAnswers.filter(a => a === null).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <span className="text-gray-600 dark:text-gray-400">Skipped ({selectedAnswers.filter(a => a === null).length})</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setShowResults(false);
                setCurrentQuestion(0);
                setSelectedAnswers(Array(questions.length).fill(null));
                setTimeLeft(60 * 60);
              }}
              className="flex-1 py-3 border-2 border-[#006C35] text-[#006C35] dark:text-[#4ade80] font-bold rounded-xl hover:bg-[#006C35]/5 transition-colors"
            >
              Retry Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = selectedAnswers.filter((a) => a !== null).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" dir="ltr">
      {/* Header */}
      <header className="bg-[#006C35] dark:bg-gray-800 text-white sticky top-0 z-10 border-b border-[#004d26] dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="font-bold">GAT Free Trial Test</h1>
                <p className="text-xs text-white/70 dark:text-gray-400">General Aptitude Test</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 dark:bg-gray-700 hover:bg-white/20 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === "light" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeLeft < 300 ? "bg-red-500" : "bg-white/20 dark:bg-gray-700"
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm">
                <span className="font-bold">{answeredCount}</span>
                <span className="text-white/70 dark:text-gray-400">/{questions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className="h-1 bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full bg-[#006C35] transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentQ.section === "Quantitative"
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
              }`}>
                {currentQ.section}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{currentQ.category}</span>
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{currentQ.question}</h2>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswers[currentQuestion] === index;
              const isCorrect = index === currentQ.correct;
              const showCorrectness = showExplanation && selectedAnswers[currentQuestion] !== null;

              return (
                <button
                  key={index}
                  onClick={() => !showExplanation && handleAnswer(index)}
                  disabled={showExplanation}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    showCorrectness
                      ? isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                        : "border-gray-200 dark:border-gray-600"
                      : isSelected
                      ? "border-[#006C35] bg-[#006C35]/5 dark:bg-[#006C35]/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-[#006C35]/50 dark:hover:border-[#006C35]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      showCorrectness
                        ? isCorrect
                          ? "bg-green-500 text-white"
                          : isSelected
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        : isSelected
                        ? "bg-[#006C35] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`font-medium ${
                      showCorrectness
                        ? isCorrect
                          ? "text-green-700 dark:text-green-300"
                          : isSelected
                          ? "text-red-700 dark:text-red-300"
                          : "text-gray-900 dark:text-gray-200"
                        : "text-gray-900 dark:text-gray-200"
                    }`}>{option}</span>
                    {showCorrectness && isCorrect && (
                      <svg className="w-5 h-5 text-green-500 dark:text-green-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && selectedAnswers[currentQuestion] !== null && (
            <div className={`p-4 rounded-xl mb-6 ${
              selectedAnswers[currentQuestion] === currentQ.correct
                ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"
                : "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#006C35] dark:text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-gray-900 dark:text-white">Explanation</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{currentQ.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
              className="px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={finishTest}
                  className="px-8 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
                >
                  Finish Test
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="px-8 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Question Navigator</h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setShowExplanation(false);
                  setCurrentQuestion(index);
                }}
                className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                  index === currentQuestion
                    ? "bg-[#006C35] text-white"
                    : selectedAnswers[index] !== null
                    ? selectedAnswers[index] === questions[index].correct
                      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                      : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* AI Assistant */}
      <AIAssistant
        context="test"
        isArabic={false}
        currentQuestion={{
          question: currentQ.question,
          options: currentQ.options,
          section: currentQ.section,
          category: currentQ.category,
        }}
      />
    </div>
  );
}
