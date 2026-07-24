const DJANGO_BASE_URL = 'http://localhost:8000/api';
const FASTAPI_PARSER_URL = 'http://localhost:8001';
const FASTAPI_EVAL_URL = 'http://localhost:8002';
const FASTAPI_SKILLMATCH_URL = 'http://localhost:8003';

async function def_request(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API request failed on ${url}:`, error);
    throw error;
  }
}

export const api = {
  // Django REST Endpoints
  getCompanies: () => def_request(`${DJANGO_BASE_URL}/companies/`),
  getSamples: () => def_request(`${DJANGO_BASE_URL}/samples/`),
  getProfiles: () => def_request(`${DJANGO_BASE_URL}/profiles/`),
  getProfileDetail: (id) => def_request(`${DJANGO_BASE_URL}/profiles/${id}/`),
  saveProfile: (profileData) => def_request(`${DJANGO_BASE_URL}/profiles/`, {
    method: 'POST',
    body: JSON.stringify(profileData),
  }),
  uploadCV: async (file) => {
    const formData = new FormData();
    formData.append('cv', file);
    const response = await fetch(`${DJANGO_BASE_URL}/profiles/upload-cv/`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('CV upload failed');
    }
    return await response.json();
  },
  getTalentCheckHistory: () => def_request(`${DJANGO_BASE_URL}/history/talent-check/`),
  saveTalentCheckResult: (result) => def_request(`${DJANGO_BASE_URL}/history/talent-check/`, {
    method: 'POST',
    body: JSON.stringify(result),
  }),
  getSkillMatchHistory: () => def_request(`${DJANGO_BASE_URL}/history/skill-match/`),
  saveSkillMatchResult: (result) => def_request(`${DJANGO_BASE_URL}/history/skill-match/`, {
    method: 'POST',
    body: JSON.stringify(result),
  }),

  // FastAPI Parser Service Endpoints (Port 8001)
  parseJD: (filepath, parserType = 'standard') => def_request(`${FASTAPI_PARSER_URL}/parse-jd`, {
    method: 'POST',
    body: JSON.stringify({ filepath, parser_type: parserType }),
  }),
  parseResume: (filepath, parserType = 'standard') => def_request(`${FASTAPI_PARSER_URL}/parse-resume`, {
    method: 'POST',
    body: JSON.stringify({ filepath, parser_type: parserType }),
  }),

  // FastAPI Evaluation & Search Service Endpoints (Port 8002)
  runTalentCheck: (profileSkills, expectations) => def_request(`${FASTAPI_EVAL_URL}/talent-check`, {
    method: 'POST',
    body: JSON.stringify({
      profile: { skills: profileSkills },
      expectations: expectations,
    }),
  }),
  runSkillMatch: (candidateSkills, jdSkills) => def_request(`${FASTAPI_EVAL_URL}/skill-match`, {
    method: 'POST',
    body: JSON.stringify({
      candidate_skills: candidateSkills,
      jd_skills: jdSkills,
    }),
  }),
  findJobs: (preferredRoles, skills) => def_request(`${FASTAPI_EVAL_URL}/find-jobs`, {
    method: 'POST',
    body: JSON.stringify({
      preferred_roles: preferredRoles,
      skills: skills,
      education: ""
    }),
  }),

  // FastAPI Skill Match & Assessments Service Endpoints (Port 8003)
  indexUserProfile: (profileData) => def_request(`${FASTAPI_SKILLMATCH_URL}/index-user-profile`, {
    method: 'POST',
    body: JSON.stringify(profileData),
  }),
  indexJobDescription: (jdData) => def_request(`${FASTAPI_SKILLMATCH_URL}/index-job-description`, {
    method: 'POST',
    body: JSON.stringify(jdData),
  }),
  evaluateDetailedSkillMatch: (profileId, company, role, skills, snippet = "") => def_request(`${FASTAPI_SKILLMATCH_URL}/evaluate-skill-match`, {
    method: 'POST',
    body: JSON.stringify({
      profile_id: profileId,
      company,
      role,
      skills,
      snippet,
    }),
  }),
  clearJDStore: () => def_request(`${FASTAPI_SKILLMATCH_URL}/clear-jd-store`, {
    method: 'POST',
  }),
};
