import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { 
  CheckCircle2, AlertCircle, Link2, Sparkles, HelpCircle, Layers, ArrowUpRight, ShieldCheck, Loader, ChevronRight
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

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const profs = await api.getProfiles();
        setProfiles(profs);

        const data = await api.getSamples();
        setSamples(data);

        // Pre-fill parameters if supplied by parent
        if (activeProfile) {
          setSelectedProfileId(activeProfile.id);
          setProfileDetail(activeProfile);
        }
        if (activeJD) {
          setParsedJD(activeJD);
          setSelectedJDFile(activeJD.source_file);
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

  const handleRunMatch = async () => {
    if (!profileDetail) {
      setError('Please select a candidate profile.');
      return;
    }
    if (!parsedJD) {
      setError('Please select/parse a target Job Description.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // 1. Run matching on FastAPI
      const matchRes = await api.runSkillMatch(profileDetail.skills, parsedJD.skills);
      setResult(matchRes);

      // 2. Fetch full lists of JDs from database to log the matching properly
      // Note: for this hackathon, we create a temporary JDOption in the DB if needed,
      // or we can associate it using the profile history logs.
      // We will look up or simulate the JD ID. We can POST directly to django history:
      // In django views: we need profile_id and jd_id. We can query first if the JD is saved
      // in Postgres, or pass a placeholder uuid. Let's make sure it doesn't fail!
      // In the Django backend views, `jd_id` is required. How do we get `jd_id`?
      // Let's check how `api/views.py` is written:
      // It retrieves `jdId` and updates it. So we need a valid `jdId`.
      // Let's create the JD in Postgres first, or use a default one, or we can make the view
      // automatically upsert the Job Description into the database!
      // Wait, let's look at `api/views.py`'s `skill_match_history` POST view:
      // It does: `res = await db.skillmatchresult.create(data={"profileId": profile_id, "jdId": jd_id, ...})`
      // If `jd_id` doesn't exist, it might error.
      // Wait, can we fetch a saved JD from Postgres first or create one?
      // Yes! Let's verify if we can send a custom command or if we can make the React code create a JobDescription
      // if it doesn't exist, or let's create a JobDescription in Django when we parse!
      // Wait! We can write an endpoint or let's modify the Django backend views.py slightly to automatically
      // register/create the `JobDescription` if the frontend requests a matching.
      // Let's check `api/views.py`: it doesn't have an autoprovision for JobDescription, it expects `jd_id`.
      // Wait! We can modify `api/views.py`'s POST `skill_match` endpoint, or we can query if there is any JobDescription
      // in the database.
      // Wait! Let's think:
      // In `api/views.py`, when we fetch `/api/companies/`, we get the list of companies. And we can create a JobDescription
      // record when running a match, or let's query all existing roles, and create a JobDescription for the matching role!
      // Let's see: in `seed.py`, we created the roles. So we can easily look up the `roleId` and create a `JobDescription`!
      // Let's check: we can write a helper function in React, or let's just make the Django backend view create
      // a JobDescription when the match is logged! This is extremely robust and avoids any missing keys.
      // Let's write the frontend part, and then we will update the Django `views.py` to auto-provision the JobDescription
      // so it never throws an foreign key error.
      
      // Let's send the request. In the request body:
      // we can query standard JDs from the database, or pass a placeholder. Wait, let's provision a JobDescription
      // by querying companies. Since we have company/role name, we can select the matching role and create a JD!
      // Let's check: in the database, we can create a `JobDescription` record using the Django REST API or handle it in the history POST.
      // Let's write the code to create/find a JobDescription.
      
      // Let's see if we can do this in React:
      // First, get the matching roleId from companies list.
      const comp = companies.find(c => c.name === parsedJD.company);
      const role = comp?.roles.find(r => r.title === parsedJD.role || r.title.includes(parsedJD.role));
      
      // If we found a role, let's send that role_id or use a default one.
      // Wait, let's just make Django view automatically find or create a `JobDescription` record based on the `role_id`!
      // Yes! That's much cleaner. I will edit the Django `views.py` to find the role by ID and create/return a `JobDescription` if it's missing,
      // or do it directly inside the history log. I'll make the edit shortly.
      
      let jdId = "";
      // Let's find if a JobDescription exists or create one.
      // Let's pass the roleId and sourceFile to a helper or let Django handle it.
      // For now, let's pass role_id to history. If Django gets role_id instead of jd_id,
      // it can automatically find/create a JobDescription record!
      // Let's modify the payload to include: `profile_id`, `jd_source_file` (like sourceFile), `company`, `role_title`, and `match_score`.
      // Let's check how we can write this.
      
      // We will adjust the api call:
      await api.saveSkillMatchResult({
        profile_id: profileDetail.id,
        jd_id: role?.id || "placeholder-role-id", // We will let Django handle this!
        jd_source_file: parsedJD.source_file,
        company_name: parsedJD.company,
        role_title: parsedJD.role,
        match_score: matchRes.match_score,
        matched_skills: matchRes.matched_skills,
        missing_skills: matchRes.missing_skills
      });
      
    } catch (err) {
      setError(err.message || 'Matching failed. Check that services are online.');
    } finally {
      setLoading(false);
    }
  };

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

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase font-medium">Target JD</label>
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
            </div>

            <button
              onClick={handleRunMatch}
              disabled={loading || !selectedProfileId || !parsedJD}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-semibold rounded-lg py-3 px-4 text-sm transition duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg"
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
              
              {/* Header card with match percentage */}
              <GlassCard className="bg-gradient-to-br from-[#121E36] to-[#0D1627] border border-cyan-900/30 p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  
                  {/* SVG progress circle */}
                  <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="40" 
                        className="stroke-radix-border fill-transparent" 
                        strokeWidth="8"
                      />
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
                      <span className="text-4xl font-extrabold font-['Outfit'] block text-white">{result.match_score}%</span>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Skill Match</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div>
                      <span className="text-xs uppercase text-radix-cyan font-semibold tracking-wider">Semantic Assessment</span>
                      <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">
                        {profileDetail?.name} vs {parsedJD?.role}
                      </h3>
                      <p className="text-gray-400 text-sm mt-0.5">
                        Target Posting: <strong className="text-white">{parsedJD?.company}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1.5 bg-radix-dark px-3 py-1.5 rounded-lg border border-radix-border">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Matched Requirements: {result.matched_skills.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-radix-dark px-3 py-1.5 rounded-lg border border-radix-border">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span className="font-semibold text-rose-300">Missing Requirements: {result.missing_skills.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Matched Skills */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-300">Matching Competencies</h4>
                {result.matched_skills.length === 0 ? (
                  <GlassCard className="text-center py-6 text-gray-500">No overlapping skills found.</GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.matched_skills.map((m, idx) => (
                      <GlassCard key={idx} className="p-4 border-l-4 border-l-emerald-500 bg-emerald-950/5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold text-white">{m.required_skill}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {CATEGORY_NAMES[m.category_code] || m.category_code}
                          </span>
                        </div>
                        <div className="space-y-1 mt-2 text-xs text-gray-400">
                          <div className="flex justify-between">
                            <span>Matched Candidate Skill:</span>
                            <span className="text-white font-medium">{m.candidate_skill}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Candidate Level vs Required:</span>
                            <span className="text-white font-mono font-semibold">Lvl {m.candidate_level} / Lvl {m.required_level}</span>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing Skills */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-300">Gaps & Missing Requirements</h4>
                {result.missing_skills.length === 0 ? (
                  <GlassCard className="text-center py-6 text-gray-500 flex items-center justify-center gap-2">
                    <ShieldCheck className="text-emerald-400 w-5 h-5" />
                    <span className="text-gray-300 font-semibold">Candidate meets 100% of the parsed JD requirements!</span>
                  </GlassCard>
                ) : (
                  <div className="space-y-3">
                    {result.missing_skills.map((m, idx) => (
                      <GlassCard key={idx} className="p-4 border-l-4 border-l-rose-500 bg-rose-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{m.required_skill}</span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {CATEGORY_NAMES[m.category_code] || m.category_code}
                            </span>
                            <span className="text-[10px] bg-radix-dark text-gray-400 px-1.5 py-0.5 rounded border border-radix-border">
                              Required: Lvl {m.required_level}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2 font-mono italic">
                            {m.recommendation}
                          </p>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
