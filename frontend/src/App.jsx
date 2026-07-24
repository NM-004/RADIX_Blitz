import React, { useState, useEffect } from 'react';
import JDAnalytics from './components/JDAnalytics';
import ProfileBuilder from './components/ProfileBuilder';
import TalentCheck from './components/TalentCheck';
import SkillMatching from './components/SkillMatching';
import HistoryDashboard from './components/HistoryDashboard';
import GlassCard from './components/GlassCard';
import { api } from './api';
import { 
  LayoutDashboard, FileText, UserCheck, CheckCircle2, History, Target, Cpu, 
  ArrowRight, Users, CheckSquare, Sparkles, Database, Server
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfile, setActiveProfile] = useState(null);
  const [activeJD, setActiveJD] = useState(null);

  // Home stats
  const [stats, setStats] = useState({
    profiles: 0,
    companies: 0,
    historyChecks: 0
  });

  const loadStats = async () => {
    try {
      const profs = await api.getProfiles();
      const comps = await api.getCompanies();
      const hist = await api.getTalentCheckHistory();
      const matchHist = await api.getSkillMatchHistory();
      
      setStats({
        profiles: profs.length,
        companies: comps.length,
        historyChecks: hist.length + matchHist.length
      });
    } catch (e) {
      console.error("Failed to load statistics on dashboard", e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  // Navigate & Pre-fill helpers
  const handleProfileSelected = (profile) => {
    setActiveProfile(profile);
  };

  const handleJDSelected = (jd) => {
    setActiveJD(jd);
  };

  const navTo = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-radix-dark bg-radix-gradient flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-radix-card/30 border-r border-radix-border/40 p-6 flex flex-col gap-8 md:sticky md:top-0 md:h-screen flex-shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Target className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-['Outfit'] tracking-tight">RADIX</h1>
            <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Talent Match Portal</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 flex-grow">
          <button
            onClick={() => navTo('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 border border-blue-500/30 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/20'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-blue-400" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navTo('jd-analytics')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
              activeTab === 'jd-analytics'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/20'
            }`}
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>JD Analytics</span>
          </button>

          <button
            onClick={() => navTo('profile-builder')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
              activeTab === 'profile-builder'
                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/20'
            }`}
          >
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Profile Builder</span>
          </button>

          <button
            onClick={() => navTo('talent-check')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
              activeTab === 'talent-check'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-500/30 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/20'
            }`}
          >
            <UserCheck className="w-4 h-4 text-purple-400" />
            <span>Talent Check</span>
          </button>

          <button
            onClick={() => navTo('skill-matching')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
              activeTab === 'skill-matching'
                ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Skill Matcher</span>
          </button>

          <button
            onClick={() => navTo('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-slate-500/20 to-slate-500/10 border border-slate-500/30 text-white font-bold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/20'
            }`}
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Audit Logs</span>
          </button>
        </nav>

        {/* Infrastructure Status */}
        <div className="border-t border-radix-border/30 pt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span>Database</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Postgres</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-500">
            <span>Core API</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Server className="w-3.5 h-3.5" />
              <span>Django</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-500">
            <span>Analytics</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              <span>FastAPI</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
        
        {/* Dynamic page content wrapper */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Header / Hero */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-radix-card to-[#121A2A] rounded-3xl p-8 border border-radix-border/50 relative overflow-hidden shadow-glass">
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full"></div>
              
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Welcome to RADIX Talent Match</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold font-['Outfit'] text-white tracking-tight leading-tight">
                  Evaluate Job Readiness Instantly.
                </h2>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                  Map job requirements, parse candidates' resumes, check qualifications against company skillset expectations, and audit missing components on a unified dashboard.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 relative z-10">
                <button
                  onClick={() => navTo('jd-analytics')}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl py-3 px-6 text-sm shadow-md transition duration-200"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <GlassCard hoverEffect={true} className="flex items-center gap-5 border-l-4 border-l-blue-500">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Candidate Profiles</span>
                  <strong className="text-3xl font-extrabold font-['Outfit'] text-white block mt-0.5">{stats.profiles}</strong>
                </div>
              </GlassCard>

              <GlassCard hoverEffect={true} className="flex items-center gap-5 border-l-4 border-l-indigo-500">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Active Companies</span>
                  <strong className="text-3xl font-extrabold font-['Outfit'] text-white block mt-0.5">{stats.companies}</strong>
                </div>
              </GlassCard>

              <GlassCard hoverEffect={true} className="flex items-center gap-5 border-l-4 border-l-cyan-500">
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Assessments Run</span>
                  <strong className="text-3xl font-extrabold font-['Outfit'] text-white block mt-0.5">{stats.historyChecks}</strong>
                </div>
              </GlassCard>
            </div>

            {/* Structured Pipeline Guide */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-['Outfit'] text-white">Talent Matching Workflow</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <GlassCard hoverEffect={true} onClick={() => navTo('jd-analytics')} className="cursor-pointer space-y-3 relative group">
                  <div className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded w-fit uppercase">
                    Step 1
                  </div>
                  <h4 className="font-bold text-base group-hover:text-cyan-300 transition duration-150">JD Analytics</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Parse corporate job requirements to extract 12 competency levels and technology details.
                  </p>
                  {activeJD && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>JD Loaded: {activeJD.role}</span>
                    </div>
                  )}
                </GlassCard>

                <GlassCard hoverEffect={true} onClick={() => navTo('profile-builder')} className="cursor-pointer space-y-3 relative group">
                  <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded w-fit uppercase">
                    Step 2
                  </div>
                  <h4 className="font-bold text-base group-hover:text-indigo-300 transition duration-150">Profile Builder</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Upload resumes to auto-parse details or build candidate skill matrices manually.
                  </p>
                  {activeProfile && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Profile Ready: {activeProfile.name}</span>
                    </div>
                  )}
                </GlassCard>

                <GlassCard hoverEffect={true} onClick={() => navTo('talent-check')} className="cursor-pointer space-y-3 relative group">
                  <div className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded w-fit uppercase">
                    Step 3
                  </div>
                  <h4 className="font-bold text-base group-hover:text-purple-300 transition duration-150">Talent Check</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Audit candidates against standard company expectation baselines and identify gaps.
                  </p>
                </GlassCard>

                <GlassCard hoverEffect={true} onClick={() => navTo('skill-matching')} className="cursor-pointer space-y-3 relative group">
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-fit uppercase">
                    Step 4
                  </div>
                  <h4 className="font-bold text-base group-hover:text-emerald-300 transition duration-150">Skill Matching</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Perform a fuzzy check to compare profile skills directly with specific JD requirements.
                  </p>
                </GlassCard>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'jd-analytics' && (
          <JDAnalytics onJDSelect={handleJDSelected} />
        )}

        {activeTab === 'profile-builder' && (
          <ProfileBuilder onProfileSelect={handleProfileSelected} />
        )}

        {activeTab === 'talent-check' && (
          <TalentCheck activeProfile={activeProfile} />
        )}

        {activeTab === 'skill-matching' && (
          <SkillMatching activeProfile={activeProfile} activeJD={activeJD} />
        )}

        {activeTab === 'history' && (
          <HistoryDashboard />
        )}

      </main>
    </div>
  );
}
