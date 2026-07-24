import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { FileText, Cpu, AlertTriangle, Loader, CheckCircle2, ChevronRight } from 'lucide-react';

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
  OTHER: 'Named Technologies / General'
};

export default function JDAnalytics({ onJDSelect }) {
  const [samples, setSamples] = useState({ jds: [], resumes: [] });
  const [selectedJD, setSelectedJD] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    async function loadSamples() {
      try {
        const data = await api.getSamples();
        setSamples(data);
      } catch (err) {
        console.error("Failed to load sample JDs", err);
      }
    }
    loadSamples();
  }, []);

  const handleParse = async (filepath) => {
    setLoading(true);
    setError('');
    setParsedData(null);
    try {
      const data = await api.parseJD(filepath);
      setParsedData(data);
      if (onJDSelect) {
        // Expose parsed JD upstream for matching
        onJDSelect(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to parse Job Description. Please verify the service is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (e) => {
    const val = e.target.value;
    setSelectedJD(val);
    if (val) {
      handleParse(val);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customPath.trim()) {
      handleParse(customPath.trim());
    }
  };

  // Group skills by category
  const skillsByCategory = parsedData
    ? parsedData.skills.reduce((acc, skill) => {
        const cat = skill.category_code;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(skill);
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold font-['Outfit'] text-gradient-cyan">JD Analytics</h2>
          <p className="text-gray-400 text-sm mt-1">Extract structured skillset profiles from job descriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector Panel */}
        <GlassCard className="lg:col-span-1 h-fit">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="text-radix-cyan" />
            <span>Select Job Description</span>
          </h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Choose Sample JD</label>
              <select 
                className="w-full glass-input"
                value={selectedJD}
                onChange={handleSelectSample}
              >
                <option value="">-- Select a sample --</option>
                {samples.jds.map((jd, idx) => (
                  <option key={idx} value={jd.path}>
                    {jd.company} - {jd.role} ({jd.file_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-radix-border"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase">Or</span>
              <div className="flex-grow border-t border-radix-border"></div>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <label className="block text-sm text-gray-400">Custom JD File Path</label>
              <input 
                type="text" 
                className="w-full glass-input text-xs" 
                placeholder="e.g. D:/files/job_desc.docx"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
              />
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg py-2 px-4 text-sm transition duration-200"
              >
                Parse Custom File
              </button>
            </form>
          </div>
        </GlassCard>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {loading && (
            <GlassCard className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader className="w-12 h-12 text-radix-cyan animate-spin mb-4" />
              <p className="text-gray-300 font-medium">Parsing JD text...</p>
              <p className="text-gray-500 text-xs mt-2">Mapping requirements onto 12-skillset framework</p>
            </GlassCard>
          )}

          {error && (
            <GlassCard className="border-red-500/20 bg-red-950/10 min-h-[300px] flex flex-col items-center justify-center text-center p-6">
              <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
              <h4 className="text-lg font-semibold text-red-200">Processing Failed</h4>
              <p className="text-red-300/80 max-w-md text-sm mt-1">{error}</p>
            </GlassCard>
          )}

          {!loading && !error && !parsedData && (
            <GlassCard className="flex flex-col items-center justify-center text-center min-h-[300px] text-gray-500 p-8 border-dashed border-radix-border">
              <FileText className="w-16 h-16 text-gray-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-400">No Job Description Analyzed</h4>
              <p className="max-w-xs text-sm mt-1">Select a sample or enter a custom path to parse skills and requirements.</p>
            </GlassCard>
          )}

          {!loading && !error && parsedData && (
            <div className="space-y-6">
              {/* JD Metadata Card */}
              <GlassCard className="bg-gradient-to-br from-radix-card to-[#121A2A]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wide">
                      JD Extracted
                    </span>
                    <h3 className="text-2xl font-bold font-['Outfit'] mt-2 text-white">{parsedData.role}</h3>
                    <p className="text-gray-400 flex items-center gap-1 text-sm mt-0.5">
                      <span>at</span>
                      <span className="text-white font-medium">{parsedData.company}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Source File</span>
                    <span className="text-xs text-gray-300 font-mono block truncate max-w-[200px] md:max-w-xs">{parsedData.source_file}</span>
                  </div>
                </div>
              </GlassCard>

              {/* Skills Breakdown */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-300">Required Skills Overview</h4>
                
                {Object.keys(skillsByCategory).length === 0 ? (
                  <GlassCard className="text-center py-8 text-gray-500">
                    No skills could be categorized. Try another file.
                  </GlassCard>
                ) : (
                  Object.entries(skillsByCategory).map(([catCode, skills]) => (
                    <GlassCard key={catCode} className="border-l-4 border-l-radix-cyan/70">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gradient-cyan">
                          {CATEGORY_NAMES[catCode] || catCode}
                        </span>
                        <span className="text-xs font-mono text-gray-500 bg-radix-dark px-2 py-0.5 rounded border border-radix-border">
                          {catCode}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {skills.map((skill, sIdx) => (
                          <div key={sIdx} className="bg-radix-dark/40 rounded-xl p-3 border border-radix-border/40 hover:border-radix-cyan/20 transition duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-sm text-gray-200">{skill.skill_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Confidence:</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  skill.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  skill.confidence === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {skill.confidence}
                                </span>
                                {skill.level && (
                                  <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800/30 px-1.5 py-0.5 rounded font-mono">
                                    Req: Lvl {skill.level}
                                  </span>
                                )}
                              </div>
                            </div>
                            {skill.evidence && (
                              <div className="text-xs text-gray-400 italic bg-[#0d1421] p-2 rounded-lg border border-radix-border/30 mt-2 font-mono leading-relaxed">
                                {skill.evidence}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
