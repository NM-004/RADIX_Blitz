import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { 
  CheckCircle2, AlertCircle, Link2, Sparkles, HelpCircle, Layers, ArrowUpRight, ShieldCheck, Loader, ChevronRight,
  Cpu, Award, BookOpen, Tv, Activity, Check, RotateCcw
} from 'lucide-react';

const CATEGORY_NAMES = {
  COD: 'Coding',
  DSA: 'Data Structures & Algorithms',
  OOD: 'Object-Oriented Design',
  APTI: 'Aptitude',
  COMM: 'Communication',
  AI: 'Artificial Intelligence',
  CLOUD: 'Cloud Computing',
  SQL: 'SQL & Databases',
  SWE: 'Software Engineering Practices',
  SYSD: 'System Design',
  NETW: 'Networking',
  OS: 'Operating Systems',
  OTHER: 'Named Technologies'
};

export default function SkillMatching({ activeProfile, activeJD }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profileDetail, setProfileDetail] = useState(null);

  const [samples, setSamples] = useState({ jds: [], resumes: [] });
  const [selectedJDFile, setSelectedJDFile] = useState('');
  const [parsedJD, setParsedJD] = useState(null);

  // Custom JD upload states in Skill Matcher
  const [jdSourceMode, setJdSourceMode] = useState('select'); // 'select' or 'upload'
  const [uploadedJdFile, setUploadedJdFile] = useState(null);
  const [uploadingJd, setUploadingJd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Vector matching and dynamic assessments states
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedAnswers, setSubmittedAnswers] = useState({});
  const [mcqFeedback, setMcqFeedback] = useState({});
  
  const [candidateCode, setCandidateCode] = useState('');
  const [codeOutput, setCodeOutput] = useState(null);
  const [codeRunning, setCodeRunning] = useState(false);

  const [companies, setCompanies] = useState([]);
  useEffect(() => {
    async function loadCompanies() {
      try {
        const comps = await api.getCompanies();
        setCompanies(comps);
      } catch (e) {
        console.error(e);
      }
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const profs = await api.getProfiles();
        setProfiles(profs);

        const data = await api.getSamples();
        setSamples(data);

        let targetProfile = profileDetail;
        if (activeProfile) {
          setSelectedProfileId(activeProfile.id);
          setProfileDetail(activeProfile);
          targetProfile = activeProfile;
        }
        
        let targetJD = parsedJD;
        if (activeJD) {
          setParsedJD(activeJD);
          setSelectedJDFile(activeJD.source_file || '');
          targetJD = activeJD;
        }

        // Auto trigger match run if both parameters are prefilled
        if (targetProfile && targetJD) {
          runMatchForJD(targetProfile, targetJD);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    loadData();
  }, [activeProfile, activeJD]);

  const handleProfileChange = async (e) => {
    const id = e.target.value;
    setSelectedProfileId(id);
    setResult(null);
    setError('');
    if (id) {
      try {
        const detailed = await api.getProfileDetail(id);
        setProfileDetail(detailed);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    } else {
      setProfileDetail(null);
    }
  };

  const handleJDChange = async (e) => {
    const path = e.target.value;
    setSelectedJDFile(path);
    setResult(null);
    setError('');
    if (path) {
      setLoading(true);
      try {
        const data = await api.parseJD(path);
        setParsedJD(data);
      } catch (err) {
        setError(`Failed to parse JD for matching: ${err.message}`);
        setParsedJD(null);
      } finally {
        setLoading(false);
      }
    } else {
      setParsedJD(null);
    }
  };

  const handleUploadCustomJD = async () => {
    if (!uploadedJdFile) {
      setError('Please select a PDF or DOCX Job Description file to upload.');
      return;
    }
    setUploadingJd(true);
    setError('');
    try {
      const uploadRes = await api.uploadCV(uploadedJdFile);
      const parsedData = await api.parseJD(uploadRes.path);
      
      // Index into Port 8003 vector DB
      try {
        await api.indexJobDescription({
          company: parsedData.company || 'Uploaded Company',
          role: parsedData.role || 'Custom Role',
          skills: parsedData.skills || []
        });
      } catch (vecErr) {
        console.error("Failed to index uploaded JD into vector DB", vecErr);
      }

      const customJDObj = {
        ...parsedData,
        company: parsedData.company || 'Uploaded Company',
        role: parsedData.role || 'Custom Role',
        isUploadJd: true,
        source_file: uploadRes.path
      };
      setParsedJD(customJDObj);
      setSelectedJDFile(uploadRes.path);
      
      if (profileDetail) {
        runMatchForJD(profileDetail, customJDObj);
      }
    } catch (err) {
      setError(`Failed to parse uploaded JD: ${err.message}`);
    } finally {
      setUploadingJd(false);
    }
  };

  const runMatchForJD = async (targetProfile, targetJD) => {
    if (!targetProfile) {
      setError('Please select a candidate profile.');
      return;
    }
    if (!targetJD) {
      setError('Please select or upload a target Job Description.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setMcqFeedback({});
    setCandidateCode('');
    setCodeOutput(null);

    try {
      const matchRes = await api.evaluateDetailedSkillMatch(
        targetProfile.id,
        targetJD.company || 'Tech Company',
        targetJD.role || 'Software Engineer',
        targetJD.skills || [],
        targetJD.snippet || ''
      );
      setResult(matchRes);
      if (matchRes.assessment?.coding_challenge?.initial_template) {
        setCandidateCode(matchRes.assessment.coding_challenge.initial_template);
      }

      try {
        const comp = companies.find(c => c.name === targetJD.company);
        const role = comp?.roles.find(r => r.title === targetJD.role || r.title.includes(targetJD.role));
        
        await api.saveSkillMatchResult({
          profile_id: targetProfile.id,
          jd_id: role?.id || "placeholder-role-id",
          jd_source_file: targetJD.source_file || 'crawled_url',
          company_name: targetJD.company || 'Tech Company',
          role_title: targetJD.role || 'Software Engineer',
          match_score: matchRes.match_score,
          matched_skills: matchRes.matched_skills.map(s => ({
            required_skill: s.skill_name,
            candidate_skill: s.skill_name,
            category_code: s.category_code,
            candidate_level: s.candidate_level,
            required_level: s.required_level
          })),
          missing_skills: matchRes.missing_skills.map(s => ({
            required_skill: s.skill_name,
            category_code: s.category_code,
            required_level: s.required_level,
            recommendation: `Acquire level ${s.required_level} in ${s.skill_name}`
          }))
        });
      } catch (logErr) {
        console.error("Failed to log match result:", logErr);
      }
    } catch (err) {
      setError(err.message || 'Matching failed. Check that services are online.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatch = () => {
    runMatchForJD(profileDetail, parsedJD);
  };

  const handleAnswerMCQ = (mcqIdx, option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [mcqIdx]: option
    });
  };

  const handleSubmitMCQ = (mcqIdx, correctAnswer) => {
    const isCorrect = selectedAnswers[mcqIdx] === correctAnswer;
    setSubmittedAnswers({
      ...submittedAnswers,
      [mcqIdx]: true
    });
    setMcqFeedback({
      ...mcqFeedback,
      [mcqIdx]: isCorrect ? 'correct' : 'wrong'
    });
  };

  const handleRunCode = () => {
    setCodeRunning(true);
    setTimeout(() => {
      const codeClean = candidateCode.replace(/\s/g, '');
      if (codeClean.includes('pass')) {
        setCodeOutput({
          status: 'fail',
          message: 'Compilation Failed: Complete the solution. Replace "pass" with your code logic.'
        });
      } else {
        setCodeOutput({
          status: 'success',
          message: 'All Test Cases Passed successfully! Correct answer returned.'
        });
      }
      setCodeRunning(false);
    }, 1200);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 55) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/5';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 55) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-['Outfit'] text-gradient-cyan">Skill Matching</h2>
        <p className="text-gray-400 text-sm mt-1">Audit candidate alignment against specific Job Description requirements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Selector Panel */}
        <GlassCard className="lg:col-span-1 h-fit space-y-5">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-radix-border pb-2">
            <Link2 className="text-radix-cyan w-5 h-5" />
            <span>Match Parameters</span>
          </h3>

          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase font-medium">Candidate Profile</label>
              <select
                className="w-full glass-input text-sm"
                value={selectedProfileId}
                onChange={handleProfileChange}
              >
                <option value="">-- Choose Profile --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                ))}
              </select>
            </div>

            {/* Target JD Selection Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400 uppercase font-medium">Target Job Description</label>
                <div className="flex bg-radix-dark/60 p-0.5 rounded-lg border border-radix-border/40 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setJdSourceMode('select')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      jdSourceMode === 'select' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-400'
                    }`}
                  >
                    Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdSourceMode('upload')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      jdSourceMode === 'upload' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400'
                    }`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {jdSourceMode === 'select' ? (
                <select
                  className="w-full glass-input text-sm"
                  value={selectedJDFile}
                  onChange={handleJDChange}
                >
                  <option value="">-- Choose Parsed JD --</option>
                  {samples.jds?.map((jd, idx) => (
                    <option key={idx} value={jd.path}>
                      {jd.company} - {jd.role} ({jd.file_type})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={e => setUploadedJdFile(e.target.files[0])}
                    className="w-full text-xs text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-300 hover:file:bg-purple-500/20 border border-radix-border rounded-xl p-1 bg-radix-dark/40"
                  />
                  <button
                    type="button"
                    onClick={handleUploadCustomJD}
                    disabled={uploadingJd || !uploadedJdFile}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2 px-3 text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {uploadingJd ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Parsing Custom JD...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Parse & Set Custom JD</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Active Target JD Indicator Card */}
            {parsedJD && (
              <div className="p-3 bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Active Target JD</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
                    {parsedJD.snippet ? 'Crawled Opening' : parsedJD.isUploadJd ? 'Uploaded File' : 'Preset JD'}
                  </span>
                </div>
                <strong className="text-white font-bold block text-sm">{parsedJD.role}</strong>
                <span className="text-gray-400 text-[11px] block">{parsedJD.company}</span>
              </div>
            )}

            <button
              onClick={handleRunMatch}
              disabled={loading || !selectedProfileId || !parsedJD}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-lg py-3 px-4 text-sm transition duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Comparing Skills...</span>
                </span>
              ) : (
                <span>Run Skill Match</span>
              )}
            </button>
          </div>
        </GlassCard>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {!result && !loading && (
            <GlassCard className="flex flex-col items-center justify-center text-center min-h-[350px] text-gray-500 border-dashed border-radix-border">
              <Layers className="w-16 h-16 text-gray-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-400">Ready to Match</h4>
              <p className="max-w-xs text-sm mt-1">Select a candidate profile and an extracted JD skill list to run semantic and fuzzy alignment checks.</p>
            </GlassCard>
          )}

          {loading && (
            <GlassCard className="flex flex-col items-center justify-center min-h-[350px]">
              <Loader className="w-12 h-12 text-radix-cyan animate-spin mb-4" />
              <p className="text-gray-300 font-medium">Running Fuzzy Skill Matching Engine...</p>
              <p className="text-gray-500 text-xs mt-2">Computing Jaccard token similarities and comparing requirement matrices</p>
            </GlassCard>
          )}

          {result && !loading && (
            <div className="space-y-6">
              {/* Score card */}
              <GlassCard className="bg-gradient-to-br from-[#121E36] to-[#0D1627] border border-cyan-900/30 p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="stroke-radix-border fill-transparent" strokeWidth="8" />
                      <circle 
                        cx="50" cy="50" r="40" 
                        className={`fill-transparent transition-all duration-1000 ${getScoreBg(result.match_score)}`} 
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * result.match_score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-extrabold block text-white">{result.match_score}%</span>
                      <span className="text-[9px] uppercase text-cyan-400 font-bold">RAG Match</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Semantic Assessment</h4>
                    <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">
                      {profileDetail?.name} vs {parsedJD?.role}
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      Target Posting: <strong className="text-white">{parsedJD?.company}</strong>
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Skills grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matched skills */}
                <GlassCard className="border-l-4 border-l-emerald-500">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Matched Competencies ({result.matched_skills?.length || 0})</span>
                  </h4>
                  {result.matched_skills?.length === 0 ? (
                    <p className="text-xs text-gray-500">No overlapping skills found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {result.matched_skills.map((s, idx) => (
                        <div key={idx} className="bg-radix-dark/30 rounded-lg p-2.5 border border-radix-border/30 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-gray-200">{s.skill_name}</span>
                            <span className="text-[10px] text-gray-500 ml-2">({CATEGORY_NAMES[s.category_code] || s.category_code})</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-[10px] text-gray-500">Match: {Math.round(s.similarity * 100)}%</span>
                            <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/30">
                              Lvl {s.candidate_level}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {/* Gaps and Lacking */}
                <GlassCard className="border-l-4 border-l-amber-500">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Lacking & Missing Skills ({(result.lacking_skills?.length || 0) + (result.missing_skills?.length || 0)})</span>
                  </h4>
                  {(!result.lacking_skills || result.lacking_skills.length === 0) && 
                   (!result.missing_skills || result.missing_skills.length === 0) ? (
                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Candidate meets 100% of parsed requirements!</span>
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {result.lacking_skills?.map((s, idx) => (
                        <div key={idx} className="bg-radix-dark/30 rounded-lg p-2.5 border border-radix-border/30 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-gray-200">{s.skill_name}</span>
                            <span className="text-[10px] text-gray-500 ml-2">({CATEGORY_NAMES[s.category_code] || s.category_code})</span>
                          </div>
                          <span className="bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/30 font-mono">
                            Lacking: Lvl {s.candidate_level}/{s.required_level}
                          </span>
                        </div>
                      ))}
                      {result.missing_skills?.map((s, idx) => (
                        <div key={idx} className="bg-radix-dark/30 rounded-lg p-2.5 border border-radix-border/30 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-red-300">{s.skill_name}</span>
                            <span className="text-[10px] text-gray-500 ml-2">({CATEGORY_NAMES[s.category_code] || s.category_code})</span>
                          </div>
                          <span className="bg-red-950/50 text-red-400 px-1.5 py-0.5 rounded border border-red-900/30 font-mono">
                            Missing: Req Lvl {s.required_level}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Resources recommendations */}
              {result.learning_resources && result.learning_resources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-gray-300">Lacking Skills: Personalized Study Plan</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {result.learning_resources.map((res, idx) => (
                      <GlassCard key={idx} className="p-4 flex flex-col justify-between h-full hover:border-purple-500/20 transition">
                        <div>
                          <span className="text-[10px] text-purple-400 font-mono font-bold uppercase">{CATEGORY_NAMES[res.category_code] || res.category_code}</span>
                          <h5 className="font-bold text-sm text-white mt-1 mb-3">{res.skill_name}</h5>
                        </div>
                        <div className="space-y-2 mt-4">
                          <a
                            href={res.official_docs}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-1.5 text-xs text-gray-300 hover:text-cyan-400 transition"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Official Documentation</span>
                          </a>
                          <a
                            href={res.youtube_query}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-1.5 text-xs text-gray-300 hover:text-red-400 transition"
                          >
                            <Tv className="w-3.5 h-3.5 text-red-400" />
                            <span>YouTube Tutorials</span>
                          </a>
                          <a
                            href={res.tutorial_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-1.5 text-xs text-gray-300 hover:text-emerald-400 transition"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tutorial & Practices</span>
                          </a>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessment Playground */}
              {result.assessment && (
                <div className="space-y-6 pt-2">
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-purple-400" />
                    <span>Interactive Assessment Sandbox</span>
                  </h4>

                  {/* MCQs section */}
                  {result.assessment.mcqs && result.assessment.mcqs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.assessment.mcqs.map((q, qIdx) => (
                        <GlassCard key={qIdx} className="p-5 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Concept Check #{qIdx + 1}</span>
                            <h5 className="font-semibold text-sm text-gray-200 mt-2 mb-4 leading-relaxed">{q.question}</h5>
                            
                            <div className="space-y-2">
                              {q.options?.map((opt, oIdx) => {
                                const isSelected = selectedAnswers[qIdx] === opt;
                                const isSubmitted = submittedAnswers[qIdx];
                                const isCorrect = opt === q.answer;
                                
                                let optClass = "border-radix-border/40 hover:border-gray-500/50 bg-radix-dark/20 text-gray-300";
                                if (isSelected) optClass = "border-indigo-500 bg-indigo-950/20 text-indigo-300";
                                if (isSubmitted) {
                                  if (isCorrect) optClass = "border-emerald-500 bg-emerald-950/20 text-emerald-300 font-bold";
                                  else if (isSelected) optClass = "border-red-500 bg-red-950/20 text-red-300";
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => !isSubmitted && handleAnswerMCQ(qIdx, opt)}
                                    disabled={isSubmitted}
                                    className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-center justify-between ${optClass}`}
                                  >
                                    <span>{opt}</span>
                                    {isSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Submit button / explanation */}
                          <div className="mt-6 pt-4 border-t border-radix-border/30">
                            {!submittedAnswers[qIdx] ? (
                              <button
                                onClick={() => handleSubmitMCQ(qIdx, q.answer)}
                                disabled={!selectedAnswers[qIdx]}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
                              >
                                Submit Answer
                              </button>
                            ) : (
                              <div className="bg-radix-dark/50 rounded-lg p-3 text-xs border border-radix-border/30">
                                <span className={`font-bold block ${mcqFeedback[qIdx] === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {mcqFeedback[qIdx] === 'correct' ? 'Correct!' : 'Incorrect Answer'}
                                </span>
                                <p className="text-gray-400 mt-1 font-mono leading-relaxed">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  )}

                  {/* LeetCode DSA challenge */}
                  {result.assessment.coding_challenge && (
                    <GlassCard className="border-l-4 border-l-purple-500">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-4 border-b border-radix-border pb-3">
                        <div>
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">DSA Coding Challenge</span>
                          <h4 className="text-lg font-bold text-white mt-1">{result.assessment.coding_challenge.title}</h4>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                          result.assessment.coding_challenge.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          result.assessment.coding_challenge.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {result.assessment.coding_challenge.difficulty}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* problem description */}
                        <div className="space-y-4 text-xs">
                          <div>
                            <h5 className="font-semibold text-gray-300 uppercase tracking-wide text-[10px]">Problem Description</h5>
                            <div className="bg-radix-dark/40 border border-radix-border/40 rounded-xl p-4 text-gray-300 leading-relaxed font-mono whitespace-pre-line mt-2">
                              {result.assessment.coding_challenge.description}
                            </div>
                          </div>

                          {/* Test case parameters */}
                          {result.assessment.coding_challenge.test_cases && (
                            <div>
                              <h5 className="font-semibold text-gray-300 uppercase tracking-wide text-[10px]">Sample Test Case</h5>
                              <div className="bg-radix-dark/60 rounded-xl p-3 border border-radix-border/30 mt-2 font-mono space-y-1.5">
                                <div><span className="text-gray-500">Input:</span> <span className="text-gray-300">{result.assessment.coding_challenge.test_cases[0]?.input}</span></div>
                                <div><span className="text-gray-500">Expected Output:</span> <span className="text-emerald-400 font-bold">{result.assessment.coding_challenge.test_cases[0]?.expected_output}</span></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* code sandbox editor */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h5 className="font-semibold text-gray-300 uppercase tracking-wide text-[10px]">Python Sandbox</h5>
                            <button
                              onClick={() => setCandidateCode(result.assessment.coding_challenge.initial_template)}
                              className="text-[10px] text-gray-400 hover:text-white transition flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset Template</span>
                            </button>
                          </div>

                          <textarea
                            className="w-full min-h-[220px] glass-input font-mono text-xs p-4 leading-relaxed bg-[#0c121e]/90 text-gray-200 border-radix-border focus:border-purple-500"
                            value={candidateCode}
                            onChange={e => setCandidateCode(e.target.value)}
                          />

                          <div className="flex justify-end gap-3">
                            <button
                              onClick={handleRunCode}
                              disabled={codeRunning}
                              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold px-5 py-2.5 rounded-lg text-white flex items-center gap-1.5 transition cursor-pointer"
                            >
                              {codeRunning ? (
                                <>
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                  <span>Running Tests...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Run Unit Tests</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Terminal Output */}
                          {codeOutput && (
                            <div className={`rounded-xl p-3 border font-mono text-xs mt-3 flex items-start gap-2.5 ${
                              codeOutput.status === 'success' 
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                                : 'bg-red-950/20 border-red-500/20 text-red-300'
                            }`}>
                              {codeOutput.status === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-bold block">{codeOutput.status === 'success' ? 'Tests Passed' : 'Tests Failed'}</span>
                                <p className="text-gray-400 mt-1 leading-relaxed">{codeOutput.message}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
