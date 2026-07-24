import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GlassCard from './GlassCard';
import { 
  User, Mail, GraduationCap, Code, Plus, Trash2, Save, Upload, 
  Loader, CheckCircle2, AlertCircle, PlusCircle, Bookmark, ShieldCheck, Cpu
} from 'lucide-react';

const CATEGORIES = [
  { code: 'COD', name: 'Coding' },
  { code: 'DSA', name: 'Data Structures & Algorithms' },
  { code: 'OOD', name: 'Object-Oriented Design' },
  { code: 'APTI', name: 'Aptitude' },
  { code: 'COMM', name: 'Communication' },
  { code: 'AI', name: 'Artificial Intelligence' },
  { code: 'CLOUD', name: 'Cloud Computing' },
  { code: 'SQL', name: 'SQL & Databases' },
  { code: 'SWE', name: 'Software Engineering Practices' },
  { code: 'SYSD', name: 'System Design' },
  { code: 'NETW', name: 'Networking' },
  { code: 'OS', name: 'Operating Systems' },
  { code: 'OTHER', name: 'Named Technologies / Other' }
];

export default function ProfileBuilder({ onProfileSelect }) {
  const [samples, setSamples] = useState({ jds: [], resumes: [] });
  const [selectedResume, setSelectedResume] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Form State
  const [profileId, setProfileId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [education, setEducation] = useState('');
  const [cvFile, setCvFile] = useState('');
  
  const [skills, setSkills] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [internships, setInternships] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [preferredRoles, setPreferredRoles] = useState([]);

  // Tag Inputs state
  const [newHackathon, setNewHackathon] = useState('');
  const [newInternship, setNewInternship] = useState('');
  const [newCert, setNewCert] = useState('');
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    async function loadSamples() {
      try {
        const data = await api.getSamples();
        setSamples(data);
      } catch (err) {
        console.error("Failed to load sample resumes", err);
      }
    }
    loadSamples();
  }, []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  };

  // Pre-fill from resume parser
  const handleParseResume = async (filepath) => {
    setParsing(true);
    showMsg('info', 'Parsing resume content and extracting technical indicators...');
    try {
      const data = await api.parseResume(filepath);
      
      // Update form states with parsed data
      setName(data.name || '');
      setEmail(data.email || '');
      setEducation(data.education || '');
      setCvFile(data.cv_file || filepath);
      setHackathons(data.hackathons || []);
      setInternships(data.internships || []);
      setCertifications(data.certifications || []);
      setPreferredRoles(data.preferred_roles || []);
      
      // Map skills
      const mappedSkills = (data.skills || []).map(s => ({
        skill_name: s.skill_name,
        category_code: s.category_code,
        evidence: s.evidence || '',
        confidence: s.confidence || 'medium',
        level: s.level || 5
      }));
      setSkills(mappedSkills);
      
      showMsg('success', 'Resume parsed successfully! Review the pre-filled profile details below.');
    } catch (err) {
      showMsg('error', `Failed to parse resume: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleSelectSample = (e) => {
    const val = e.target.value;
    setSelectedResume(val);
    if (val) {
      handleParseResume(val);
    }
  };

  // CV Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setParsing(true);
    showMsg('info', 'Uploading file and analyzing structure...');
    try {
      // 1. Upload CV to Django
      const uploadRes = await api.uploadCV(file);
      // 2. Parse the uploaded CV via FastAPI using the saved path
      await handleParseResume(uploadRes.path);
    } catch (err) {
      showMsg('error', `Upload or parsing failed: ${err.message}`);
      setParsing(false);
    }
  };

  // Save Profile to Postgres
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      showMsg('error', 'Name and Email are required.');
      return;
    }
    
    setSaving(true);
    try {
      const profileData = {
        name,
        email,
        education,
        cv_file: cvFile,
        skills,
        hackathons,
        internships,
        certifications,
        preferred_roles: preferredRoles
      };
      const res = await api.saveProfile(profileData);
      setProfileId(res.id);
      
      // Fetch full profile detail back to confirm
      const detailedProfile = await api.getProfileDetail(res.id);
      if (onProfileSelect) {
        onProfileSelect(detailedProfile);
      }
      
      showMsg('success', 'Profile saved successfully to PostgreSQL database!');
    } catch (err) {
      showMsg('error', `Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Add & Remove Helpers for tags
  const addTag = (val, list, setList, clearInput) => {
    if (val.trim() && !list.includes(val.trim())) {
      setList([...list, val.trim()]);
      clearInput('');
    }
  };

  const removeTag = (index, list, setList) => {
    setList(list.filter((_, i) => i !== index));
  };

  // Skills handlers
  const handleAddSkill = () => {
    setSkills([...skills, {
      skill_name: '',
      category_code: 'COD',
      evidence: '',
      confidence: 'medium',
      level: 5
    }]);
  };

  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSkillChange = (index, field, value) => {
    const updated = [...skills];
    updated[index][field] = value;
    setSkills(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-['Outfit'] text-gradient-purple">Profile Builder</h2>
        <p className="text-gray-400 text-sm mt-1">Populate candidate profile manually, or parse directly from a resume</p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
          msg.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' :
          msg.type === 'error' ? 'bg-red-950/20 border-red-500/20 text-red-300' :
          'bg-indigo-950/20 border-indigo-500/20 text-indigo-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
           msg.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> :
           <Loader className="w-5 h-5 animate-spin text-indigo-400" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Parsing Selector Panel */}
      <GlassCard className="bg-gradient-to-r from-radix-card to-[#121A2A]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Cpu className="text-radix-secondary" />
              <span>Resume Auto-Parsing</span>
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Accelerate profile creation. Select one of the 4 preloaded test candidates to instantly simulate resume parsing, or upload your own file.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-end">
            <div className="flex-1 max-w-xs">
              <select
                className="w-full glass-input"
                value={selectedResume}
                onChange={handleSelectSample}
                disabled={parsing}
              >
                <option value="">-- Load Sample Resume --</option>
                {samples.resumes?.map((r, idx) => (
                  <option key={idx} value={r.path}>
                    {r.candidate_name} ({r.file_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input
                type="file"
                id="resume-upload"
                className="hidden"
                accept=".pdf,.docx,.doc"
                onChange={handleFileUpload}
                disabled={parsing}
              />
              <label
                htmlFor="resume-upload"
                className={`flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg py-2.5 px-4 text-sm cursor-pointer transition duration-200 ${
                  parsing ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload CV</span>
              </label>
            </div>
          </div>
        </div>
      </GlassCard>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Basic Details & Tags */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard>
              <h3 className="text-lg font-semibold mb-4 border-b border-radix-border pb-2 flex items-center gap-2">
                <User className="text-radix-primary w-5 h-5" />
                <span>Candidate Bio</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      className="w-full glass-input pl-9 text-sm" 
                      placeholder="Ananya Rao" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="email" 
                      className="w-full glass-input pl-9 text-sm" 
                      placeholder="ananya.rao@example.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">Education & Credentials</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      className="w-full glass-input pl-9 text-sm" 
                      placeholder="B.Tech Computer Science, IIT Bombay" 
                      value={education} 
                      onChange={(e) => setEducation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Portfolios and Preferences */}
            <GlassCard>
              <h3 className="text-lg font-semibold mb-4 border-b border-radix-border pb-2 flex items-center gap-2">
                <Bookmark className="text-radix-secondary w-5 h-5" />
                <span>Signal Builder</span>
              </h3>

              <div className="space-y-4 text-sm">
                {/* Preferred Roles */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Preferred Roles</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-grow glass-input py-1 text-xs" 
                      placeholder="e.g. Data Scientist" 
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => addTag(newRole, preferredRoles, setPreferredRoles, setNewRole)}
                      className="bg-radix-border hover:bg-radix-border/80 border border-radix-border p-2 rounded-lg text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {preferredRoles.map((role, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                        <span>{role}</span>
                        <Trash2 className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => removeTag(i, preferredRoles, setPreferredRoles)} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hackathons */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hackathons</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-grow glass-input py-1 text-xs" 
                      placeholder="e.g. Radix Talent Hack" 
                      value={newHackathon}
                      onChange={e => setNewHackathon(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => addTag(newHackathon, hackathons, setHackathons, setNewHackathon)}
                      className="bg-radix-border hover:bg-radix-border/80 border border-radix-border p-2 rounded-lg text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hackathons.map((h, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                        <span className="truncate max-w-[120px]">{h}</span>
                        <Trash2 className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => removeTag(i, hackathons, setHackathons)} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Certifications</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-grow glass-input py-1 text-xs" 
                      placeholder="e.g. AWS Solutions Architect" 
                      value={newCert}
                      onChange={e => setNewCert(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => addTag(newCert, certifications, setCertifications, setNewCert)}
                      className="bg-radix-border hover:bg-radix-border/80 border border-radix-border p-2 rounded-lg text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {certifications.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                        <span className="truncate max-w-[120px]">{c}</span>
                        <Trash2 className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => removeTag(i, certifications, setCertifications)} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Internships */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Internships & Roles</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-grow glass-input py-1 text-xs" 
                      placeholder="e.g. ML Intern, Microsoft" 
                      value={newInternship}
                      onChange={e => setNewInternship(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={() => addTag(newInternship, internships, setInternships, setNewInternship)}
                      className="bg-radix-border hover:bg-radix-border/80 border border-radix-border p-2 rounded-lg text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {internships.map((int, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
                        <span className="truncate max-w-[120px]">{int}</span>
                        <Trash2 className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => removeTag(i, internships, setInternships)} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Skills mapping lists */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="min-h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-radix-border pb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Code className="text-radix-accent w-5 h-5" />
                  <span>Mapped Skills & Levels (12-Skillset Framework)</span>
                </h3>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="flex items-center gap-1 text-xs text-radix-cyan hover:text-radix-cyan/80 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-1.5 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Skill</span>
                </button>
              </div>

              {skills.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-500 py-8 border-dashed border border-radix-border rounded-xl">
                  <Code className="w-12 h-12 text-gray-600 mb-2 animate-pulse" />
                  <p className="font-semibold text-sm">No skills mapped yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs text-center">Add skills manually or extract from a CV/Resume above to populate this grid.</p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                  {skills.map((skill, idx) => (
                    <div 
                      key={idx} 
                      className="bg-radix-dark/40 border border-radix-border/40 rounded-xl p-4 space-y-3 relative hover:border-radix-primary/20 transition group"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(idx)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Skill Name */}
                        <div>
                          <label className="block text-[10px] text-gray-500 font-medium uppercase mb-1">Skill / Technology Name</label>
                          <input
                            type="text"
                            className="w-full glass-input py-1.5 text-xs font-semibold"
                            placeholder="e.g. Python Core, TensorFlow, Docker"
                            value={skill.skill_name}
                            onChange={(e) => handleSkillChange(idx, 'skill_name', e.target.value)}
                            required
                          />
                        </div>

                        {/* Category Select */}
                        <div>
                          <label className="block text-[10px] text-gray-500 font-medium uppercase mb-1">RADIX Competency Category</label>
                          <select
                            className="w-full glass-input py-1.5 text-xs"
                            value={skill.category_code}
                            onChange={(e) => handleSkillChange(idx, 'category_code', e.target.value)}
                          >
                            {CATEGORIES.map(c => (
                              <option key={c.code} value={c.code}>
                                {c.code} - {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Level and Confidence */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                        <div className="sm:col-span-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 font-medium uppercase">Competency Level</span>
                            <span className="text-xs font-mono font-bold text-radix-primary">Level {skill.level} / 10</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            className="w-full h-1.5 bg-radix-border rounded-lg appearance-none cursor-pointer accent-radix-primary"
                            value={skill.level}
                            onChange={(e) => handleSkillChange(idx, 'level', parseInt(e.target.value))}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 font-medium uppercase mb-1">Confidence Indicator</label>
                          <select
                            className="w-full glass-input py-1.5 text-xs"
                            value={skill.confidence}
                            onChange={(e) => handleSkillChange(idx, 'confidence', e.target.value)}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>

                      {/* Evidence */}
                      <div>
                        <label className="block text-[10px] text-gray-500 font-medium uppercase mb-1">Extract / Citation (Evidence)</label>
                        <textarea
                          rows="1"
                          className="w-full glass-input py-1.5 text-xs font-mono"
                          placeholder="e.g. Project 'AptFit' utilized Django for full REST backend, deployed with Gunicorn on GCP"
                          value={skill.evidence}
                          onChange={(e) => handleSkillChange(idx, 'evidence', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-6 border-t border-radix-border/30 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg py-2.5 px-6 text-sm shadow-md transition duration-200"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Candidate Profile</span>
                </button>
              </div>
            </GlassCard>
          </div>
          
        </div>
      </form>
    </div>
  );
}
