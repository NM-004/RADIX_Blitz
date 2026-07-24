import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { 
  Building, UserCheck, AlertCircle, CheckCircle2, TrendingUp, HelpCircle, ArrowRight, ShieldAlert, Sparkles, Loader
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

export default function TalentCheck({ activeProfile, activeCompanyRole }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profileDetail, setProfileDetail] = useState(null);
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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
  };

  const getActiveRoles = () => {
    const comp = companies.find(c => c.id === selectedCompanyId);
    return comp ? comp.roles : [];
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
              disabled={loading || !selectedProfileId || !selectedRoleId}
              className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg py-3 px-4 text-sm transition duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Computing Metrics...</span>
                </span>
              ) : (
                <span>Run Talent Check</span>
              )}
            </button>
          </div>
        </GlassCard>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {!result && !loading && (
            <GlassCard className="flex flex-col items-center justify-center text-center min-h-[350px] text-gray-500 border-dashed border-radix-border">
              <UserCheck className="w-16 h-16 text-gray-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-400">Ready to Evaluate</h4>
              <p className="max-w-xs text-sm mt-1">Select a candidate profile and target company to benchmark overall 12-skill competency alignment.</p>
            </GlassCard>
          )}

          {loading && (
            <GlassCard className="flex flex-col items-center justify-center min-h-[350px]">
              <Loader className="w-12 h-12 text-radix-secondary animate-spin mb-4" />
              <p className="text-gray-300 font-medium">Running 12-Skill Assessment Matrix...</p>
              <p className="text-gray-500 text-xs mt-2">Connecting to PostgreSQL and running comparative functions</p>
            </GlassCard>
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
                      <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Readiness</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <div>
                      <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Talent Check Audit</span>
                      <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">
                        {profileDetail?.name} vs {companies.find(c => c.id === selectedCompanyId)?.name}
                      </h3>
                      <p className="text-indigo-400 font-medium text-sm mt-0.5">
                        Target Role: {companies.find(c => c.id === selectedCompanyId)?.roles.find(r => r.id === selectedRoleId)?.title}
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1.5 bg-radix-dark px-3 py-1.5 rounded-lg border border-radix-border">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Matches: {result.skillset_gap.filter(g => !g.gap).length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-radix-dark px-3 py-1.5 rounded-lg border border-radix-border">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="font-semibold text-rose-300">Gaps Detected: {result.skillset_gap.filter(g => g.gap).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Skillset Gap Details */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-300">12-Skill Benchmark Breakdown</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.skillset_gap.map((g, idx) => (
                    <GlassCard key={idx} className="p-4 border-l-4 border-l-radix-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-semibold text-white">
                            {CATEGORY_MAP[g.category_code]}
                          </span>
                          <span className="block text-[10px] text-gray-500 font-mono mt-0.5">{g.category_code}</span>
                        </div>
                        {g.gap ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-bold">
                            <ShieldAlert className="w-3 h-3" />
                            <span>GAP</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>READY</span>
                          </span>
                        )}
                      </div>

                      {/* Bar Visualization */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-gray-400">
                          <span>Candidate Level: <strong className="text-white">{g.candidate_level}</strong></span>
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
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* Recommendations Card */}
              {result.skillset_gap.some(g => g.gap) && (
                <GlassCard className="border-l-4 border-l-indigo-500">
                  <h4 className="text-md font-semibold text-indigo-300 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <span>Closing the Readiness Gaps</span>
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed mb-3">
                    To reach the standard expectations for this role, we recommend working on the following categories:
                  </p>
                  <ul className="space-y-2 text-xs">
                    {result.skillset_gap.filter(g => g.gap).map((g, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-300">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          Boost <strong className="text-indigo-200">{CATEGORY_MAP[g.category_code]}</strong> from Level <strong>{g.candidate_level}</strong> to at least <strong>{g.required_level}</strong>.
                        </span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
