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

const getSafeString = (val, fallback = 'N/A') => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.name || val.title || val.role || val.company || fallback;
  }
  return String(val);
};

const cleanEvidence = (text) => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text
    .replace(/^(\.\.\.|\s|•|-)+/g, '')
    .replace(/(\.\.\.|\s)+$/g, '')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export default function JDAnalytics({ onJDSelect }) {
  const [samples, setSamples] = useState({ jds: [], resumes: [] });
  const [selectedJD, setSelectedJD] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [parserMode, setParserMode] = useState('standard'); // 'standard' or 'advanced'

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

  const handleParse = async (filepath, mode = parserMode) => {
    setLoading(true);
    setError('');
    setParsedData(null);
    try {
      const data = await api.parseJD(filepath, mode);
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
      handleParse(val, parserMode);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a PDF or DOCX file to upload.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploadRes = await api.uploadCV(uploadFile);
      const savedPath = uploadRes.path;
      await handleParse(savedPath, parserMode);
    } catch (err) {
      setError(err.message || 'Failed to upload custom file.');
    } finally {
      setUploading(false);
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
            <span>Select Target JD</span>
          </h3>
          
          <div className="space-y-4">
            {/* Parser Mode Toggle */}
            <div className="bg-radix-dark/40 rounded-xl p-3 border border-radix-border/40">
              <span className="block text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Parsing Intelligence</span>
              <div className="grid grid-cols-2 rounded-lg border border-radix-border/80 p-0.5 bg-radix-dark/80">
                <button
                  type="button"
                  onClick={() => setParserMode('standard')}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition ${
                    parserMode === 'standard' 
                      ? 'bg-cyan-600 text-white shadow-sm' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setParserMode('advanced')}
                  className={`py-1.5 text-[11px] font-semibold rounded-md transition flex items-center justify-center gap-1 ${
                    parserMode === 'advanced' 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  <span>Advanced XML</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase font-medium">Sample JDs</label>
              <select 
                className="w-full glass-input text-sm"
                value={selectedJD}
                onChange={handleSelectSample}
              >
                <option value="">-- Select a sample --</option>
                {samples.jds.map((jd, idx) => (
                  <option key={idx} value={jd.path}>
                    {getSafeString(jd.company)} - {getSafeString(jd.role)} ({jd.file_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-radix-border"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase">Or</span>
              <div className="flex-grow border-t border-radix-border"></div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <label className="block text-sm text-gray-400 font-medium">Upload Custom JD Document</label>
              <input 
                type="file" 
                accept=".pdf,.docx"
                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-300 hover:file:bg-cyan-500/20 border border-radix-border rounded-xl p-1.5 bg-radix-dark/40"
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              <button 
                type="submit" 
                disabled={uploading || !uploadFile}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg py-2.5 px-4 text-sm transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Uploading & Parsing File...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Upload & Parse Document</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </GlassCard>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {loading && (
            <GlassCard className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader className="w-12 h-12 text-radix-cyan animate-spin mb-4" />
              <p className="text-gray-300 font-medium">
                {parserMode === 'advanced' 
                  ? "Running Advanced Parser (Converting PDF to DOCX + Parsing layout XML + Structuring via Gemini AI)..." 
                  : "Parsing JD text..."}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                {parserMode === 'advanced' 
                  ? "Translating layout positioning XML structures" 
                  : "Mapping requirements onto 12-skillset framework"}
              </p>
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
              <p className="max-w-xs text-sm mt-1">Select a sample or upload a document file to parse skills and requirements.</p>
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
                    <h3 className="text-2xl font-bold font-['Outfit'] mt-2 text-white">{getSafeString(parsedData.role, 'Software Engineer')}</h3>
                    <p className="text-gray-400 flex items-center gap-1 text-sm mt-0.5">
                      <span>at</span>
                      <span className="text-white font-medium">{getSafeString(parsedData.company, 'Tech Company')}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Source File</span>
                    <span className="text-xs text-gray-300 font-mono block truncate max-w-[200px] md:max-w-xs">{getSafeString(parsedData.source_file, 'Document')}</span>
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
                          <div key={sIdx} className="bg-radix-dark/40 rounded-xl p-3.5 border border-radix-border/40 hover:border-radix-cyan/20 transition duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-sm text-gray-200">{getSafeString(skill.skill_name, 'Skill')}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Confidence:</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                  skill.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  skill.confidence === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {skill.confidence || 'medium'}
                                </span>
                                {skill.level && (
                                  <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800/30 px-1.5 py-0.5 rounded font-mono">
                                    Req: Lvl {skill.level}
                                  </span>
                                )}
                              </div>
                            </div>
                            {cleanEvidence(skill.evidence) && (
                              <div className="mt-2.5 p-3 rounded-xl bg-[#0b121e] border border-cyan-900/30 text-xs leading-relaxed font-sans flex items-start gap-2 shadow-inner">
                                <span className="text-cyan-400 font-bold select-none text-sm mt-0.5">•</span>
                                <div className="flex-1">
                                  <span className="text-[10px] text-cyan-400/80 uppercase font-semibold tracking-wider block mb-0.5 font-mono">Role Requirement Evidence</span>
                                  <p className="text-gray-200 font-normal text-xs leading-relaxed">{cleanEvidence(skill.evidence)}</p>
                                </div>
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
