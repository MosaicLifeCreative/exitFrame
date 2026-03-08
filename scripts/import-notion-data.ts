/**
 * Import data from Notion into exitFrame database.
 * Run with: npx tsx scripts/import-notion-data.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// FAMILY HISTORY DATA (from Notion "Family History" database)
// ============================================================
const familyMembers = [
  {
    name: "Cindy Kauffman",
    relation: "Mom",
    isAlive: true,
    notes: "Side: Maternal. Lifestyle: Sedentary.",
    conditions: [{ condition: "Depression" }],
  },
  {
    name: "Mike Kauffman",
    relation: "Dad",
    isAlive: true,
    notes: "Side: Paternal.",
    conditions: [
      { condition: "High Blood Pressure" },
      { condition: "Pre-Diabetic" },
    ],
  },
  {
    name: "Kathryn (Kit) Kauffman",
    relation: "Grandma (Paternal)",
    isAlive: false,
    notes: "Side: Paternal. Died ~1997. Was depressed most of her life, worked at VA hospital as social worker. Drank and smoked all day. Combination of smoking, drinking, and dementia.",
    conditions: [
      { condition: "Dementia" },
      { condition: "Depression" },
      { condition: "Cancer" },
      { condition: "Heart Disease" },
    ],
  },
  {
    name: "Giles Kauffman",
    relation: "Grandpa (Paternal)",
    isAlive: false,
    notes: "Side: Paternal. Lifelong smoker and drinker. Couldn't walk toward the end of his life.",
    conditions: [
      { condition: "Diabetes" },
      { condition: "Heart Disease" },
    ],
  },
  {
    name: "Mary Lewis",
    relation: "Grandma (Maternal)",
    isAlive: true,
    notes: "Side: Maternal.",
    conditions: [
      { condition: "Depression" },
      { condition: "Cataracts" },
      { condition: "Strokes" },
    ],
  },
  {
    name: "William Lewis",
    relation: "Grandpa (Maternal)",
    isAlive: false,
    notes: "Side: Maternal. Died of colon cancer.",
    conditions: [{ condition: "Cancer" }],
  },
  {
    name: "Jeff Kauffman",
    relation: "Uncle (Paternal)",
    isAlive: true,
    notes: "Side: Paternal. Hip and knee replacements.",
    conditions: [
      { condition: "Diabetes" },
      { condition: "Blood Clots" },
    ],
  },
  {
    name: "Karen Fitch",
    relation: "Aunt (Paternal)",
    isAlive: true,
    notes: "Side: Paternal.",
    conditions: [{ condition: "Diabetes" }],
  },
  {
    name: "Blair Lewis",
    relation: "Uncle (Maternal)",
    isAlive: true,
    notes: "Side: Maternal. Generally very happy.",
    conditions: [
      { condition: "Obesity" },
      { condition: "Diabetes" },
    ],
  },
  {
    name: "Brian Kauffman",
    relation: "Cousin (Paternal)",
    isAlive: true,
    notes: "Side: Paternal. Concerns of genetic predisposition (Jeff & Brian faced same issues).",
    conditions: [{ condition: "Blood Clots" }],
  },
  {
    name: "Laura Kauffman",
    relation: "Step Mom",
    isAlive: true,
    notes: "Not a genetic relation. Had colon polyps removed that didn't come back.",
    conditions: [],
  },
  {
    name: "Bethany Kungle",
    relation: "Sister",
    isAlive: true,
    notes: "Genetic relation.",
    conditions: [],
  },
  {
    name: "Tierney Kauffman",
    relation: "Sister",
    isAlive: true,
    notes: "Genetic relation.",
    conditions: [],
  },
  {
    name: "Alec Kauffman",
    relation: "Brother",
    isAlive: true,
    notes: "Not a genetic relation (half-brother via step mom).",
    conditions: [],
  },
];

// ============================================================
// BLOODWORK DATA (from Notion "Lab Work" database)
// ============================================================
interface LabMarker {
  name: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  category: string;
}

interface LabPanel {
  name: string;
  date: string;
  provider: string;
  markers: LabMarker[];
}

const labPanels: LabPanel[] = [
  {
    name: "Life Insurance Panel",
    date: "2024-12-19",
    provider: "Life Insurance Exam",
    markers: [
      // Lipids
      { name: "Total Cholesterol", value: 155, unit: "mg/dL", referenceLow: 140, referenceHigh: 199, category: "Lipids" },
      { name: "HDL", value: 41, unit: "mg/dL", referenceLow: 35, referenceHigh: 80, category: "Lipids" },
      { name: "LDL", value: 88, unit: "mg/dL", referenceLow: 0, referenceHigh: 129, category: "Lipids" },
      { name: "Triglycerides", value: 127, unit: "mg/dL", referenceLow: 0, referenceHigh: 150, category: "Lipids" },
      { name: "Cholesterol/HDL Ratio", value: 3.8, unit: "", referenceLow: 0, referenceHigh: 4.99, category: "Lipids" },
      { name: "LDL/HDL Ratio", value: 2.16, unit: "", referenceLow: 0.9, referenceHigh: 5.3, category: "Lipids" },
      // Glycemia
      { name: "Glucose (fasting)", value: 85, unit: "mg/dL", referenceLow: 60, referenceHigh: 109, category: "Glycemia" },
      { name: "A1c", value: 5.1, unit: "%", referenceLow: 3, referenceHigh: 6, category: "Glycemia" },
      // Liver
      { name: "Total Protein", value: 6.8, unit: "g/dL", referenceLow: 6.1, referenceHigh: 8.2, category: "Liver" },
      { name: "Albumin", value: 4.5, unit: "g/dL", referenceLow: 3.8, referenceHigh: 5.2, category: "Liver" },
      { name: "Globulin", value: 2.3, unit: "g/dL", referenceLow: 2.1, referenceHigh: 3.5, category: "Liver" },
      { name: "Total Bilirubin", value: 0.5, unit: "mg/dL", referenceLow: 0, referenceHigh: 1.2, category: "Liver" },
      { name: "Alkaline Phosphatase", value: 53, unit: "U/L", referenceLow: 0, referenceHigh: 115, category: "Liver" },
      { name: "Aspartate Aminotransferase (AST)", value: 58, unit: "U/L", referenceLow: 0, referenceHigh: 35, category: "Liver" },
      { name: "Alanine Aminotransferase (ALT)", value: 28, unit: "U/L", referenceLow: 0, referenceHigh: 45, category: "Liver" },
      { name: "GGT", value: 2.3, unit: "g/dL", referenceLow: 2.1, referenceHigh: 3.5, category: "Liver" },
      // Kidney
      { name: "BUN", value: 19, unit: "mg/dL", referenceLow: 9, referenceHigh: 25, category: "Kidney" },
      { name: "Creatinine", value: 1.1, unit: "mg/dL", referenceLow: 0.7, referenceHigh: 1.5, category: "Kidney" },
      { name: "Protein/Creatinine Ratio (urine)", value: 0.08, unit: "mg/mg", referenceLow: 0, referenceHigh: 0.2, category: "Kidney" },
      // Urinalysis
      { name: "Urine pH", value: 6.6, unit: "pH", referenceLow: 5, referenceHigh: 8, category: "Urinalysis" },
      { name: "Urine Protein", value: 3, unit: "mg/dL", referenceLow: 0, referenceHigh: 30, category: "Urinalysis" },
      { name: "Urine Creatinine", value: 36, unit: "mg/dL", referenceLow: 27, referenceHigh: 260, category: "Urinalysis" },
    ],
  },
  {
    name: "Annual Physical",
    date: "2025-07-11",
    provider: "Annual Doctor Visit",
    markers: [
      // Liver
      { name: "Total Protein", value: 7.2, unit: "g/dL", referenceLow: 6.1, referenceHigh: 7.9, category: "Liver" },
      { name: "Albumin", value: 4.4, unit: "g/dL", referenceLow: 3.5, referenceHigh: 4.8, category: "Liver" },
      { name: "Total Bilirubin", value: 0.6, unit: "mg/dL", referenceLow: 0.3, referenceHigh: 1.2, category: "Liver" },
      { name: "Bilirubin Direct", value: 0.1, unit: "mg/dL", referenceLow: 0, referenceHigh: 0.5, category: "Liver" },
      { name: "Bilirubin Indirect", value: 0.5, unit: "mg/dL", referenceLow: 0, referenceHigh: 1, category: "Liver" },
      { name: "Alkaline Phosphatase", value: 54, unit: "U/L", referenceLow: 32, referenceHigh: 91, category: "Liver" },
      { name: "Aspartate Aminotransferase (AST)", value: 26, unit: "U/L", referenceLow: 15, referenceHigh: 41, category: "Liver" },
      // Endocrine
      { name: "Vitamin D 25 Hydroxy", value: 48, unit: "ng/mL", referenceLow: 30, referenceHigh: 100, category: "Endocrine" },
      // CBC
      { name: "WBC", value: 7.9, unit: "K/mcL", referenceLow: 4.6, referenceHigh: 10.2, category: "CBC" },
      { name: "RBC", value: 4.79, unit: "M/mcL", referenceLow: 4.3, referenceHigh: 5.7, category: "CBC" },
      { name: "Hemoglobin", value: 15.1, unit: "g/dL", referenceLow: 13.5, referenceHigh: 17.5, category: "CBC" },
      { name: "Hematocrit", value: 43.7, unit: "%", referenceLow: 39, referenceHigh: 49, category: "CBC" },
      { name: "MCV", value: 91.2, unit: "fL", referenceLow: 80, referenceHigh: 97, category: "CBC" },
      { name: "MCH", value: 31.5, unit: "pg", referenceLow: 27, referenceHigh: 34, category: "CBC" },
      { name: "MCHC", value: 34.6, unit: "g/dL", referenceLow: 30.8, referenceHigh: 35.3, category: "CBC" },
      { name: "RDW", value: 12.1, unit: "%", referenceLow: 11, referenceHigh: 14.8, category: "CBC" },
      { name: "Platelets", value: 220, unit: "K/mcL", referenceLow: 142, referenceHigh: 424, category: "CBC" },
      { name: "MPV", value: 10.4, unit: "fL", referenceLow: 6.2, referenceHigh: 12.1, category: "CBC" },
      { name: "Neutrophils Relative", value: 51.4, unit: "%", referenceLow: 38.1, referenceHigh: 75.5, category: "CBC" },
      { name: "Lymphocytes Relative", value: 37.6, unit: "%", referenceLow: 17.9, referenceHigh: 49.6, category: "CBC" },
      { name: "Monocytes Relative", value: 8.4, unit: "%", referenceLow: 0, referenceHigh: 12, category: "CBC" },
      { name: "Eosinophils Relative", value: 1.9, unit: "%", referenceLow: 0, referenceHigh: 7, category: "CBC" },
      { name: "Basophils Relative", value: 0.4, unit: "%", referenceLow: 0, referenceHigh: 2, category: "CBC" },
      { name: "Immature Granulocytes Relative", value: 0.3, unit: "%", referenceLow: 0, referenceHigh: 1.2, category: "CBC" },
      { name: "Neutrophils Absolute", value: 4.04, unit: "K/mcL", referenceLow: 1.8, referenceHigh: 7.7, category: "CBC" },
      { name: "Lymphocytes Absolute", value: 2.95, unit: "K/mcL", referenceLow: 1, referenceHigh: 4.8, category: "CBC" },
      { name: "Monocytes Absolute", value: 0.66, unit: "K/mcL", referenceLow: 0, referenceHigh: 0.9, category: "CBC" },
      { name: "Eosinophils Absolute", value: 0.15, unit: "K/mcL", referenceLow: 0, referenceHigh: 0.7, category: "CBC" },
      { name: "Basophils Absolute", value: 0.03, unit: "K/mcL", referenceLow: 0, referenceHigh: 0.2, category: "CBC" },
      { name: "Immature Granulocytes Absolute", value: 0.02, unit: "K/mcL", referenceLow: 0, referenceHigh: 0.1, category: "CBC" },
    ],
  },
  {
    name: "Oura Blood Panel",
    date: "2025-11-13",
    provider: "Oura Ring Blood Panel",
    markers: [
      // Lipids
      { name: "Total Cholesterol", value: 166, unit: "mg/dL", referenceLow: 140, referenceHigh: 199, category: "Lipids" },
      { name: "HDL", value: 40, unit: "mg/dL", referenceLow: 55, referenceHigh: 65, category: "Lipids" },
      { name: "LDL", value: 107, unit: "mg/dL", referenceLow: 90, referenceHigh: 100, category: "Lipids" },
      { name: "Triglycerides", value: 94, unit: "mg/dL", referenceLow: 0, referenceHigh: 150, category: "Lipids" },
      { name: "Non-HDL Cholesterol", value: 126, unit: "mg/dL", referenceLow: 0, referenceHigh: 129, category: "Lipids" },
      { name: "Cholesterol/HDL Ratio", value: 4.2, unit: "", referenceLow: 0, referenceHigh: 4.99, category: "Lipids" },
      { name: "LDL/HDL Ratio", value: 2.7, unit: "", referenceLow: 0.9, referenceHigh: 5.3, category: "Lipids" },
      // Glycemia
      { name: "Glucose (fasting)", value: 93, unit: "mg/dL", referenceLow: 60, referenceHigh: 109, category: "Glycemia" },
      { name: "HbA1c", value: 5.1, unit: "%", referenceLow: 0, referenceHigh: 5.6, category: "Glycemia" },
      { name: "Insulin", value: 6.5, unit: "uIU/mL", referenceLow: 0, referenceHigh: 18.4, category: "Glycemia" },
      // Hepatic / Liver
      { name: "Total Protein", value: 6.5, unit: "g/dL", referenceLow: 6.1, referenceHigh: 8.1, category: "Hepatic" },
      { name: "Albumin", value: 4.4, unit: "g/dL", referenceLow: 3.6, referenceHigh: 5.1, category: "Hepatic" },
      { name: "Globulin", value: 2.1, unit: "g/dL", referenceLow: 1.9, referenceHigh: 3.7, category: "Hepatic" },
      { name: "Albumin/Globulin Ratio", value: 2.1, unit: "", referenceLow: 1, referenceHigh: 2.5, category: "Hepatic" },
      { name: "Total Bilirubin", value: 0.7, unit: "mg/dL", referenceLow: 0.2, referenceHigh: 1.2, category: "Liver" },
      { name: "Alkaline Phosphatase", value: 36, unit: "U/L", referenceLow: 36, referenceHigh: 130, category: "Liver" },
      { name: "Aspartate Aminotransferase (AST)", value: 24, unit: "U/L", referenceLow: 10, referenceHigh: 40, category: "Liver" },
      { name: "Alanine Aminotransferase (ALT)", value: 25, unit: "U/L", referenceLow: 9, referenceHigh: 46, category: "Liver" },
      // Kidney
      { name: "Blood Urea Nitrogen", value: 19, unit: "mg/dL", referenceLow: 7, referenceHigh: 25, category: "Kidney" },
      { name: "Creatinine", value: 1.3, unit: "mg/dL", referenceLow: 0.7, referenceHigh: 1.5, category: "Kidney" },
      { name: "BUN/Creatinine Ratio", value: 15, unit: "", referenceLow: 6, referenceHigh: 22, category: "Kidney" },
      { name: "Estimated Glomerular Filtration Rate (eGFR)", value: 71, unit: "mL/min/1.73^2", referenceLow: 60, referenceHigh: 250, category: "Kidney" },
      // Electrolytes
      { name: "Sodium", value: 140, unit: "mmol/L", referenceLow: 135, referenceHigh: 146, category: "Electrolytes" },
      { name: "Potassium", value: 4.8, unit: "mmol/L", referenceLow: 3.5, referenceHigh: 5.3, category: "Electrolytes" },
      { name: "Chloride", value: 105, unit: "mmol/L", referenceLow: 98, referenceHigh: 110, category: "Electrolytes" },
      { name: "Calcium", value: 9, unit: "mg/dL", referenceLow: 8.6, referenceHigh: 10.3, category: "Electrolytes" },
      { name: "Carbon Dioxide", value: 9, unit: "mg/dL", referenceLow: 8.6, referenceHigh: 10.3, category: "Electrolytes" },
      // CBC
      { name: "White Blood Cell Count", value: 6.2, unit: "K/mcL", referenceLow: 3.8, referenceHigh: 10.8, category: "CBC" },
      { name: "Red Blood Cell Count", value: 4.84, unit: "M/mcL", referenceLow: 4.2, referenceHigh: 5.8, category: "CBC" },
      { name: "Hemoglobin", value: 15.6, unit: "g/dL", referenceLow: 13.2, referenceHigh: 17.1, category: "CBC" },
      { name: "Hematocrit", value: 45.9, unit: "%", referenceLow: 38.5, referenceHigh: 50, category: "CBC" },
      { name: "Mean Corpuscular Volume (MCV)", value: 94.8, unit: "fL", referenceLow: 80, referenceHigh: 100, category: "CBC" },
      { name: "Mean Corpuscular Hemoglobin (MCH)", value: 32.2, unit: "pg", referenceLow: 27, referenceHigh: 33, category: "CBC" },
      { name: "Mean Corpuscular Hemoglobin Concentration (MCHC)", value: 34, unit: "g/dL", referenceLow: 32, referenceHigh: 36, category: "CBC" },
      { name: "Red Cell Distribution Width (RDW)", value: 12, unit: "%", referenceLow: 11, referenceHigh: 15, category: "CBC" },
      { name: "Platelet Count", value: 220, unit: "K/mcL", referenceLow: 140, referenceHigh: 400, category: "CBC" },
      { name: "Mean Platelet Volume (MPV)", value: 10.4, unit: "fL", referenceLow: 7.5, referenceHigh: 12.5, category: "CBC" },
      { name: "Neutrophils Relative", value: 43.5, unit: "%", referenceLow: 38, referenceHigh: 80, category: "CBC" },
      { name: "Lymphocytes", value: 43.7, unit: "%", referenceLow: 15, referenceHigh: 49, category: "CBC" },
      { name: "Monocytes", value: 9.5, unit: "%", referenceLow: 0, referenceHigh: 13, category: "CBC" },
      { name: "Eosinophils", value: 2.7, unit: "%", referenceLow: 0, referenceHigh: 8, category: "CBC" },
      { name: "Basophils", value: 0.6, unit: "%", referenceLow: 0, referenceHigh: 2, category: "CBC" },
      { name: "Absolute Neutrophils", value: 2697, unit: "cells/mcL", referenceLow: 100, referenceHigh: 7800, category: "CBC" },
      { name: "Absolute Lymphocytes", value: 2709, unit: "cells/mcL", referenceLow: 850, referenceHigh: 3900, category: "CBC" },
      { name: "Absolute Monocytes", value: 589, unit: "cells/mcL", referenceLow: 200, referenceHigh: 950, category: "CBC" },
      { name: "Absolute Eosinophils", value: 167, unit: "cells/mcL", referenceLow: 15, referenceHigh: 500, category: "CBC" },
      { name: "Absolute Basophils", value: 37, unit: "cells/mcL", referenceLow: 0, referenceHigh: 200, category: "CBC" },
      // Inflammation
      { name: "hSCRP", value: 0.5, unit: "mg/L", referenceLow: 0, referenceHigh: 3, category: "Inflammation" },
    ],
  },
];

// ============================================================
// WORKOUT DATA (from Notion "Lifting" database)
// ============================================================
interface LiftingEntry {
  workout: string; // date string used as session key
  exerciseName: string;
  weight: number | null;
  sets: number | null;
  reps: number | null;
  notes: string;
}

const liftingEntries: LiftingEntry[] = [
  // 2025-11-08
  { workout: "2025-11-08", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-08", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-08", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "Really need to get 50lb weights." },
  { workout: "2025-11-08", exerciseName: "Shoulder Press", weight: 20, sets: 3, reps: 12, notes: "Felt good, but light. Can bump up to 25 in the next few sessions." },
  { workout: "2025-11-08", exerciseName: "Planks", weight: 0, sets: 3, reps: 45, notes: "Seconds per set" },
  // 2025-11-15
  { workout: "2025-11-15", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-15", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-15", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-15", exerciseName: "Face Pulls", weight: 25, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-15", exerciseName: "Flutter Kicks", weight: 0, sets: 3, reps: 30, notes: "Two sets of flutter kicks, one leg raise." },
  // 2025-11-17
  { workout: "2025-11-17", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-17", exerciseName: "Leg Press", weight: 220, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-17", exerciseName: "Cable Bicep Curl", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-17", exerciseName: "Overhead Cable Tricep Extension", weight: 45, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-17", exerciseName: "HS Seated Row", weight: 120, sets: 1, reps: 12, notes: "Was feeling nauseous and it was hurting my elbow." },
  // 2025-11-19
  { workout: "2025-11-19", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-19", exerciseName: "Overhead Cable Tricep Extension", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-19", exerciseName: "Cable Bicep Curl", weight: 32.5, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-19", exerciseName: "Bent Over DB Row", weight: 20, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-19", exerciseName: "HS Bench", weight: 70, sets: 3, reps: 9, notes: "Too much weight" },
  { workout: "2025-11-19", exerciseName: "Leg Raises", weight: 0, sets: 3, reps: 30, notes: "" },
  { workout: "2025-11-19", exerciseName: "Bodyweight Squats", weight: 0, sets: 3, reps: 20, notes: "" },
  // 2025-11-22
  { workout: "2025-11-22", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-22", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-22", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-11-22", exerciseName: "Chest-Supported Row", weight: 30, sets: 3, reps: 12, notes: "Felt pretty good, focused on not impacting my elbow. Could probably bump back up to 40." },
  { workout: "2025-11-22", exerciseName: "Lateral Raises", weight: 10, sets: 3, reps: 12, notes: "Single arm. Felt good, could probably bump to 15 soon." },
  { workout: "2025-11-22", exerciseName: "Planks", weight: 0, sets: 3, reps: 45, notes: "Seconds per set" },
  { workout: "2025-11-22", exerciseName: "Bodyweight Squats", weight: 0, sets: 3, reps: 20, notes: "" },
  // 2025-12-04
  { workout: "2025-12-04", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-04", exerciseName: "Cable Bicep Curl", weight: 32.5, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-04", exerciseName: "Overhead Cable Tricep Extension", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-04", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-04", exerciseName: "Leg Press", weight: 190, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-04", exerciseName: "Goblet Squats", weight: 30, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-04", exerciseName: "Plank Bosu", weight: 0, sets: 3, reps: 60, notes: "Seconds per set" },
  // 2025-12-09
  { workout: "2025-12-09", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-09", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-09", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-09", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-09", exerciseName: "Planks", weight: 0, sets: 3, reps: 45, notes: "Seconds per set" },
  { workout: "2025-12-09", exerciseName: "Bodyweight Squats", weight: 0, sets: 3, reps: 30, notes: "" },
  // 2025-12-13
  { workout: "2025-12-13", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "Calories includes warm-up walk on treadmill" },
  { workout: "2025-12-13", exerciseName: "Cable Bicep Curl", weight: 32.5, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-13", exerciseName: "Overhead Cable Tricep Extension", weight: 47.5, sets: 3, reps: 12, notes: "First set was at 40lbs" },
  { workout: "2025-12-13", exerciseName: "Face Pulls", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-13", exerciseName: "Leg Press", weight: 190, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-13", exerciseName: "Leg Extensions", weight: 50, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-13", exerciseName: "Plank Bosu", weight: 0, sets: 3, reps: 60, notes: "Seconds per set" },
  // 2025-12-16
  { workout: "2025-12-16", exerciseName: "Bench Press", weight: 145, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-16", exerciseName: "Cable Bicep Curl", weight: 32.5, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-16", exerciseName: "Overhead Cable Tricep Extension", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-16", exerciseName: "Face Pulls", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-16", exerciseName: "Pulldown", weight: 110, sets: 3, reps: 12, notes: "Started at 120, then 110, then 105 (did 8)" },
  { workout: "2025-12-16", exerciseName: "Glute Bridges", weight: 0, sets: 3, reps: 60, notes: "Seconds" },
  { workout: "2025-12-16", exerciseName: "Plank Bosu", weight: 0, sets: 3, reps: 60, notes: "Seconds per set" },
  // 2025-12-20
  { workout: "2025-12-20", exerciseName: "Bench Press", weight: 155, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-20", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-20", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-20", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2025-12-20", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "Seconds per set" },
  { workout: "2025-12-20", exerciseName: "Bodyweight Squats", weight: 0, sets: 4, reps: 25, notes: "" },
  // 2026-01-01
  { workout: "2026-01-01", exerciseName: "Bench Press", weight: 155, sets: 3, reps: 11, notes: "Moved fast, shared bench. 12, 12, 8" },
  { workout: "2026-01-01", exerciseName: "DB Bicep Curl", weight: 20, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-01", exerciseName: "Skull Crushers", weight: 45, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-01", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-01", exerciseName: "Cable Seated Row", weight: 90, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-01", exerciseName: "Plank Bosu", weight: 0, sets: 3, reps: 60, notes: "Seconds per set" },
  // 2026-01-04
  { workout: "2026-01-04", exerciseName: "Bench Press", weight: 155, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-04", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-04", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-04", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-04", exerciseName: "Landmine Row", weight: 18.3, sets: 3, reps: 12, notes: "Two sets of 15, one set of 25. Still super easy." },
  { workout: "2026-01-04", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "Seconds per set" },
  { workout: "2026-01-04", exerciseName: "Bodyweight Squats", weight: 0, sets: 2, reps: 50, notes: "" },
  // 2026-01-07
  { workout: "2026-01-07", exerciseName: "Bench Press", weight: 155, sets: 3, reps: 12, notes: "Tough today, but got all reps." },
  { workout: "2026-01-07", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-07", exerciseName: "Skull Crushers", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-07", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-07", exerciseName: "Landmine Row", weight: 30, sets: 3, reps: 12, notes: "Still too easy." },
  { workout: "2026-01-07", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "Seconds per set" },
  { workout: "2026-01-07", exerciseName: "Bodyweight Squats", weight: 0, sets: 1, reps: 101, notes: "" },
  // 2026-01-09
  { workout: "2026-01-09", exerciseName: "Bench Press", weight: 155, sets: 3, reps: 12, notes: "Felt heavy again, but did all reps/sets." },
  { workout: "2026-01-09", exerciseName: "Preacher Curl", weight: 52, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-09", exerciseName: "Overhead Tricep Extensions", weight: 40, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-09", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "Starting to feel light, but cautious about going up to 20. Maybe 3 sets of 8 at 20lbs next time." },
  { workout: "2026-01-09", exerciseName: "Landmine Row", weight: 35, sets: 3, reps: 12, notes: "Still fairly light, but being cautious because this is how I hurt my back 2 years ago." },
  { workout: "2026-01-09", exerciseName: "Trap Bar Deadlift", weight: 50, sets: 3, reps: 12, notes: "Felt pretty good, can definitely do more weight next time." },
  // 2026-01-17
  { workout: "2026-01-17", exerciseName: "Bench Press", weight: 155, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-17", exerciseName: "Preacher Curl", weight: 62, sets: 3, reps: 12, notes: "12, 12, 7, 5" },
  { workout: "2026-01-17", exerciseName: "Overhead Tricep Extensions", weight: 45, sets: 3, reps: 20, notes: "" },
  { workout: "2026-01-17", exerciseName: "Lateral Raises", weight: 15, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-17", exerciseName: "Landmine Row", weight: 45, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-17", exerciseName: "Trap Bar Deadlift", weight: 90, sets: 3, reps: 12, notes: "" },
  { workout: "2026-01-17", exerciseName: "Planks", weight: 0, sets: 3, reps: 75, notes: "75, 75, 90" },
];

// ============================================================
// IMPORT FUNCTIONS
// ============================================================

async function importFamilyHistory() {
  console.log("\n=== IMPORTING FAMILY HISTORY ===");
  let imported = 0;
  let skipped = 0;

  for (const m of familyMembers) {
    // Check if already exists
    const existing = await prisma.familyMember.findFirst({
      where: { name: m.name },
    });
    if (existing) {
      console.log(`  Skipped (exists): ${m.name}`);
      skipped++;
      continue;
    }

    await prisma.familyMember.create({
      data: {
        relation: m.relation,
        name: m.name,
        isAlive: m.isAlive,
        notes: m.notes,
        conditions: m.conditions.length > 0
          ? { create: m.conditions.map((c) => ({ condition: c.condition })) }
          : undefined,
      },
    });
    console.log(`  Imported: ${m.name} (${m.relation}) - ${m.conditions.length} conditions`);
    imported++;
  }

  console.log(`Family History: ${imported} imported, ${skipped} skipped`);
}

async function importBloodwork() {
  console.log("\n=== IMPORTING BLOODWORK ===");
  let panelsImported = 0;
  let markersImported = 0;

  for (const panel of labPanels) {
    // Check if panel already exists by name + date
    const existing = await prisma.bloodworkPanel.findFirst({
      where: {
        name: panel.name,
        date: new Date(panel.date),
      },
    });
    if (existing) {
      console.log(`  Skipped panel (exists): ${panel.name} (${panel.date})`);
      continue;
    }

    const markers = panel.markers.map((m) => {
      const refLow = m.referenceLow !== null ? new Prisma.Decimal(m.referenceLow) : null;
      const refHigh = m.referenceHigh !== null ? new Prisma.Decimal(m.referenceHigh) : null;
      const value = new Prisma.Decimal(m.value);

      // Auto-flag
      let isFlagged = false;
      let flagDirection: string | null = null;
      if (refLow !== null && value.lessThan(refLow)) {
        isFlagged = true;
        flagDirection = "low";
      } else if (refHigh !== null && value.greaterThan(refHigh)) {
        isFlagged = true;
        flagDirection = "high";
      }

      return {
        name: m.name,
        value,
        unit: m.unit || "ratio",
        referenceLow: refLow,
        referenceHigh: refHigh,
        isFlagged,
        flagDirection,
        category: m.category,
      };
    });

    await prisma.bloodworkPanel.create({
      data: {
        name: panel.name,
        date: new Date(panel.date),
        provider: panel.provider,
        importedFrom: "notion",
        importedAt: new Date(),
        markers: { create: markers },
      },
    });

    const flagged = markers.filter((m) => m.isFlagged).length;
    console.log(`  Imported panel: ${panel.name} (${panel.date}) - ${markers.length} markers, ${flagged} flagged`);
    panelsImported++;
    markersImported += markers.length;
  }

  console.log(`Bloodwork: ${panelsImported} panels, ${markersImported} markers imported`);
}

async function importWorkouts() {
  console.log("\n=== IMPORTING WORKOUTS ===");
  let sessionsImported = 0;
  let entriesImported = 0;
  let exercisesNotFound: string[] = [];

  // Group lifting entries by workout date
  const sessionMap = new Map<string, LiftingEntry[]>();
  for (const entry of liftingEntries) {
    if (!entry.sets || !entry.reps) continue; // Skip null entries
    const existing = sessionMap.get(entry.workout) || [];
    existing.push(entry);
    sessionMap.set(entry.workout, existing);
  }

  for (const [date, entries] of sessionMap) {
    // Check if session already exists for this date
    const startOfDay = new Date(date + "T00:00:00Z");
    const endOfDay = new Date(date + "T23:59:59Z");
    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        performedAt: { gte: startOfDay, lte: endOfDay },
        source: "import",
      },
    });
    if (existingSession) {
      console.log(`  Skipped session (exists): ${date}`);
      continue;
    }

    // Look up exercises
    const exerciseEntries: Array<{
      exerciseId: string;
      sortOrder: number;
      notes?: string;
      sets: Array<{ setNumber: number; weight?: number; reps: number }>;
    }> = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const exercise = await prisma.exercise.findFirst({
        where: { name: { equals: entry.exerciseName, mode: "insensitive" } },
      });

      if (!exercise) {
        if (!exercisesNotFound.includes(entry.exerciseName)) {
          exercisesNotFound.push(entry.exerciseName);
        }
        continue;
      }

      const sets = [];
      for (let s = 1; s <= entry.sets!; s++) {
        sets.push({
          setNumber: s,
          weight: entry.weight && entry.weight > 0 ? entry.weight : undefined,
          reps: entry.reps!,
        });
      }

      exerciseEntries.push({
        exerciseId: exercise.id,
        sortOrder: i,
        notes: entry.notes || undefined,
        sets,
      });
    }

    if (exerciseEntries.length === 0) {
      console.log(`  Skipped session (no matching exercises): ${date}`);
      continue;
    }

    await prisma.workoutSession.create({
      data: {
        name: `Full Body - ${date}`,
        performedAt: new Date(date + "T12:00:00Z"),
        source: "import",
        notes: `Imported from Notion`,
        exercises: {
          create: exerciseEntries.map((ex) => ({
            exerciseId: ex.exerciseId,
            sortOrder: ex.sortOrder,
            notes: ex.notes,
            sets: {
              create: ex.sets.map((s) => ({
                setNumber: s.setNumber,
                weight: s.weight,
                reps: s.reps,
              })),
            },
          })),
        },
      },
    });

    console.log(`  Imported session: ${date} - ${exerciseEntries.length} exercises`);
    sessionsImported++;
    entriesImported += exerciseEntries.length;
  }

  if (exercisesNotFound.length > 0) {
    console.log(`\n  Exercises not found in DB (skipped): ${exercisesNotFound.join(", ")}`);
  }
  console.log(`Workouts: ${sessionsImported} sessions, ${entriesImported} exercise entries imported`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("Starting Notion data import...");

  await importFamilyHistory();
  await importBloodwork();
  await importWorkouts();

  console.log("\nImport complete!");
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
