const DJANGO_BASE_URL = 'http://localhost:8000/api';
const FASTAPI_BASE_URL = 'http://localhost:8001';

async def_request(url, options = {}) {
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

  // FastAPI Microservice Endpoints
  parseJD: (filepath) => def_request(`${FASTAPI_BASE_URL}/parse-jd`, {
    method: 'POST',
    body: JSON.stringify({ filepath }),
  }),
  parseResume: (filepath) => def_request(`${FASTAPI_BASE_URL}/parse-resume`, {
    method: 'POST',
    body: JSON.stringify({ filepath }),
  }),
  runTalentCheck: (profileSkills, expectations) => def_request(`${FASTAPI_BASE_URL}/talent-check`, {
    method: 'POST',
    body: JSON.stringify({
      profile: { skills: profileSkills },
      expectations: expectations,
    }),
  }),
  runSkillMatch: (candidateSkills, jdSkills) => def_request(`${FASTAPI_BASE_URL}/skill-match`, {
    method: 'POST',
    body: JSON.stringify({
      candidate_skills: candidateSkills,
      jd_skills: jdSkills,
    }),
  }),
};
