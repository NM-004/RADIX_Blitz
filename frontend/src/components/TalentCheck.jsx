import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { 
  Building, UserCheck, AlertCircle, CheckCircle2, TrendingUp, HelpCircle, ArrowRight, ShieldAlert, Sparkles, Loader,
  Cpu, Award, BookOpen, Tv, Activity, Check, RotateCcw, Trash2
} from 'lucide-react';

const CATEGORY_MAP = {
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
  OS: 'Operating Systems'
};

export default function TalentCheck({ activeProfile, activeCompanyRole, navTo, setActiveJD, setActiveProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profileDetail, setProfileDetail] = useState(null);
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [searchLoading, setSearchLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [searched, setSearched] = useState(false);

  const [checkMode, setCheckMode] = useState('benchmark'); // 'benchmark' or 'search'
  const [benchmarkSource, setBenchmarkSource] = useState('predefined'); // 'predefined' or 'upload'
  const [jdFile, setJdFile] = useState(null);
  const [parsingJd, setParsingJd] = useState(false);
  const [customParsedJd, setCustomParsedJd] = useState(null);

  // Load profiles and companies on mount
  useEffect(() => {
    async function loadData() {
      try {
        const profs = await api.getProfiles();
        setProfiles(profs);
        
        const comps = await api.getCompanies();
        setCompanies(comps);

        // Pre-fill if passed from parent
        if (activeProfile) {
          setSelectedProfileId(activeProfile.id);
          setProfileDetail(activeProfile);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    loadData();
  }, [activeProfile]);

  // Fetch full profile details when selection changes
  const handleProfileChange = async (e) => {
    const id = e.target.value;
    setSelectedProfileId(id);
    setResult(null);
    setError('');
    setSearched(false);
    setJobs([]);
    if (id) {
      try {
        const detailed = await api.getProfileDetail(id);
        setProfileDetail(detailed);
      } catch (err) {
        console.error("Failed to load profile details", err);
      }
    } else {
      setProfileDetail(null);
    }
  };

  const handleCompanyChange = (e) => {
    setSelectedCompanyId(e.target.value);
    setSelectedRoleId('');
    setResult(null);
    setError('');
    setSearched(false);
    setJobs([]);
  };

  const handleSearchJobs = async () => {
    if (!profileDetail) return;
    setSearchLoading(true);
    setSearched(true);
    try {
      const skillsList = profileDetail.skills.map(s => s.skill_name);
      const res = await api.findJobs(profileDetail.preferred_roles || [], skillsList);
      setJobs(res.jobs || []);
    } catch (e) {
      console.error("Search opportunities failed", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDetailedSkillMatch = (job) => {
    if (!profileDetail) return;
    if (setActiveProfile) {
      setActiveProfile(profileDetail);
    }
    setActiveJD({
      company: job.company || 'Tech Company',
      role: job.job_title || 'Software Engineer',
      snippet: job.snippet || '',
      skills: [] 
    });
    navTo('skill-matching');
  };

  const handleClearJDStore = async () => {
    try {
      await api.clearJDStore();
      alert("Job Description Vector Store cleared successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to clear vector store.");
    }
  };

  const getActiveRoles = () => {
    const comp = companies.find(c => c.id === selectedCompanyId);
    return comp ? comp.roles : [];
  };

  const handleUploadAndRunCustomJd = async () => {
    if (!jdFile || !profileDetail) {
      setError('Please upload a company JD document.');
      return;
    }
    setLoading(true);
    setParsingJd(true);
    setError('');
    setResult(null);
    setSearched(false);
    setJobs([]);

    try {
      // 1. Upload JD
      const uploadRes = await api.uploadCV(jdFile);
      const savedPath = uploadRes.path;

       // 2. Parse JD using port 8001 service
      const parsedJd = await api.parseJD(savedPath);
      setCustomParsedJd(parsedJd);
      
      // Index parsed JD skills into the Port 8003 vector DB
      try {
        await api.indexJobDescription({
          company: parsedJd.company || 'Custom Company',
          role: parsedJd.role || 'Custom Role',
          skills: parsedJd.skills || []
        });
      } catch (vecErr) {
        console.error("Failed to index custom JD into vector DB", vecErr);
      }
      
      // 3. Convert parsed JD skills to expectations dictionary
      const expectations = {};
      parsedJd.skills.forEach(s => {
        if (s.category_code && s.category_code !== 'OTHER') {
          expectations[s.category_code] = Math.max(expectations[s.category_code] || 0, s.level || 5);
        }
      });

      // 4. Run comparative Talent Check on port 8002 service
      const checkRes = await api.runTalentCheck(profileDetail.skills, expectations);
      setResult(checkRes);

      // 5. Save audit result and register custom JD as a permanent benchmark in PostgreSQL!
      await api.saveTalentCheckResult({
        profile_id: profileDetail.id,
        role_id: 'custom',
        company_name: parsedJd.company || 'Custom Company',
        role_title: parsedJd.role || 'Custom Role',
        expectations: expectations,
        readiness_score: checkRes.readiness_score,
        gap_details: checkRes.skillset_gap
      });

      // Refresh company list so it immediately updates in predefined dropdowns!
      const comps = await api.getCompanies();
      setCompanies(comps);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Parsing or evaluation failed. Ensure parsing and evaluation microservices are active.');
    } finally {
      setLoading(false);
      setParsingJd(false);
    }
  };

  const handleDeepSkillAnalysisCustomJd = () => {
    if (!customParsedJd) return;
    setActiveJD({
      ...customParsedJd,
      company: customParsedJd.company || 'Custom Company',
      role: customParsedJd.role || 'Custom Role',
      skills: customParsedJd.skills || []
    });
    navTo('skill-matching');
  };

  const handleRunCheck = async () => {
    if (!profileDetail) {
      setError('Please select a candidate profile.');
      return;
    }
    if (!selectedCompanyId || !selectedRoleId) {
      setError('Please select a company and target role.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSearched(false);
    setJobs([]);

    const comp = companies.find(c => c.id === selectedCompanyId);
    const role = comp.roles.find(r => r.id === selectedRoleId);
    
    try {
      // 1. Trigger FastAPI Talent Check
      const checkRes = await api.runTalentCheck(profileDetail.skills, role.expectations);
      
      setResult(checkRes);

      // 2. Save result to Django History
      await api.saveTalentCheckResult({
        profile_id: profileDetail.id,
        role_id: role.id,
        readiness_score: checkRes.readiness_score,
        gap_details: checkRes.skillset_gap
      });
      
    } catch (err) {
      setError(err.message || 'Evaluation failed. Make sure all backend services are running.');
    } finally {
      setLoading(false);
    }
  };

  // Get color for readiness score
  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 65) return 'text-amber-400';
    return 'text-rose-500';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'stroke-emerald-500';
    if (score >= 65) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-['Outfit'] text-gradient-purple">Talent Check</h2>
        <p className="text-gray-400 text-sm mt-1">Audit candidate readiness against specific corporate skillset benchmarks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <GlassCard className="lg:col-span-1 h-fit space-y-5">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-radix-border pb-2">
            <Building className="text-radix-primary w-5 h-5" />
            <span>Target Benchmark</span>
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

            {selectedProfileId && (
              <div className="space-y-4 pt-2 border-t border-radix-border/40">
                {/* Mode Select Tabs */}
                <div className="grid grid-cols-2 gap-1.5 bg-radix-dark p-1 rounded-lg border border-radix-border/60 text-xs">
                  <button
                    onClick={() => { setCheckMode('benchmark'); setResult(null); setJobs([]); setSearched(false); setError(''); }}
                    className={`py-1.5 px-2 rounded font-semibold transition ${
                      checkMode === 'benchmark'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow font-bold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Benchmark Audit
                  </button>
                  <button
                    onClick={() => { setCheckMode('search'); setResult(null); setJobs([]); setSearched(false); setError(''); }}
                    className={`py-1.5 px-2 rounded font-semibold transition ${
                      checkMode === 'search'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow font-bold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Job Discovery
                  </button>
                </div>

                {checkMode === 'benchmark' ? (
                  <div className="space-y-4">
                    {/* Benchmark Sub-toggles */}
                    <div className="flex gap-4 text-xs font-semibold pb-1 border-b border-radix-border/20">
                      <button
                        onClick={() => { setBenchmarkSource('predefined'); setResult(null); setJobs([]); setSearched(false); setError(''); }}
                        className={`pb-1 border-b-2 transition ${
                          benchmarkSource === 'predefined'
                            ? 'border-indigo-500 text-indigo-300'
                            : 'border-transparent text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        Predefined Role
                      </button>
                      <button
                        onClick={() => { setBenchmarkSource('upload'); setResult(null); setJobs([]); setSearched(false); setError(''); }}
                        className={`pb-1 border-b-2 transition ${
                          benchmarkSource === 'upload'
                            ? 'border-indigo-500 text-indigo-300'
                            : 'border-transparent text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        Upload Custom JD
                      </button>
                    </div>

                    {benchmarkSource === 'predefined' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5 uppercase font-medium">Company</label>
                          <select
                            className="w-full glass-input text-sm"
                            value={selectedCompanyId}
                            onChange={handleCompanyChange}
                          >
                            <option value="">-- Choose Company --</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5 uppercase font-medium">Job Role</label>
                          <select
                            className="w-full glass-input text-sm"
                            value={selectedRoleId}
                            onChange={e => { setSelectedRoleId(e.target.value); setResult(null); setError(''); }}
                            disabled={!selectedCompanyId}
                          >
                            <option value="">-- Choose Target Role --</option>
                            {getActiveRoles().map(r => (
                              <option key={r.id} value={r.id}>{r.title}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={handleRunCheck}
                          disabled={loading || !selectedRoleId}
                          className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg py-2.5 px-4 text-sm transition duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg cursor-pointer"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>Benchmarking...</span>
                            </span>
                          ) : (
                            <span>Run Benchmark Audit</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5 uppercase font-medium">Job Description Document</label>
                          <div className="border border-dashed border-radix-border/80 rounded-lg p-5 bg-radix-dark/20 text-center hover:border-indigo-500/50 transition relative">
                            <input
                              type="file"
                              accept=".pdf,.docx,.doc"
                              onChange={e => setJdFile(e.target.files[0])}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {jdFile ? (
                              <div className="space-y-1">
                                <p className="text-xs text-white font-semibold truncate">{jdFile.name}</p>
                                <p className="text-[10px] text-gray-500">{(jdFile.size / 1024).toFixed(1)} KB</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-300">Click or drag company JD</p>
                                <p className="text-[10px] text-gray-500">Supports PDF, DOCX (Max 10MB)</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={handleUploadAndRunCustomJd}
                          disabled={loading || !jdFile}
                          className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg py-2.5 px-4 text-sm transition duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg cursor-pointer"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>Parsing & Running...</span>
                            </span>
                          ) : (
                            <span>Analyze & Audit</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-radix-dark/40 border border-radix-border/40 rounded-lg p-3 text-xs leading-relaxed text-gray-400">
                      Search active Greenhouse and Lever job postings online matching <strong className="text-white">{profileDetail.name}</strong>'s preferred categories and capabilities.
                    </div>

                    <button
                      onClick={handleSearchJobs}
                      disabled={searchLoading}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg py-2.5 px-4 text-sm transition duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {searchLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Discover Roles Online</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {!result && !loading && !searchLoading && jobs.length === 0 && (
                <GlassCard className="flex flex-col items-center justify-center text-center min-h-[380px] text-gray-500 border-dashed border-radix-border">
                  <UserCheck className="w-16 h-16 text-gray-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-400">Ready to Evaluate</h4>
                  <p className="max-w-xs text-sm mt-1">Select a candidate profile and choose a mode to benchmark readiness or find active job openings online.</p>
                </GlassCard>
              )}

              {(loading || searchLoading) && (
                <GlassCard className="flex flex-col items-center justify-center min-h-[380px]">
                  <Loader className="w-12 h-12 text-radix-secondary animate-spin mb-4" />
                  <p className="text-gray-300 font-medium">
                    {parsingJd ? "Parsing Job Description Document using LLM..." : 
                     searchLoading ? "Crawling active job boards via DuckDuckGo..." : 
                     "Running 12-Skill Assessment Matrix..."}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {parsingJd ? "Extracting required company levels" : 
                     searchLoading ? "Scraping technological career channels" : 
                     "Connecting to PostgreSQL and running comparative functions"}
                  </p>
                </GlassCard>
              )}

              {searched && !searchLoading && jobs.length > 0 && !result && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold font-['Outfit'] text-white">Live Job Openings</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Found real openings online matching preferred roles and skills for {profileDetail?.name}</p>
                  </div>

                  <div className="space-y-4">
                    {jobs.map((job, jIdx) => (
                      <GlassCard key={jIdx} className="p-5 border-l-4 border-l-cyan-500 hover:border-cyan-400 transition duration-150">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                                {job.company}
                              </span>
                              {job.source && (
                                <span className="text-[9px] font-semibold text-gray-400 bg-radix-border/40 px-2 py-0.5 rounded border border-radix-border/20">
                                  {job.source}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-base text-white mt-2">{job.job_title}</h4>
                            <p className="text-xs text-gray-400 line-clamp-2 max-w-2xl font-mono leading-relaxed mt-1">{job.snippet}</p>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2 mt-2 sm:mt-0 flex-shrink-0">
                            <button
                              onClick={() => handleDetailedSkillMatch(job)}
                              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-xs font-semibold px-4 py-2 rounded-lg text-white flex items-center gap-1.5 transition shadow-md cursor-pointer"
                            >
                              <Cpu className="w-3.5 h-3.5" />
                              <span>Detailed Match</span>
                            </button>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-xs font-semibold px-4 py-2 rounded-lg text-white flex items-center justify-center gap-1 transition shadow-md"
                            >
                              <span>Apply</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6">
                  {/* Score summary */}
                  <GlassCard className="bg-gradient-to-br from-[#131B2D] to-radix-card border border-radix-border/70 p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* SVG circular progress indicator */}
                      <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle 
                            cx="50" cy="50" r="40" 
                            className="stroke-radix-border fill-transparent" 
                            strokeWidth="8"
                          />
                          {/* Animated foreground ring */}
                          <circle 
                            cx="50" cy="50" r="40" 
                            className={`fill-transparent transition-all duration-1000 ${getScoreBg(result.readiness_score)}`} 
                            strokeWidth="8"
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * result.readiness_score) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-4xl font-extrabold font-['Outfit'] block text-white">{result.readiness_score}%</span>
                          <span className="text-[10px] uppercase text-gray-400 font-medium">Readiness</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-white">Assessment Complete</h4>
                        <p className="text-sm text-gray-400 mt-1 max-w-md leading-relaxed">
                          We mapped {profileDetail?.name}'s skill points against expectations. The candidate satisfies most core segments, but we detected key gaps in the competency categories outlined below.
                        </p>
                        {benchmarkSource === 'upload' && customParsedJd && (
                          <button
                            onClick={handleDeepSkillAnalysisCustomJd}
                            className="mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-xs font-semibold px-4 py-2.5 rounded-lg text-white flex items-center gap-1.5 transition shadow-md cursor-pointer"
                          >
                            <Cpu className="w-3.5 h-3.5 text-purple-200" />
                            <span>Deep Skill Match Analysis</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Readiness Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Categories breakdowns */}
                    <GlassCard>
                      <h4 className="text-lg font-bold text-gray-300 mb-4 border-b border-radix-border/50 pb-2">Readiness Breakdown</h4>
                      <div className="space-y-4">
                        {result.skillset_gap.map((g, idx) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex justify-between font-semibold text-gray-300">
                              <span>{CATEGORY_MAP[g.category_code]} ({g.category_code})</span>
                              <span>Expected level: <strong className="text-white">{g.required_level}</strong></span>
                            </div>
                            
                            <div className="h-2 w-full bg-radix-dark rounded-full overflow-hidden relative border border-radix-border">
                              {/* Required level line indicator */}
                              <div 
                                className="absolute top-0 bottom-0 border-r-2 border-dashed border-gray-400/60 z-10"
                                style={{ left: `${g.required_level * 10}%` }}
                              ></div>
                              {/* Candidate level filler */}
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  g.gap ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                                }`}
                                style={{ width: `${g.candidate_level * 10}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    {/* Skill Gaps Gaskets */}
                    <div className="space-y-6">
                      <GlassCard className="border-l-4 border-l-amber-500">
                        <h4 className="text-lg font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                          <span>Detected Skill Gaps</span>
                        </h4>
                        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                          Candidate has competencies below the required corporate level in these segments:
                        </p>
                        
                        {result.skillset_gap.filter(g => g.gap).length === 0 ? (
                          <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 flex items-center gap-2.5">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-semibold">Perfect alignment! No skills require remediation.</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {result.skillset_gap.filter(g => g.gap).map((g, idx) => (
                              <div key={idx} className="bg-radix-dark/40 border border-radix-border/40 rounded-xl p-3 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-semibold text-gray-200">{CATEGORY_MAP[g.category_code]}</span>
                                  <span className="text-[10px] text-gray-500 ml-2 bg-radix-dark px-1.5 py-0.5 rounded border border-radix-border">
                                    {g.category_code}
                                  </span>
                                </div>
                                <span className="font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                  Current: Lvl {g.candidate_level} / {g.required_level}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </GlassCard>

                      <GlassCard className="border-l-4 border-l-emerald-500">
                        <h4 className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span>Aligned Competencies</span>
                        </h4>
                        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                          Candidate matches or exceeds the required corporate level in these segments:
                        </p>
                        
                        {result.skillset_gap.filter(g => !g.gap).length === 0 ? (
                          <p className="text-xs text-gray-500">No aligned competencies matching the required levels.</p>
                        ) : (
                          <div className="space-y-2">
                            {result.skillset_gap.filter(g => !g.gap).map((g, idx) => (
                              <div key={idx} className="bg-radix-dark/40 border border-radix-border/40 rounded-xl p-2.5 flex justify-between items-center text-xs">
                                <span className="font-semibold text-gray-300">{CATEGORY_MAP[g.category_code]}</span>
                                <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  Lvl {g.candidate_level}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    </div>
                  </div>

                  {/* Live Job Finder inside result view */}
                  <GlassCard className="border-l-4 border-l-cyan-500 bg-cyan-950/5 p-5 mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div>
                        <h4 className="text-md font-semibold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles className="w-5 h-5 text-cyan-400" />
                          <span>Live Role Finder (DuckDuckGo Engine)</span>
                        </h4>
                        <p className="text-gray-400 text-xs mt-0.5">Find live company openings on Greenhouse and Lever matching candidate skills & preferred roles</p>
                      </div>
                      {!searched && (
                        <button
                          onClick={handleSearchJobs}
                          disabled={searchLoading}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition duration-150 shadow-md cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Discover Matching Roles</span>
                        </button>
                      )}
                    </div>

                    {searchLoading && (
                      <div className="flex flex-col items-center justify-center py-10 space-y-2">
                        <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
                        <span className="text-xs text-gray-400">Scraping tech application channels...</span>
                      </div>
                    )}

                    {searched && !searchLoading && jobs.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-6">No matching live postings found. Try updating preferred roles in the Profile Builder.</p>
                    )}

                    {!searchLoading && jobs.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {jobs.map((job, jIdx) => (
                          <div key={jIdx} className="bg-radix-dark/40 rounded-xl p-4 border border-radix-border/40 hover:border-cyan-500/20 transition duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                  {job.company}
                                </span>
                                {job.source && (
                                  <span className="text-[9px] font-semibold text-gray-400 bg-radix-border/40 px-2 py-0.5 rounded border border-radix-border/20">
                                    {job.source}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-sm text-white mt-1.5">{job.job_title}</h5>
                              <p className="text-xs text-gray-400 line-clamp-2 max-w-xl font-mono leading-relaxed mt-1">{job.snippet}</p>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 mt-2 sm:mt-0 flex-shrink-0">
                              <button
                                onClick={() => handleDetailedSkillMatch(job)}
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1 transition shadow-sm cursor-pointer"
                              >
                                <Cpu className="w-3.5 h-3.5" />
                                <span>Detailed Match</span>
                              </button>
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                              >
                                <span>Apply</span>
                                <ArrowRight className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}
        </div>
      </div>

      {/* Index maintenance card */}
      {selectedProfileId && (
        <div className="max-w-xs mt-6">
          <GlassCard className="border-red-500/15 bg-red-950/5">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Index Maintenance</span>
            </h4>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              Clear local vector storage containing embedded job descriptions. This does not impact candidate profile indexes.
            </p>
            <button
              onClick={handleClearJDStore}
              className="w-full bg-red-500/10 hover:bg-red-650/20 border border-red-500/30 hover:border-red-500 text-[11px] font-semibold px-3 py-2 rounded-lg text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Job Index Vector DB</span>
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
