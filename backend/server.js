import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize Prisma
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json());

// Setup static media hosting for resumes
const mediaRoot = path.resolve(__dirname, '../scratch/uploads');
if (!fs.existsSync(mediaRoot)) {
  fs.mkdirSync(mediaRoot, { recursive: true });
}
app.use('/media', express.static(mediaRoot));

// Endpoints: GET /api/companies/
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        roles: {
          include: {
            skillExpectations: true
          }
        }
      }
    });

    const result = companies.map(c => {
      const roles_data = c.roles.map(r => {
        const expectations = {};
        r.skillExpectations.forEach(exp => {
          expectations[exp.categoryCode] = exp.expectedLevel;
        });
        return {
          id: r.id,
          title: r.title,
          expectations
        };
      });
      return {
        id: c.id,
        name: c.name,
        roles: roles_data
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoints: GET /api/samples/
app.get('/api/samples', (req, res) => {
  try {
    const basePath = path.resolve(__dirname, '../scratch/RADIX TALENT MATCH HACKATHON');
    const jdsPdfDir = path.join(basePath, 'JDs', 'PDF');
    const jdsWordDir = path.join(basePath, 'JDs', 'Word');
    const resumesPdfDir = path.join(basePath, 'Resumes', 'PDF');
    const resumesWordDir = path.join(basePath, 'Resumes', 'Word');

    const jds = [];
    const resumes = [];

    // Helper to extract company/role from filename
    const mapJdFile = (f, fileType, dir) => {
      let company = "";
      let role = "";
      if (f.includes("Google")) company = "Google LLC";
      else if (f.includes("Microsoft")) company = "Microsoft";
      else if (f.includes("Oracle")) company = "Oracle Financial Services Software";

      if (f.includes("Software Engineer")) {
        role = company === "Oracle Financial Services Software" ? "Associate Software Engineer" : "Software Engineer";
      } else if (f.includes("Data Scientist")) {
        role = "Data Scientist";
      } else if (f.includes("Data Analyst")) {
        role = "Data Analyst";
      } else if (f.includes("Support Analyst")) {
        role = "Application Support Analyst";
      }

      return {
        filename: f,
        file_type: fileType,
        company,
        role,
        path: path.join(dir, f)
      };
    };

    // Load JDs
    if (fs.existsSync(jdsPdfDir)) {
      fs.readdirSync(jdsPdfDir).forEach(f => {
        if (f.endsWith('.pdf')) {
          jds.push(mapJdFile(f, 'PDF', jdsPdfDir));
        }
      });
    }
    if (fs.existsSync(jdsWordDir)) {
      fs.readdirSync(jdsWordDir).forEach(f => {
        if (f.endsWith('.docx')) {
          jds.push(mapJdFile(f, 'Word', jdsWordDir));
        }
      });
    }

    // Load Resumes
    const mapResumeFile = (f, fileType, dir) => {
      return {
        filename: f,
        file_type: fileType,
        candidate_name: f.replace(/\.(pdf|docx|doc)$/i, ''),
        path: path.join(dir, f)
      };
    };

    if (fs.existsSync(resumesPdfDir)) {
      fs.readdirSync(resumesPdfDir).forEach(f => {
        if (f.endsWith('.pdf')) {
          resumes.push(mapResumeFile(f, 'PDF', resumesPdfDir));
        }
      });
    }
    if (fs.existsSync(resumesWordDir)) {
      fs.readdirSync(resumesWordDir).forEach(f => {
        if (f.endsWith('.docx')) {
          resumes.push(mapResumeFile(f, 'Word', resumesWordDir));
        }
      });
    }

    res.json({ jds, resumes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoints: CRUD /api/profiles/
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await prisma.candidateProfile.findMany();
    const result = profiles.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      education: p.education,
      cv_file: p.cvFile
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { id: req.params.id },
      include: { skills: true }
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const skills_data = profile.skills.map(s => ({
      skill_name: s.skillName,
      category_code: s.categoryCode,
      evidence: s.evidence,
      confidence: s.confidence,
      level: s.level
    }));

    res.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      education: profile.education,
      cv_file: profile.cvFile,
      hackathons: profile.hackathons,
      internships: profile.internships,
      certifications: profile.certifications,
      preferred_roles: profile.preferredRoles,
      skills: skills_data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profiles', async (req, res) => {
  const { 
    name, email, education, cv_file, hackathons, internships, 
    certifications, preferred_roles, skills 
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required fields" });
  }

  try {
    // Check if updating an existing profile or creating a new one
    let profile = await prisma.candidateProfile.findUnique({ where: { email } });
    let profileId = "";

    if (profile) {
      profileId = profile.id;
      // Update basic fields
      await prisma.candidateProfile.update({
        where: { id: profileId },
        data: {
          name,
          education: education || "",
          cvFile: cv_file || "",
          hackathons: hackathons || [],
          internships: internships || [],
          certifications: certifications || [],
          preferredRoles: preferred_roles || []
        }
      });
      // Delete existing skills for clean insert
      await prisma.candidateSkill.deleteMany({ where: { profileId } });
    } else {
      // Create new profile
      profile = await prisma.candidateProfile.create({
        data: {
          name,
          email,
          education: education || "",
          cvFile: cv_file || "",
          hackathons: hackathons || [],
          internships: internships || [],
          certifications: certifications || [],
          preferredRoles: preferred_roles || []
        }
      });
      profileId = profile.id;
    }

    // Insert new skills
    if (skills && Array.isArray(skills)) {
      for (const s of skills) {
        await prisma.candidateSkill.create({
          data: {
            profileId,
            skillName: s.skill_name || "",
            categoryCode: s.category_code || "OTHER",
            evidence: s.evidence || "",
            confidence: s.confidence || "medium",
            level: parseInt(s.level) || 5
          }
        });
      }
    }

    res.json({ message: "Profile saved successfully", id: profileId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/profiles/:id', async (req, res) => {
  try {
    await prisma.candidateProfile.delete({ where: { id: req.params.id } });
    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configure Multer for CV upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = crypto.randomUUID() + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Endpoint: POST /api/profiles/upload-cv/
app.post('/api/profiles/upload-cv', upload.single('cv'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded under field name 'cv'" });
    }
    const savePath = path.join(mediaRoot, req.file.filename);
    res.json({
      message: "File uploaded successfully",
      filename: req.file.originalname,
      saved_name: req.file.filename,
      path: savePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: GET/POST /api/history/talent-check/
app.get('/api/history/talent-check', async (req, res) => {
  try {
    const results = await prisma.talentCheckResult.findMany({
      include: {
        profile: true,
        role: {
          include: {
            company: true
          }
        }
      },
      orderBy: {
        checkedAt: 'desc'
      }
    });

    const output = results.map(r => ({
      id: r.id,
      profile_id: r.profileId,
      candidate_name: r.profile.name,
      company_name: r.role.company.name,
      role_title: r.role.title,
      readiness_score: r.readinessScore,
      gap_details: r.gapDetails,
      checked_at: r.checkedAt.toISOString()
    }));

    res.json(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history/talent-check', async (req, res) => {
  const { profile_id, role_id, readiness_score, gap_details } = req.body;

  if (!profile_id || !role_id || readiness_score === undefined || !gap_details) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const resultRecord = await prisma.talentCheckResult.create({
      data: {
        profileId: profile_id,
        roleId: role_id,
        readinessScore: parseInt(readiness_score),
        gapDetails: gap_details
      }
    });
    res.json({ message: "Result saved", id: resultRecord.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: GET/POST /api/history/skill-match/
app.get('/api/history/skill-match', async (req, res) => {
  try {
    const results = await prisma.skillMatchResult.findMany({
      include: {
        profile: true,
        jd: {
          include: {
            role: {
              include: {
                company: true
              }
            }
          }
        }
      },
      orderBy: {
        matchedAt: 'desc'
      }
    });

    const output = results.map(r => ({
      id: r.id,
      profile_id: r.profileId,
      candidate_name: r.profile.name,
      jd_file: r.jd.sourceFile,
      company_name: r.jd.role.company.name,
      role_title: r.jd.role.title,
      match_score: r.matchScore,
      matched_skills: r.matchedSkills,
      missing_skills: r.missingSkills,
      matched_at: r.matchedAt.toISOString()
    }));

    res.json(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history/skill-match', async (req, res) => {
  const { 
    profile_id, jd_id, jd_source_file, match_score, matched_skills, missing_skills 
  } = req.body;

  if (!profile_id || !jd_id || match_score === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Find or create JobDescription record in database
    let jdRecord = await prisma.jobDescription.findFirst({
      where: {
        roleId: jd_id,
        sourceFile: jd_source_file || "sample_jd.pdf"
      }
    });

    if (!jdRecord) {
      jdRecord = await prisma.jobDescription.create({
        data: {
          roleId: jd_id,
          sourceFile: jd_source_file || "sample_jd.pdf"
        }
      });
    }

    // 2. Create the SkillMatchResult
    const resultRecord = await prisma.skillMatchResult.create({
      data: {
        profileId: profile_id,
        jdId: jdRecord.id,
        matchScore: parseInt(match_score),
        matchedSkills: matched_skills || [],
        missingSkills: missing_skills || []
      }
    });

    res.json({ message: "Result saved", id: resultRecord.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Node.js/Express Backend listening on port ${PORT}`);
});
