import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { extractText, getDocumentProxy } from 'unpdf';
import { INITIAL_PATIENTS } from './src/data/clinicalData.ts';
import {
  AcuityLevel,
  ActivityEvent,
  AssessmentReviewStatus,
  BodySystemId,
  ClinicalOrder,
  DatasetAnalysisRecord,
  DocumentCategory,
  GeneratedReportRecord,
  ImagingModalityId,
  MedicalDocumentRecord,
  PatientRecord,
  PriorityLevel,
  UnifiedAssessment,
  UploadedImageRecord,
} from './src/types/clinical.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'clinsight-db.json');

interface PersistedDatabase {
  patients: PatientRecord[];
  documents: MedicalDocumentRecord[];
  uploadedImages: UploadedImageRecord[];
  datasets: DatasetAnalysisRecord[];
  assessments: UnifiedAssessment[];
  reports: GeneratedReportRecord[];
  nextPatientSeq: number;
}

const MODALITY_COMPATIBLE_MODELS: Record<ImagingModalityId, readonly string[]> = {
  xray: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
  ultrasound: ['gemini-4-hydrogen'],
  ct: ['gemini-4-hydrogen'],
  mri: ['gemini-4-hydrogen'],
  other: ['gemini-4-hydrogen'],
};

const DISEASE_COMPATIBLE_MODELS: readonly string[] = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
];

const MODALITY_SYSTEM_DIRECTIVES: Record<ImagingModalityId, string> = {
  xray: 'You are an attending board-certified diagnostic radiologist specializing in projection radiography (Chest X-Ray, Abdominal X-Ray, and Musculoskeletal Radiographs). Evaluate cortical margins, trabecular bone integrity, joint spaces, lung fields, costophrenic angles, cardiomediastinal silhouette, and support lines.',
  ultrasound:
    'You are an attending physician specializing in point-of-care and diagnostic ultrasonography (POCUS, abdominal, hepatobiliary, vascular, and transthoracic echocardiography). Evaluate echogenicity, acoustic shadowing or posterior enhancement, anechoic fluid collections, wall thickening, organ parenchymal texture, and Doppler/structural impressions.',
  ct: 'You are an attending cross-sectional radiologist specializing in Computed Tomography (CT). Evaluate tissue attenuation densities, lobar consolidation, pleural/pericardial effusions, vascular caliber and filling defects, parenchymal hemorrhage or masses, and bone windows.',
  mri: 'You are an attending radiologist specializing in Magnetic Resonance Imaging (MRI). Evaluate T1/T2/FLAIR/DWI signal intensities, sulcal effacement, ventricular symmetry, midline shift, white-matter or cortical hyperintensities, and soft-tissue/articular planes.',
  other:
    'You are an attending clinical diagnostic specialist evaluating specialized medical imaging captures (angiography, endoscopy, DEXA, or clinical captures). Provide conservative, evidence-grounded anatomical observations and clear technical limitations.',
};

const BODY_SYSTEM_LABELS: Record<BodySystemId, string> = {
  respiratory: 'Respiratory & Thoracic System',
  cardiovascular: 'Cardiovascular & Vascular System',
  neurological: 'Neurological & Cerebrovascular System',
  musculoskeletal: 'Musculoskeletal & Orthopedic System',
  abdominal: 'Abdominal & Hepatobiliary System',
};

function ensureStorageDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function seedInitialDatabase(): PersistedDatabase {
  const seededPatients: PatientRecord[] = INITIAL_PATIENTS.map((pt, idx) => ({
    ...pt,
    patientCode: `CS-2026-${String(1001 + idx)}`,
    registeredAt: pt.admittedAt,
    medicalHistory: pt.chiefComplaint,
    existingConditions: pt.differentials.slice(0, 1).map((d) => d.condition),
    reviewStatus:
      pt.acuity === AcuityLevel.Critical
        ? 'Awaiting Review'
        : pt.acuity === AcuityLevel.Guarded
        ? 'In Review'
        : 'Reviewed',
    activityLog: [
      {
        id: `act-${pt.id}-init`,
        timestamp: pt.admittedAt,
        category: 'Registration',
        title: 'Synthetic Cohort Baseline Registered',
        detail: `Assigned to ${pt.bed} (${pt.unit}) · Attending ${pt.attending}`,
        actor: pt.attending,
      },
    ],
  }));

  const seededAssessments: UnifiedAssessment[] = seededPatients.slice(0, 4).map((pt) => {
    const topDiff = pt.differentials[0];
    const priority: PriorityLevel =
      pt.acuity === AcuityLevel.Critical
        ? 'High'
        : pt.acuity === AcuityLevel.Guarded
        ? 'Medium'
        : 'Low';
    return {
      id: `asm-seed-${pt.id}`,
      patientId: pt.id,
      analysisType: 'Multi-System AI',
      modalityOrCategory: pt.imaging[0]?.modality ?? 'Clinical Workup',
      potentialFindings: topDiff ? `${topDiff.condition} (${topDiff.icd10})` : pt.chiefComplaint,
      confidence: topDiff?.confidence ?? 85.0,
      priority,
      analyzedAt: pt.admittedAt,
      reviewStatus: pt.reviewStatus ?? 'Awaiting Review',
      clinicianNotes: pt.notes[0]?.text ?? '',
      provenance: 'simulated_demo',
      modelUsed: 'Simulated Baseline',
    };
  });

  return {
    patients: seededPatients,
    documents: [],
    uploadedImages: [],
    datasets: [],
    assessments: seededAssessments,
    reports: [],
    nextPatientSeq: 1007,
  };
}

function loadDatabase(): PersistedDatabase {
  ensureStorageDirs();
  if (!fs.existsSync(DB_FILE)) {
    const initial = seedInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedDatabase;
    return {
      patients: parsed.patients ?? [],
      documents: parsed.documents ?? [],
      uploadedImages: parsed.uploadedImages ?? [],
      datasets: parsed.datasets ?? [],
      assessments: parsed.assessments ?? [],
      reports: parsed.reports ?? [],
      nextPatientSeq: parsed.nextPatientSeq ?? 1007,
    };
  } catch {
    const fallback = seedInitialDatabase();
    saveDatabase(fallback);
    return fallback;
  }
}

function saveDatabase(db: PersistedDatabase) {
  ensureStorageDirs();
  const tmpPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE);
}

function appendPatientActivity(
  db: PersistedDatabase,
  patientId: string,
  event: Omit<ActivityEvent, 'id' | 'timestamp'>
) {
  const pt = db.patients.find((p) => p.id === patientId);
  if (!pt) return;
  const entry: ActivityEvent = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  pt.activityLog = [entry, ...(pt.activityLog ?? [])];
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add a valid API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveLocalAssetBase64(assetPath: string): { base64: string; mimeType: string } {
  const sanitized = assetPath.replace(/^\/+/, '');
  if (!sanitized.startsWith('src/assets/images/') || sanitized.includes('..')) {
    throw new Error('Invalid local diagnostic image path.');
  }

  const candidatePaths = [
    path.resolve(__dirname, sanitized),
    path.resolve(__dirname, 'dist', sanitized),
  ];

  const existingPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!existingPath) {
    throw new Error(`Diagnostic image asset not found on server: ${sanitized}`);
  }

  const buffer = fs.readFileSync(existingPath);
  const ext = path.extname(existingPath).toLowerCase();
  const mimeType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { base64: buffer.toString('base64'), mimeType };
}

function mapUrgencyToPriority(urgency?: string): PriorityLevel {
  if (urgency === 'Critical') return 'High';
  if (urgency === 'Urgent') return 'Medium';
  return 'Low';
}

async function runPdfIntelligence(params: {
  base64Pdf: string;
  rawTextByPage: { page: number; text: string }[];
  category: DocumentCategory;
}) {
  const ai = getGeminiClient();
  const combinedRawText = params.rawTextByPage
    .map((p) => `--- PAGE ${p.page} ---\n${p.text}`)
    .join('\n\n')
    .slice(0, 24000);

  const prompt = [
    `Analyze this uploaded medical PDF document (Category: ${params.category}).`,
    combinedRawText.trim().length > 40
      ? `Extracted text by page:\n${combinedRawText}`
      : 'Embedded text is sparse or absent (likely a scanned PDF). Perform visual OCR across every page of the attached PDF.',
    'STRICT SAFETY RULES:',
    '1. Separate verbatim extracted facts from AI-generated clinical summaries.',
    '2. NEVER invent missing clinical values, units, dates, or reference ranges. If a reference range or value is missing or unreadable, explicitly list it in missingOrUnreadableInfo and set outsideReference to false unless the source document explicitly provides a reference range showing it is outside.',
    '3. Cite source page numbers (e.g., "Page 1") wherever possible.',
  ].join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: params.base64Pdf,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      systemInstruction:
        'You are a clinical medical document intelligence system. Extract structured laboratory and clinical facts strictly verbatim from the provided PDF without fabricating missing values or reference ranges.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          extractedFacts: {
            type: Type.OBJECT,
            properties: {
              patientDetailsInDoc: { type: Type.STRING },
              examinationDate: { type: Type.STRING },
              extractedLabs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    testName: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    flag: { type: Type.STRING },
                    outsideReference: { type: Type.BOOLEAN },
                    pageNumber: { type: Type.INTEGER },
                  },
                },
              },
              clinicalObservations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              relevantMedicalHistory: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              medicationsMentioned: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
          aiSummary: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              importantObservations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              abnormalHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              extractedMedicalInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              missingOrUnreadableInfo: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              pageReferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'clinsight-diagnostic-api' });
  });

  // ------------------------------------------------------------------
  // FULL PERSISTENT STATE SYNC
  // ------------------------------------------------------------------
  app.get('/api/state', (_req, res) => {
    const db = loadDatabase();
    res.json(db);
  });

  // ------------------------------------------------------------------
  // PATIENT MANAGEMENT ENDPOINTS
  // ------------------------------------------------------------------
  app.post('/api/patients', (req, res) => {
    try {
      const db = loadDatabase();
      const {
        name,
        age,
        dob,
        gender,
        contact,
        medicalHistory,
        allergies,
        existingConditions,
        weightKg,
        egfr,
        unit,
        bed,
        acuity,
        chiefComplaint,
      } = req.body as {
        name: string;
        age?: number;
        dob?: string;
        gender?: 'F' | 'M' | 'Other';
        contact?: string;
        medicalHistory?: string;
        allergies?: string[];
        existingConditions?: string[];
        weightKg?: number;
        egfr?: number;
        unit?: PatientRecord['unit'];
        bed?: string;
        acuity?: AcuityLevel;
        chiefComplaint?: string;
      };

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Patient full name is required.' });
        return;
      }

      const seq = db.nextPatientSeq++;
      const patientCode = `CS-2026-${seq}`;
      const id = `pt-${Date.now()}-${seq}`;
      const mrn = `MRN-${Math.floor(100000 + Math.random() * 899999)}`;
      const nowIso = new Date().toISOString();
      const nowTime = nowIso.slice(11, 16);

      const computedAge =
        age && Number(age) > 0
          ? Number(age)
          : dob
          ? Math.max(0, new Date().getFullYear() - new Date(dob).getFullYear())
          : 45;

      const resolvedAcuity = acuity ?? AcuityLevel.Guarded;
      const initialVital = {
        time: nowTime,
        hr: resolvedAcuity === AcuityLevel.Critical ? 112 : 82,
        sbp: resolvedAcuity === AcuityLevel.Critical ? 92 : 122,
        dbp: resolvedAcuity === AcuityLevel.Critical ? 58 : 76,
        spo2: resolvedAcuity === AcuityLevel.Critical ? 92 : 98,
        temp: 37.0,
        rr: resolvedAcuity === AcuityLevel.Critical ? 24 : 17,
        lactate: resolvedAcuity === AcuityLevel.Critical ? 2.8 : 1.1,
      };

      const resolvedUnit = unit ?? 'Outpatient / General';
      const resolvedBed = bed?.trim() || `${resolvedUnit.split(' ')[0]}-${seq % 100}`;

      const newPatient: PatientRecord = {
        id,
        patientCode,
        mrn,
        name: name.trim(),
        age: computedAge,
        dob: dob || undefined,
        sex: gender ?? 'F',
        contact: contact?.trim() || undefined,
        weightKg: Number(weightKg) > 0 ? Number(weightKg) : 70,
        heightCm: 170,
        egfr: Number(egfr) > 0 ? Number(egfr) : 85,
        unit: resolvedUnit,
        bed: resolvedBed,
        attending: 'Dr. Aris Thorne, MD, FCCM',
        admittedAt: nowIso.slice(0, 10),
        registeredAt: nowIso,
        chiefComplaint:
          chiefComplaint?.trim() ||
          existingConditions?.join(', ') ||
          medicalHistory?.trim() ||
          'Initial diagnostic evaluation',
        medicalHistory: medicalHistory?.trim() || 'No prior surgical or inpatient history recorded.',
        existingConditions:
          existingConditions && existingConditions.length > 0
            ? existingConditions
            : ['Pending Baseline Assessment'],
        allergies: allergies && allergies.length > 0 ? allergies : ['No Known Drug Allergies'],
        acuity: resolvedAcuity,
        reviewStatus: 'Awaiting Analysis',
        vitals: {
          '1H': [initialVital],
          '6H': [initialVital],
          '24H': [initialVital],
          '72H': [initialVital],
        },
        labs: [],
        imaging: [],
        differentials: [],
        alerts: [],
        orders: [],
        notes: [],
        risks: [
          {
            label: 'Baseline Clinical Priority',
            horizon: 'Intake',
            probability: resolvedAcuity === AcuityLevel.Critical ? 68 : 25,
            driver: 'Intake registration profile',
          },
        ],
        activityLog: [
          {
            id: `act-${Date.now()}`,
            timestamp: nowIso,
            category: 'Registration',
            title: `Patient Registered (${patientCode})`,
            detail: `Registered to ${resolvedUnit} · Allergies: ${(allergies && allergies.length > 0
              ? allergies
              : ['NKDA']
            ).join(', ')}`,
            actor: 'Dr. Aris Thorne, MD, FCCM',
          },
        ],
      };

      db.patients = [newPatient, ...db.patients];
      saveDatabase(db);
      res.status(201).json(newPatient);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to register patient.',
      });
    }
  });

  app.patch('/api/patients/:id', (req, res) => {
    try {
      const db = loadDatabase();
      const idx = db.patients.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Patient record not found.' });
        return;
      }
      const existing = db.patients[idx];
      const patch = req.body as Partial<PatientRecord>;
      const updated: PatientRecord = {
        ...existing,
        ...patch,
        id: existing.id,
        patientCode: existing.patientCode,
      };
      db.patients[idx] = updated;
      saveDatabase(db);
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to update patient.',
      });
    }
  });

  // ------------------------------------------------------------------
  // CLINICAL ORDER ENTRY (INTEGRATED WITH PATIENT PROFILES & ATTACHMENTS)
  // ------------------------------------------------------------------
  app.post('/api/orders', (req, res) => {
    try {
      const db = loadDatabase();
      const {
        patientId,
        type,
        name,
        doseOrSpec,
        routeOrPriority,
        frequency,
        orderedBy,
        attachedDocumentIds,
        attachedImageIds,
      } = req.body as Omit<ClinicalOrder, 'id' | 'orderedAt' | 'status'> & {
        patientId: string;
      };

      const pt = db.patients.find((p) => p.id === patientId);
      if (!pt) {
        res.status(404).json({ error: 'Target patient not found.' });
        return;
      }

      const now = new Date();
      const orderedAt = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const order: ClinicalOrder = {
        id: `ord-${Date.now()}`,
        patientId,
        type,
        name,
        doseOrSpec,
        routeOrPriority,
        frequency,
        orderedBy: orderedBy || 'Dr. Aris Thorne, MD, FCCM',
        orderedAt,
        status: 'Active',
        attachedDocumentIds: attachedDocumentIds ?? [],
        attachedImageIds: attachedImageIds ?? [],
      };

      pt.orders = [order, ...pt.orders];
      appendPatientActivity(db, patientId, {
        category: 'Order',
        title: `Clinical Order Placed: ${order.name}`,
        detail: `${order.type} · ${order.doseOrSpec} · ${order.routeOrPriority} (${order.frequency})`,
        actor: order.orderedBy,
      });

      saveDatabase(db);
      res.status(201).json({ order, patient: pt });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to create clinical order.',
      });
    }
  });

  // ------------------------------------------------------------------
  // SERVE STORED UPLOADED FILES (PDF & MEDICAL IMAGES)
  // ------------------------------------------------------------------
  app.get('/api/files/:fileName', (req, res) => {
    const safeName = path.basename(req.params.fileName);
    const fullPath = path.resolve(UPLOADS_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Stored file not found.' });
      return;
    }
    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
        ? 'image/webp'
        : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    }
    fs.createReadStream(fullPath).pipe(res);
  });

  // ------------------------------------------------------------------
  // PDF MEDICAL DOCUMENT UPLOAD + TEXT EXTRACTION + OCR INTELLIGENCE
  // ------------------------------------------------------------------
  app.post('/api/documents/upload', async (req, res) => {
    try {
      const db = loadDatabase();
      const { patientId, category, fileName, fileSizeBytes, mimeType, base64Data } = req.body as {
        patientId: string;
        category: DocumentCategory;
        fileName: string;
        fileSizeBytes: number;
        mimeType: string;
        base64Data: string;
      };

      const pt = db.patients.find((p) => p.id === patientId);
      if (!pt) {
        res.status(404).json({ error: 'Associated patient not found.' });
        return;
      }

      if (!base64Data || (mimeType !== 'application/pdf' && !fileName.toLowerCase().endsWith('.pdf'))) {
        res.status(400).json({ error: 'Only valid PDF documents (.pdf) are supported.' });
        return;
      }

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');

      const docId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const storedFileName = `${docId}.pdf`;
      fs.writeFileSync(path.resolve(UPLOADS_DIR, storedFileName), pdfBuffer);

      // 1. Actual local PDF text extraction via unpdf
      let rawTextByPage: { page: number; text: string }[] = [];
      let pageCount = 1;
      try {
        const pdfProxy = await getDocumentProxy(new Uint8Array(pdfBuffer));
        const extracted = await extractText(pdfProxy, { mergePages: false });
        pageCount = extracted.totalPages || 1;
        const pageStrings = Array.isArray(extracted.text)
          ? extracted.text
          : [String(extracted.text ?? '')];
        rawTextByPage = pageStrings.map((t, i) => ({
          page: i + 1,
          text: String(t ?? '').trim(),
        }));
      } catch (parseErr) {
        rawTextByPage = [
          {
            page: 1,
            text: '',
          },
        ];
        console.warn('unpdf text extraction note:', parseErr);
      }

      const totalChars = rawTextByPage.reduce((acc, p) => acc + p.text.length, 0);
      const isScannedPdf = totalChars < 40;

      // 2. AI Document Intelligence (and Scanned OCR when needed) via Gemini
      let extractedFacts = null;
      let aiSummary = null;
      let extractionError: string | undefined = undefined;
      let provenance: MedicalDocumentRecord['provenance'] = 'raw_extraction_only';
      let modelUsed: string | undefined = undefined;

      try {
        const aiResult = await runPdfIntelligence({
          base64Pdf: cleanBase64,
          rawTextByPage,
          category,
        });
        extractedFacts = aiResult.extractedFacts ?? null;
        aiSummary = aiResult.aiSummary ?? null;
        provenance = 'functional_ai';
        modelUsed = 'gemini-4-hydrogen';
      } catch (aiErr: unknown) {
        extractionError =
          aiErr instanceof Error
            ? aiErr.message
            : 'PDF AI intelligence failed; raw extracted text preserved.';
      }

      const docRecord: MedicalDocumentRecord = {
        id: docId,
        patientId,
        patientName: pt.name,
        category,
        fileName,
        fileSizeBytes: fileSizeBytes || pdfBuffer.length,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        fileUrl: `/api/files/${storedFileName}`,
        extractionMethod: isScannedPdf ? 'scanned_ocr_gemini' : 'digital_pdf',
        pageCount,
        rawTextByPage,
        extractedFacts,
        aiSummary,
        provenance,
        modelUsed,
        extractionVerified: false,
        extractionError,
      };

      db.documents = [docRecord, ...db.documents];

      // Create Unified Assessment item if AI summary/facts were extracted
      const hasAbnormal =
        (extractedFacts?.extractedLabs?.some((l: { outsideReference?: boolean }) => l.outsideReference) ??
          false) ||
        (aiSummary?.abnormalHighlights?.length ?? 0) > 0;

      const assessment: UnifiedAssessment = {
        id: `asm-${Date.now()}`,
        patientId,
        analysisType: 'PDF Document',
        modalityOrCategory: category,
        potentialFindings:
          aiSummary?.summary ||
          `Uploaded ${category}: ${fileName} (${pageCount} page${pageCount > 1 ? 's' : ''})`,
        confidence: provenance === 'functional_ai' ? 90.0 : 0,
        priority: hasAbnormal ? 'High' : 'Medium',
        analyzedAt: docRecord.uploadedAt,
        reviewStatus: 'Awaiting Review',
        clinicianNotes: '',
        sourceRefId: docId,
        provenance: provenance === 'functional_ai' ? 'functional_ai' : 'simulated_demo',
        modelUsed: modelUsed ?? 'Raw Text Extraction',
      };
      db.assessments = [assessment, ...db.assessments];

      pt.reviewStatus = 'Awaiting Review';
      appendPatientActivity(db, patientId, {
        category: 'Document',
        title: `PDF Uploaded & Processed: ${fileName}`,
        detail: `${category} · ${pageCount} page(s) · ${
          isScannedPdf ? 'Scanned OCR Pipeline' : 'Digital PDF Text Extraction'
        }`,
        actor: 'Dr. Aris Thorne, MD, FCCM',
      });

      saveDatabase(db);
      res.status(201).json({ document: docRecord, assessment });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'PDF upload & extraction failed.',
      });
    }
  });

  app.patch('/api/documents/:id/verify', (req, res) => {
    try {
      const db = loadDatabase();
      const doc = db.documents.find((d) => d.id === req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      doc.extractionVerified = true;
      doc.verifiedBy = 'Dr. Aris Thorne, MD, FCCM';
      doc.verifiedAt = new Date().toISOString();
      appendPatientActivity(db, doc.patientId, {
        category: 'Document',
        title: `Extracted Facts Verified: ${doc.fileName}`,
        detail: `Clinician verified extracted lab values and document summary.`,
        actor: doc.verifiedBy,
      });
      saveDatabase(db);
      res.json(doc);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to verify document.',
      });
    }
  });

  app.delete('/api/documents/:id', (req, res) => {
    try {
      const db = loadDatabase();
      const idx = db.documents.findIndex((d) => d.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      const [removed] = db.documents.splice(idx, 1);
      const filePath = path.resolve(UPLOADS_DIR, path.basename(removed.fileUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.assessments = db.assessments.filter((a) => a.sourceRefId !== removed.id);
      appendPatientActivity(db, removed.patientId, {
        category: 'Document',
        title: `Document Deleted: ${removed.fileName}`,
        detail: `Removed ${removed.category} from patient record.`,
        actor: 'Dr. Aris Thorne, MD, FCCM',
      });
      saveDatabase(db);
      res.json({ deletedId: removed.id });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to delete document.',
      });
    }
  });

  // ------------------------------------------------------------------
  // MEDICAL IMAGE UPLOAD, PERSISTENCE & COMPATIBLE AI ANALYSIS
  // ------------------------------------------------------------------
  app.post('/api/images/upload-and-analyze', async (req, res) => {
    const startMs = Date.now();
    try {
      const db = loadDatabase();
      const {
        patientId,
        modality,
        bodySystem,
        modelId,
        fileName,
        fileSizeBytes,
        mimeType,
        dimensions,
        imageBase64,
        imagePath,
        clinicalContext,
        modalityParameters,
      } = req.body as {
        patientId: string;
        modality: ImagingModalityId;
        bodySystem: BodySystemId;
        modelId: string;
        fileName?: string;
        fileSizeBytes?: number;
        mimeType?: string;
        dimensions?: string;
        imageBase64?: string;
        imagePath?: string;
        clinicalContext?: string;
        modalityParameters?: Record<string, string>;
      };

      const pt = db.patients.find((p) => p.id === patientId);
      if (!pt) {
        res.status(404).json({ error: 'Target patient not found.' });
        return;
      }

      if (!modality || !(modality in MODALITY_COMPATIBLE_MODELS)) {
        res.status(400).json({ error: `Unsupported imaging modality: ${String(modality)}` });
        return;
      }

      const allowedModels = MODALITY_COMPATIBLE_MODELS[modality];
      if (!modelId || !allowedModels.includes(modelId)) {
        res.status(400).json({
          error: `Model '${modelId}' is incompatible with ${modality.toUpperCase()}. Compatible models: ${allowedModels.join(', ')}.`,
        });
        return;
      }

      let base64Data = imageBase64;
      let resolvedMime = mimeType || 'image/jpeg';
      let persistedFileUrl = imagePath || '';
      let resolvedFileName = fileName || `${modality}_study.jpg`;
      let resolvedSize = fileSizeBytes || 0;

      if (base64Data) {
        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        base64Data = cleanBase64;
        const imgBuffer = Buffer.from(cleanBase64, 'base64');
        resolvedSize = resolvedSize || imgBuffer.length;
        const ext =
          resolvedMime === 'image/png'
            ? '.png'
            : resolvedMime === 'image/webp'
            ? '.webp'
            : '.jpg';
        const imgId = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const storedName = `${imgId}${ext}`;
        fs.writeFileSync(path.resolve(UPLOADS_DIR, storedName), imgBuffer);
        persistedFileUrl = `/api/files/${storedName}`;
      } else if (imagePath) {
        const loaded = resolveLocalAssetBase64(imagePath);
        base64Data = loaded.base64;
        resolvedMime = loaded.mimeType;
        resolvedSize = Buffer.from(loaded.base64, 'base64').length;
      } else {
        res.status(400).json({ error: 'No image payload or study path provided.' });
        return;
      }

      const ai = getGeminiClient();
      const paramSummary = modalityParameters
        ? Object.entries(modalityParameters)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')
        : 'Standard protocol';
      const systemName = BODY_SYSTEM_LABELS[bodySystem] ?? 'Multi-System';

      const prompt = [
        `Perform a structured clinical imaging interpretation for this ${modality.toUpperCase()} study focused on the ${systemName}.`,
        `Acquisition / Viewer Parameters: ${paramSummary}.`,
        clinicalContext ? `Clinical Context: ${clinicalContext}` : '',
        'Base every observation strictly on visible anatomical features. Do not present predictions as a confirmed final diagnosis.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: resolvedMime, data: base64Data } },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction: MODALITY_SYSTEM_DIRECTIVES[modality],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryPathology: { type: Type.STRING },
              urgency: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              impression: { type: Type.STRING },
              anatomicalObservations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    structure: { type: Type.STRING },
                    status: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                },
              },
              recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              limitations: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const latencyMs = Date.now() - startMs;
      const priority = mapUrgencyToPriority(parsed.urgency);
      const imageId = `uimg-${Date.now()}`;

      const imageRecord: UploadedImageRecord = {
        id: imageId,
        patientId,
        modality,
        bodySystem,
        fileName: resolvedFileName,
        fileSizeBytes: resolvedSize,
        mimeType: resolvedMime,
        dimensions: dimensions || 'Diagnostic Frame',
        uploadedAt: new Date().toISOString(),
        fileUrl: persistedFileUrl,
        parameters: modalityParameters,
        clinicalContext,
        modelUsed: modelId,
        provenance: 'functional_ai',
        latencyMs,
        analysisResult: parsed,
        priority,
        reviewStatus: 'Awaiting Review',
      };

      const assessment: UnifiedAssessment = {
        id: `asm-${Date.now()}`,
        patientId,
        analysisType: 'Medical Imaging',
        modalityOrCategory: `${modality.toUpperCase()} (${bodySystem})`,
        potentialFindings: parsed.primaryPathology || parsed.impression,
        confidence: Number(parsed.confidence) || 85,
        priority,
        analyzedAt: imageRecord.uploadedAt,
        reviewStatus: 'Awaiting Review',
        clinicianNotes: '',
        sourceRefId: imageId,
        provenance: 'functional_ai',
        modelUsed: modelId,
      };

      db.uploadedImages = [imageRecord, ...db.uploadedImages];
      db.assessments = [assessment, ...db.assessments];
      pt.reviewStatus = 'Awaiting Review';
      appendPatientActivity(db, patientId, {
        category: 'Image',
        title: `${modality.toUpperCase()} Analyzed (${modelId})`,
        detail: `${resolvedFileName} · ${parsed.primaryPathology ?? 'Review pending'}`,
        actor: 'Dr. Aris Thorne, MD, FCCM',
      });

      saveDatabase(db);
      res.status(201).json({
        imageRecord,
        assessment,
        envelope: {
          provenance: 'functional_ai',
          modelId,
          modality,
          bodySystem,
          analyzedAt: imageRecord.uploadedAt,
          latencyMs,
          result: parsed,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unexpected server error during imaging analysis.';
      const status =
        message.includes('API key') || message.includes('GEMINI_API_KEY') ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });

  // Legacy direct imaging analysis endpoint (preserved for DiagnosticWorkbench inline reads)
  app.post('/api/analyze-imaging', async (req, res) => {
    const startMs = Date.now();
    try {
      const {
        modality,
        bodySystem,
        modelId,
        imageBase64,
        imagePath,
        mimeType,
        clinicalContext,
        modalityParameters,
      } = req.body as {
        modality: ImagingModalityId;
        bodySystem: BodySystemId;
        modelId: string;
        imageBase64?: string;
        imagePath?: string;
        mimeType?: string;
        clinicalContext?: string;
        modalityParameters?: Record<string, string>;
      };

      if (!modality || !(modality in MODALITY_COMPATIBLE_MODELS)) {
        res.status(400).json({ error: `Unsupported imaging modality: ${String(modality)}` });
        return;
      }

      const allowedModels = MODALITY_COMPATIBLE_MODELS[modality];
      if (!modelId || !allowedModels.includes(modelId)) {
        res.status(400).json({
          error: `Model '${modelId}' is not compatible with ${modality.toUpperCase()} imaging. Compatible models: ${allowedModels.join(', ')}.`,
        });
        return;
      }

      let base64Data = imageBase64;
      let resolvedMime = mimeType || 'image/jpeg';
      if (!base64Data && imagePath) {
        if (imagePath.startsWith('/api/files/')) {
          const diskPath = path.resolve(UPLOADS_DIR, path.basename(imagePath));
          if (!fs.existsSync(diskPath)) {
            res.status(404).json({ error: 'Stored image file not found.' });
            return;
          }
          base64Data = fs.readFileSync(diskPath).toString('base64');
        } else {
          const loaded = resolveLocalAssetBase64(imagePath);
          base64Data = loaded.base64;
          resolvedMime = loaded.mimeType;
        }
      }

      if (!base64Data) {
        res.status(400).json({ error: 'No diagnostic image payload or study path provided.' });
        return;
      }

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const ai = getGeminiClient();
      const paramSummary = modalityParameters
        ? Object.entries(modalityParameters)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')
        : 'Standard protocol';
      const systemName = BODY_SYSTEM_LABELS[bodySystem] ?? 'Multi-System';

      const prompt = [
        `Perform a structured clinical imaging interpretation for this ${modality.toUpperCase()} study focused on the ${systemName}.`,
        `Acquisition / Viewer Parameters: ${paramSummary}.`,
        clinicalContext ? `Clinical Context: ${clinicalContext}` : '',
        'Base every observation strictly on visible anatomical features in the image and the clinical context provided. State clear limitations.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: resolvedMime, data: cleanBase64 } },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction: MODALITY_SYSTEM_DIRECTIVES[modality],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryPathology: { type: Type.STRING },
              urgency: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              findings: { type: Type.ARRAY, items: { type: Type.STRING } },
              impression: { type: Type.STRING },
              anatomicalObservations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    structure: { type: Type.STRING },
                    status: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                },
              },
              recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              limitations: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const latencyMs = Date.now() - startMs;

      res.json({
        provenance: 'functional_ai',
        modelId,
        modality,
        bodySystem,
        analyzedAt: new Date().toISOString(),
        latencyMs,
        result: parsed,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unexpected server error during imaging analysis.';
      const status =
        message.includes('API key') || message.includes('GEMINI_API_KEY') ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });

  // ------------------------------------------------------------------
  // MULTI-SYSTEM DISEASE ANALYSIS ENDPOINT
  // ------------------------------------------------------------------
  app.post('/api/analyze-disease', async (req, res) => {
    const startMs = Date.now();
    try {
      const {
        patientId,
        bodySystem,
        modelId,
        patientContext,
        clinicalObservation,
        vitalSummary,
        labSummary,
      } = req.body as {
        patientId?: string;
        bodySystem: BodySystemId;
        modelId: string;
        patientContext: string;
        clinicalObservation: string;
        vitalSummary?: string;
        labSummary?: string;
      };

      if (!modelId || !DISEASE_COMPATIBLE_MODELS.includes(modelId)) {
        res.status(400).json({
          error: `Model '${modelId}' is not compatible with multi-system clinical disease reasoning. Compatible models: ${DISEASE_COMPATIBLE_MODELS.join(', ')}.`,
        });
        return;
      }

      const systemName = BODY_SYSTEM_LABELS[bodySystem];
      if (!systemName) {
        res.status(400).json({ error: `Unsupported body system: ${String(bodySystem)}` });
        return;
      }

      const ai = getGeminiClient();

      const prompt = [
        `Evaluate the patient presentation specifically for pathologies of the ${systemName}.`,
        `Patient Profile: ${patientContext}`,
        vitalSummary ? `Current Biometrics: ${vitalSummary}` : '',
        labSummary ? `Key Biomarkers: ${labSummary}` : '',
        `Clinical Observation / Symptoms: ${clinicalObservation}`,
        'Provide a ranked differential diagnosis of 3 conditions in this body system with ICD-10 codes, calibrated confidence percentages, supporting evidence, contradicting caveats, and targeted next diagnostic workup.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an acute-care clinical decision support engine assisting attending intensivists and hospitalists. Provide evidence-grounded, concise differential diagnoses with accurate ICD-10 codes and clear safety red flags.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              systemRiskAssessment: { type: Type.STRING },
              criticalRedFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              differentials: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    condition: { type: Type.STRING },
                    icd10: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    supportingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                    contradictingFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendedWorkup: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const latencyMs = Date.now() - startMs;
      const analyzedAt = new Date().toISOString();

      if (patientId) {
        const db = loadDatabase();
        const top = parsed.differentials?.[0];
        const assessment: UnifiedAssessment = {
          id: `asm-${Date.now()}`,
          patientId,
          analysisType: 'Multi-System AI',
          modalityOrCategory: systemName.replace(' System', ''),
          potentialFindings: top ? `${top.condition} (${top.icd10})` : parsed.systemRiskAssessment,
          confidence: Number(top?.confidence) || 84,
          priority:
            (parsed.criticalRedFlags?.length ?? 0) > 0 && Number(top?.confidence) >= 85
              ? 'High'
              : 'Medium',
          analyzedAt,
          reviewStatus: 'Awaiting Review',
          clinicianNotes: '',
          provenance: 'functional_ai',
          modelUsed: modelId,
        };
        db.assessments = [assessment, ...db.assessments];
        appendPatientActivity(db, patientId, {
          category: 'Assessment',
          title: `Multi-System AI Evaluation (${systemName})`,
          detail: `${modelId} · ${top?.condition ?? 'Completed'}`,
          actor: 'Dr. Aris Thorne, MD, FCCM',
        });
        saveDatabase(db);
      }

      res.json({
        provenance: 'functional_ai',
        modelId,
        bodySystem,
        analyzedAt,
        latencyMs,
        result: parsed,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unexpected server error during disease analysis.';
      const status =
        message.includes('API key') || message.includes('GEMINI_API_KEY') ? 401 : 500;
      res.status(status).json({ error: message });
    }
  });

  // ------------------------------------------------------------------
  // CLINICAL DATASET ANALYSIS PERSISTENCE
  // ------------------------------------------------------------------
  app.post('/api/datasets', (req, res) => {
    try {
      const db = loadDatabase();
      const record = req.body as DatasetAnalysisRecord;
      db.datasets = [record, ...db.datasets];

      let assessment: UnifiedAssessment | undefined;
      if (record.patientId) {
        assessment = {
          id: `asm-${Date.now()}`,
          patientId: record.patientId,
          analysisType: 'Clinical Dataset',
          modalityOrCategory: record.modelType,
          potentialFindings:
            record.clinicalRiskIndicators[0] ||
            `${record.fileName}: ${record.recordCount} records, ${record.featureCount} features`,
          confidence: record.metrics?.accuracy ?? 80,
          priority: record.clinicalRiskIndicators.length >= 2 ? 'High' : 'Medium',
          analyzedAt: record.analyzedAt,
          reviewStatus: 'Awaiting Review',
          clinicianNotes: '',
          sourceRefId: record.id,
          provenance: 'statistical_ml',
          modelUsed: record.modelType,
        };
        db.assessments = [assessment, ...db.assessments];
        appendPatientActivity(db, record.patientId, {
          category: 'Dataset',
          title: `Clinical Dataset Analyzed: ${record.fileName}`,
          detail: `${record.modelType} · ${record.recordCount} rows · ${record.featureCount} features`,
          actor: 'Dr. Aris Thorne, MD, FCCM',
        });
      }

      saveDatabase(db);
      res.status(201).json({ dataset: record, assessment });
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to save dataset analysis.',
      });
    }
  });

  // ------------------------------------------------------------------
  // ASSESSMENT PRIORITIZATION & CLINICIAN REVIEW UPDATES
  // ------------------------------------------------------------------
  app.patch('/api/assessments/:id', (req, res) => {
    try {
      const db = loadDatabase();
      const asm = db.assessments.find((a) => a.id === req.params.id);
      if (!asm) {
        res.status(404).json({ error: 'Assessment record not found.' });
        return;
      }
      const { reviewStatus, priority, clinicianNotes } = req.body as {
        reviewStatus?: AssessmentReviewStatus;
        priority?: PriorityLevel;
        clinicianNotes?: string;
      };
      if (reviewStatus) asm.reviewStatus = reviewStatus;
      if (priority) asm.priority = priority;
      if (clinicianNotes !== undefined) asm.clinicianNotes = clinicianNotes;

      const pt = db.patients.find((p) => p.id === asm.patientId);
      if (pt && reviewStatus) {
        pt.reviewStatus = reviewStatus;
      }
      appendPatientActivity(db, asm.patientId, {
        category: 'Assessment',
        title: `Assessment Updated (${asm.reviewStatus})`,
        detail: `${asm.analysisType} · Priority: ${asm.priority}${
          clinicianNotes ? ` · Note: ${clinicianNotes}` : ''
        }`,
        actor: 'Dr. Aris Thorne, MD, FCCM',
      });

      saveDatabase(db);
      res.json(asm);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to update assessment.',
      });
    }
  });

  // ------------------------------------------------------------------
  // GENERATED ASSESSMENT REPORTS (SEPARATE FROM SOURCE PDFs)
  // ------------------------------------------------------------------
  app.post('/api/reports', (req, res) => {
    try {
      const db = loadDatabase();
      const payload = req.body as Omit<GeneratedReportRecord, 'id'>;
      const report: GeneratedReportRecord = {
        id: `rep-${Date.now()}`,
        ...payload,
      };
      db.reports = [report, ...db.reports];
      appendPatientActivity(db, report.patientId, {
        category: 'Assessment',
        title: `Generated Assessment PDF Report`,
        detail: `${report.fileName} (${report.priority} Priority · ${report.reviewStatus})`,
        actor: report.generatedBy,
      });
      saveDatabase(db);
      res.status(201).json(report);
    } catch (err: unknown) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to persist generated report.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClinSight Diagnostic Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
