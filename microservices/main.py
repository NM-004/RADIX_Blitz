import os
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from .parsers import (
    extract_text, 
    gemini_parse_jd, 
    gemini_parse_resume, 
    rule_based_parse_jd, 
    rule_based_parse_resume,
    compute_fuzzy_match
)

# Try loading from backend/.env first
backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

app = FastAPI(
    title="RADIX Talent Match Analytics API",
    description="Microservice for processing resumes, job descriptions, and evaluating matches",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class FileParseRequest(BaseModel):
    filepath: str

class SkillItem(BaseModel):
    skill_name: str
    category_code: str
    evidence: Optional[str] = ""
    confidence: Optional[str] = "medium"
    level: Optional[int] = 5

class ProfileData(BaseModel):
    skills: List[SkillItem]

class TalentCheckRequest(BaseModel):
    profile: ProfileData
    expectations: Dict[str, int] # e.g. {"COD": 8, "DSA": 8, ...}


@app.get("/")
def read_root():
    return {"status": "running", "service": "RADIX Talent Match Analytics"}

@app.post("/parse-jd")
async def parse_jd(request: FileParseRequest):
    if not os.path.exists(request.filepath):
        # Check relative to base workspace
        alt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), request.filepath)
        if os.path.exists(alt_path):
            request.filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail=f"File not found at {request.filepath}")
            
    try:
        text = extract_text(request.filepath)
        filename = os.path.basename(request.filepath)
        result = gemini_parse_jd(text, filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing JD: {str(e)}")

@app.post("/parse-resume")
async def parse_resume(request: FileParseRequest):
    if not os.path.exists(request.filepath):
        # Check relative to base workspace
        alt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), request.filepath)
        if os.path.exists(alt_path):
            request.filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail=f"File not found at {request.filepath}")
            
    try:
        text = extract_text(request.filepath)
        filename = os.path.basename(request.filepath)
        result = gemini_parse_resume(text, filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing Resume: {str(e)}")

@app.post("/talent-check")
async def talent_check(request: TalentCheckRequest):
    """
    Computes a candidate's readiness score against a set of company expected levels.
    12 skillset categories: COD, DSA, OOD, APTI, COMM, AI, CLOUD, SQL, SWE, SYSD, NETW, OS.
    
    Formula:
    - Expected levels (1-10) for each of 12 categories.
    - Candidate level (1-10) is the max level found for skills in that category. If none found, level = 0.
    - Gap: Candidate level < Expected level.
    - Readiness Score = sum(min(candidate_level, expected_level)) / sum(expected_level) * 100
    """
    profile_skills = request.profile.skills
    expectations = request.expectations
    
    # 1. Map candidate skills to categories, finding the maximum level in each category
    cand_cat_levels = {}
    for skill in profile_skills:
        cat = skill.category_code
        level = skill.level
        if cat not in cand_cat_levels:
            cand_cat_levels[cat] = 0
        cand_cat_levels[cat] = max(cand_cat_levels[cat], level)
        
    # 2. Compare against expectations for 12 core categories
    categories = ["COD", "DSA", "OOD", "APTI", "COMM", "AI", "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS"]
    gap_details = []
    
    sum_expected = 0
    sum_achieved = 0
    
    for cat in categories:
        expected = expectations.get(cat, 0)
        # Skip if company does not require this category at all (level is 0)
        if expected == 0:
            continue
            
        candidate = cand_cat_levels.get(cat, 0)
        gap = candidate < expected
        
        sum_expected += expected
        sum_achieved += min(candidate, expected)
        
        gap_details.append({
            "category_code": cat,
            "required_level": expected,
            "candidate_level": candidate,
            "gap": gap
        })
        
    # Compute readiness score
    readiness_score = int((sum_achieved / sum_expected) * 100) if sum_expected > 0 else 100
    
    return {
        "readiness_score": readiness_score,
        "skillset_gap": gap_details
    }

@app.post("/skill-match")
async def skill_match(
    candidate_skills: List[SkillItem] = Body(..., embed=True),
    jd_skills: List[SkillItem] = Body(..., embed=True)
):
    """
    Fuzzy matches candidate skills against JD required skills.
    Returns:
    - match_score: 0-100
    - matched_skills list
    - missing_skills list with recommendations
    """
    cand_list = [s.dict() for s in candidate_skills]
    jd_list = [s.dict() for s in jd_skills]
    
    try:
        result = compute_fuzzy_match(cand_list, jd_list)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fuzzy skill matching failed: {str(e)}")
