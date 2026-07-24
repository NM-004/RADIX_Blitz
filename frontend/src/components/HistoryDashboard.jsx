import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { 
  History, Calendar, User, Briefcase, Award, FileText, ChevronRight, Activity, Trash2, Loader
} from 'lucide-react';

export default function HistoryDashboard() {
  const [talentHistory, setTalentHistory] = useState([]);
  const [skillHistory, setSkillHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('talent'); // 'talent' or 'skill'

  useEffect(() => {
    async function loadHistory() {
      try {
        const talData = await api.getTalentCheckHistory();
        setTalentHistory(talData);
        
        const skData = await api.getSkillMatchHistory();
        setSkillHistory(skData);
      } catch (err) {
        console.error("Failed to fetch history logs", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getScoreBadge = (score) => {
    let color = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (score >= 80) color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    else if (score >= 60) color = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
        {score}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-['Outfit'] text-gradient-purple flex items-center gap-2">
          <History className="w-8 h-8 text-radix-secondary" />
          <span>Audit History Log</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">Review historical talent readiness audits and job-description fit checks</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-radix-border/40 pb-3">
        <button
          onClick={() => setActiveTab('talent')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'talent' 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/30'
          }`}
        >
          Talent Benchmark Checks
        </button>
        <button
          onClick={() => setActiveTab('skill')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'skill' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-radix-card/30'
          }`}
        >
          JD Skill Matches
        </button>
      </div>

      {loading ? (
        <GlassCard className="flex flex-col items-center justify-center min-h-[300px]">
          <Loader className="w-12 h-12 text-radix-secondary animate-spin mb-4" />
          <p className="text-gray-300 font-medium">Fetching historical logs from PostgreSQL...</p>
        </GlassCard>
      ) : (
        <div>
          {activeTab === 'talent' && (
            <div className="space-y-4">
              {talentHistory.length === 0 ? (
                <GlassCard className="text-center py-12 text-gray-500 border-dashed border-radix-border">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-pulse" />
                  <p className="font-semibold text-sm">No Talent Checks logged yet</p>
                  <p className="text-xs text-gray-500 mt-1">Run a benchmark comparison on the Talent Check tab to see entries here.</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {talentHistory.map((item) => (
                    <GlassCard key={item.id} hoverEffect={true} className="p-5 border-l-4 border-l-radix-secondary/70">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-radix-dark/60 p-2.5 rounded-xl border border-radix-border/40">
                            <User className="w-6 h-6 text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-white">{item.candidate_name}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                              <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                              <span>{item.company_name}</span>
                              <ChevronRight className="w-3 h-3 text-gray-600" />
                              <span className="text-indigo-300 font-medium">{item.role_title}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-radix-border/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Readiness Score:</span>
                            {getScoreBadge(item.readiness_score)}
                          </div>
                          
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-gray-600" />
                            <span>{formatDate(item.checked_at)}</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'skill' && (
            <div className="space-y-4">
              {skillHistory.length === 0 ? (
                <GlassCard className="text-center py-12 text-gray-500 border-dashed border-radix-border">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-pulse" />
                  <p className="font-semibold text-sm">No Skill Matches logged yet</p>
                  <p className="text-xs text-gray-500 mt-1">Run a Job Description alignment fit check on the Skill Matching tab to see entries here.</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {skillHistory.map((item) => (
                    <GlassCard key={item.id} hoverEffect={true} className="p-5 border-l-4 border-l-radix-cyan/70">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-radix-dark/60 p-2.5 rounded-xl border border-radix-border/40">
                            <FileText className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-white">{item.candidate_name}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                              <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                              <span>{item.company_name}</span>
                              <ChevronRight className="w-3 h-3 text-gray-600" />
                              <span className="text-cyan-300 font-medium">{item.role_title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 mt-1 block">File: {item.jd_file}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-radix-border/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Match score:</span>
                            {getScoreBadge(item.match_score)}
                          </div>
                          
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-gray-600" />
                            <span>{formatDate(item.matched_at)}</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
