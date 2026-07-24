import os
import re
import json
import logging
import numpy as np
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Local imports
try:
    from .vector_db import TurboQuantIndex, EmbeddingClient, gemini_available, GEMINI_API_KEY
except ImportError:
    from vector_db import TurboQuantIndex, EmbeddingClient, gemini_available, GEMINI_API_KEY

# Configure logs
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RADIX Skill Matching & Assessment Microservice",
    description="Vector semantic search, gap analysis, and coding challenge generator running on port 8003",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize vector databases
user_index = TurboQuantIndex("user_profiles")
jd_index = TurboQuantIndex("job_descriptions")

# ----------------- SCHEMAS -----------------
class SkillItem(BaseModel):
    skill_name: str
    category_code: str
    evidence: Optional[str] = ""
    confidence: Optional[str] = "medium"
    level: Optional[int] = 5

class ProfileIndexRequest(BaseModel):
    id: str
    name: str
    email: str
    skills: List[SkillItem]
    preferred_roles: Optional[List[str]] = []
    certifications: Optional[List[str]] = []
    hackathons: Optional[List[str]] = []
    internships: Optional[List[str]] = []

class JDIndexRequest(BaseModel):
    company: str
    role: str
    skills: List[SkillItem]

class MatchEvaluationRequest(BaseModel):
    profile_id: str
    company: str
    role: str
    skills: Optional[List[SkillItem]] = []
    snippet: Optional[str] = ""

@app.get("/")
def read_root():
    return {
        "status": "running", 
        "service": "RADIX Skill Match & Assessment Engine",
        "gemini_ready": gemini_available
    }

# ----------------- ENDPOINTS -----------------

@app.post("/index-user-profile")
async def index_user_profile(request: ProfileIndexRequest):
    """
    Computes vector embeddings for each of the candidate's skills and indexes them.
    This is called when the user builds or updates their profile in the builder.
    """
    try:
        # When Gemini is unavailable, we can still index the metadata for keyword matching
        if not gemini_available:
            logger.warning("Gemini API key is missing. Indexing profile with metadata only.")

        # Index each skill as an individual semantic concept
        for idx, skill in enumerate(request.skills):
            text = f"Skill: {skill.skill_name}. Category: {skill.category_code}. Competency Level: {skill.level}/10. Evidence: {skill.evidence}"
            vector = EmbeddingClient.get_embedding(text) # Returns None if unavailable
            
            key = f"profile_{request.id}_{skill.category_code}_{idx}"
            user_index.add_vector(key, vector, {
                "profile_id": request.id,
                "skill_name": skill.skill_name,
                "category_code": skill.category_code,
                "level": skill.level,
                "evidence": skill.evidence
            })
                
        # Also index preferred roles to help find alignments
        for role in request.preferred_roles:
            text = f"Preferred Job Role: {role} for candidate {request.name}"
            vector = EmbeddingClient.get_embedding(text) # Returns None if unavailable

            key = f"profile_{request.id}_ROLE_{role.lower().replace(' ', '_')}"
            user_index.add_vector(key, vector, {
                "profile_id": request.id,
                "role_name": role,
                "category_code": "ROLE"
            })

        status = "success" if gemini_available else "saved_without_vector"
        return {"status": status, "indexed_skills_count": len(request.skills)}
        
    except Exception as e:
        logger.error(f"Error indexing user profile vectors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index user profile: {str(e)}")


@app.post("/index-job-description")
async def index_job_description(request: JDIndexRequest):
    """
    Computes and indexes the required skill nodes for a Job Description benchmark.
    """
    if not gemini_available:
        return {"status": "saved_without_vector", "detail": "JD details saved, but vector search skipped."}
        
    try:
        for idx, skill in enumerate(request.skills):
            text = f"Required Job Competency: {skill.skill_name}. Category: {skill.category_code}. Required Level: {skill.level}/10"
            vector = EmbeddingClient.get_embedding(text)
            if vector:
                key = f"jd_{request.company.lower().replace(' ', '_')}_{skill.category_code}_{idx}"
                jd_index.add_vector(key, vector, {
                    "company": request.company,
                    "role": request.role,
                    "skill_name": skill.skill_name,
                    "category_code": skill.category_code,
                    "level": skill.level
                })
        return {"status": "success", "indexed_requirements_count": len(request.skills)}
    except Exception as e:
        logger.error(f"Error indexing JD vectors: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index JD: {str(e)}")


@app.post("/evaluate-skill-match")
async def evaluate_skill_match(request: MatchEvaluationRequest):
    """
    Performs RAG + Fuzzy matching comparing user profile vectors against JD requirements.
    Identifies matched, lacking, and missing skills.
    Pulls documents/tutorials, and calls Gemini to write DSA and coding challenges.
    """
    required_skills = request.skills
    profile_id = request.profile_id
    
    # If skills list is empty, dynamically extract requirements from role & snippet via Gemini
    if not required_skills and gemini_available:
        try:
            import google.generativeai as genai
            logger.info(f"Extracting skills dynamically from snippet/role: {request.role}")
            
            prompt = f"""
            You are a technical HR auditor. Extract 4-6 key required skillsets and target level (1-10) for this job opening.
            Company: {request.company}
            Role: {request.role}
            Job Description Snippet: {request.snippet or "Standard professional industry role"}
            
            Categorize each skill strictly into one of these 12 RADIX codes:
            - COD: Coding / Programming Languages
            - DSA: Data Structures & Algorithms
            - OOD: Object-Oriented Design
            - APTI: Aptitude / Problem Solving / Analytical Reasoning
            - COMM: Communication / Client Facing / Sales / Public Speaking
            - AI: Artificial Intelligence / Machine Learning / Data Science
            - CLOUD: Cloud Computing / DevOps / AWS / GCP / Azure
            - SQL: SQL / Databases / Data Querying
            - SWE: Software Engineering Practices / Testing / Git / Agile
            - SYSD: System Design / Architecture
            - NETW: Networking / Protocols
            - OS: Operating Systems / Linux
            - OTHER: Domain knowledge / Other tools
            
            Junior=1-4, Mid=5-7, Senior=8-10.
            
            Format strictly as a JSON list matching this schema:
            [
              {{
                "skill_name": "Skill Name",
                "category_code": "COD|DSA|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER",
                "level": 6
              }}
            ]
            Provide ONLY the raw JSON output. No markdown block wrapper, no commentary.
            """
            
            model = genai.GenerativeModel('gemini-2.5-flash')
            res = model.generate_content(prompt)
            clean_text = res.text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            
            extracted_list = json.loads(clean_text.strip())
            required_skills = [SkillItem(**item) for item in extracted_list]
        except Exception as extract_err:
            logger.error(f"Failed to extract skills dynamically from snippet: {extract_err}")
            
    # Final domain-aware fallback if skills list is still empty
    if not required_skills:
        role_lower = request.role.lower()
        if "sales" in role_lower or "care" in role_lower or "specialist" in role_lower or "marketing" in role_lower or "client" in role_lower:
            required_skills = [
                SkillItem(skill_name="Communication & Client Relations", category_code="COMM", level=7),
                SkillItem(skill_name="Aptitude & Problem Solving", category_code="APTI", level=6),
                SkillItem(skill_name="Domain & Product Knowledge", category_code="OTHER", level=6)
            ]
        elif "ai" in role_lower or "data" in role_lower or "machine learning" in role_lower or "architect" in role_lower:
            required_skills = [
                SkillItem(skill_name="Python Programming", category_code="COD", level=8),
                SkillItem(skill_name="Artificial Intelligence & ML", category_code="AI", level=8),
                SkillItem(skill_name="SQL & Data Querying", category_code="SQL", level=7)
            ]
        else:
            required_skills = [
                SkillItem(skill_name="Coding & Software Development", category_code="COD", level=7),
                SkillItem(skill_name="Data Structures & Algorithms", category_code="DSA", level=6),
                SkillItem(skill_name="Software Engineering Practices", category_code="SWE", level=6)
            ]

    # 1. Retrieve candidate skills from user index database (with string ID matching)
    candidate_vectors = []
    for key, meta in user_index.metadata.items():
        if str(meta.get("profile_id")) == str(profile_id) and meta.get("category_code") != "ROLE":
            vec = user_index.vectors.get(key)
            candidate_vectors.append({
                "skill_name": meta.get("skill_name"),
                "category_code": meta.get("category_code"),
                "level": meta.get("level", 5),
                "evidence": meta.get("evidence", ""),
                "vector": vec
            })
    
    # Lazy indexing fallback! If no vectors exist in local DB, fetch profile from Node backend and index
    if not candidate_vectors:
        try:
            import httpx
            node_url = f"http://localhost:8000/api/profiles/{profile_id}/"
            logger.info(f"Candidate vectors not found for ID {profile_id}. Lazy loading from {node_url}...")
            response = httpx.get(node_url, timeout=10.0)

            if response.status_code == 200:
                profile_data = response.json()
                skills = profile_data.get("skills", [])
                
                for idx, skill in enumerate(skills):
                    s_name = skill.get("skill_name")
                    s_cat = skill.get("category_code")
                    s_lvl = skill.get("level", 5)
                    s_ev = skill.get("evidence", "")
                    
                    vector = None
                    if gemini_available:
                        text = f"Skill: {s_name}. Category: {s_cat}. Competency Level: {s_lvl}/10. Evidence: {s_ev}"
                        vector = EmbeddingClient.get_embedding(text)
                    
                    key = f"profile_{profile_id}_{s_cat}_{idx}"
                    user_index.add_vector(key, vector, {
                        "profile_id": str(profile_id),
                        "skill_name": s_name,
                        "category_code": s_cat,
                        "level": s_lvl,
                        "evidence": s_ev
                    })
                    candidate_vectors.append({
                        "skill_name": s_name,
                        "category_code": s_cat,
                        "level": s_lvl,
                        "evidence": s_ev,
                        "vector": vector
                    })

                logger.info(f"Successfully lazy-loaded {len(skills)} skills for profile ID {profile_id}.")
        except Exception as lazy_err:
            logger.error(f"Lazy profile vector sync failed for ID {profile_id}: {lazy_err}")

    matched_skills = []
    lacking_skills = []
    missing_skills = []
    
    total_requirements = len(required_skills)
    match_score_sum = 0.0
    
    for req in required_skills:
        req_name = req.skill_name
        req_cat = req.category_code
        req_level = req.level if req.level else 5
        
        best_sim = 0.0
        best_cand = None
        
        req_vector = None
        if gemini_available:
            req_text = f"Required Job Competency: {req_name}. Category: {req_cat}. Required Level: {req_level}/10"
            req_vector = EmbeddingClient.get_embedding(req_text)
            
        for cand in candidate_vectors:
            sim = 0.0
            # 1. Cosine similarity using raw float32 vectors
            if req_vector and cand.get("vector"):
                c_arr = np.array(cand["vector"], dtype=np.float32)
                r_arr = np.array(req_vector, dtype=np.float32)
                dot = float(np.dot(c_arr, r_arr))
                norm = float(np.linalg.norm(c_arr) * np.linalg.norm(r_arr))
                if norm > 0:
                    sim = dot / norm
                    
            # 2. Category matching boost & baseline score
            if cand.get("category_code") == req_cat:
                sim = max(sim, 0.75)
            else:
                # Token-level fuzzy Jaccard check
                req_tokens = set(re.findall(r'\w+', req_name.lower()))
                cand_tokens = set(re.findall(r'\w+', cand["skill_name"].lower()))
                intersection = req_tokens.intersection(cand_tokens)
                union = req_tokens.union(cand_tokens)
                j_sim = len(intersection) / len(union) if union else 0.0
                sim = max(sim, j_sim)

            if sim > best_sim:
                best_sim = sim
                best_cand = cand

        # Threshold check: candidate match valid if similarity >= 0.35 or category matches
        is_matched = best_cand is not None and (best_sim >= 0.35 or best_cand.get("category_code") == req_cat)
        
        if is_matched:
            cand_lvl = best_cand.get("level", 5)
            level_ratio = min(1.0, cand_lvl / req_level) if req_level > 0 else 1.0
            match_ratio = best_sim * level_ratio
            match_score_sum += match_ratio
            
            matched_item = {
                "skill_name": req_name,
                "category_code": req_cat,
                "required_level": req_level,
                "candidate_level": cand_lvl,
                "similarity": round(best_sim, 2),
                "evidence": best_cand.get("evidence", "")
            }
            
            if cand_lvl >= req_level:
                matched_skills.append(matched_item)
            else:
                lacking_skills.append(matched_item)
        else:
            missing_skills.append({
                "skill_name": req_name,
                "category_code": req_cat,
                "required_level": req_level,
                "similarity": 0.0
            })
            
    # Compute overall score
    overall_match = int((match_score_sum / total_requirements) * 100) if total_requirements > 0 else 100
    overall_match = max(0, min(100, overall_match))
    
    # 2. Gather resource links for lacking/missing skills
    resource_gaps = lacking_skills + missing_skills
    learning_resources = []
    
    for gap in resource_gaps[:3]:  # Suggest resources for the top 3 gaps to avoid cluttering
        skill = gap["skill_name"]
        cat = gap["category_code"]
        
        # Heuristic official documentation lookup
        doc_urls = {
            "python": "https://docs.python.org/3/",
            "javascript": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            "react": "https://react.dev/reference/react",
            "docker": "https://docs.docker.com/",
            "kubernetes": "https://kubernetes.io/docs/",
            "sql": "https://www.postgresql.org/docs/",
            "postgres": "https://www.postgresql.org/docs/",
            "django": "https://docs.djangoproject.com/en/stable/",
            "fastapi": "https://fastapi.tiangolo.com/",
            "aws": "https://docs.aws.amazon.com/",
            "git": "https://git-scm.com/doc",
            "mongodb": "https://www.mongodb.com/docs/",
            "redis": "https://redis.io/documentation"
        }
        
        doc_url = doc_urls.get(skill.lower(), f"https://www.google.com/search?q={skill.replace(' ', '+')}+official+documentation")
        
        learning_resources.append({
            "skill_name": skill,
            "category_code": cat,
            "official_docs": doc_url,
            "youtube_query": f"https://www.youtube.com/results?search_query=Learn+{skill.replace(' ', '+')}+tutorial",
            "tutorial_link": f"https://www.w3schools.com/html/default.asp" if cat == "COD" else f"https://www.geeksforgeeks.org/{skill.lower().replace(' ', '-')}/"
        })
        
    # 3. Call LLM to generate Coding Challenge & MCQs based on lacking/missing categories
    assessment = None
    if gemini_available and resource_gaps:
        try:
            import google.generativeai as genai
            gaps_str = ", ".join([f"{g['skill_name']} ({g['category_code']})" for g in resource_gaps])
            
            prompt = f"""
            You are creating an interactive interview assessment matching the candidate's skill gaps.
            The candidate is lacking in these competencies: {gaps_str}.
            
            Your task is to generate:
            1. Two multiple-choice questions (MCQs) testing concepts from these skills (with choices and explanations).
            2. One LeetCode-style programming challenge related to these skills (usually testing Coding, DSA, or system design coding logic).
            
            Format your output strictly as a JSON object matching this schema:
            {{
              "mcqs": [
                {{
                  "question": "Question text...",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "answer": "Option A",
                  "explanation": "Brief explanation of why Option A is correct."
                }}
              ],
              "coding_challenge": {{
                "title": "Challenge Title (e.g. Reverse a LinkedList)",
                "difficulty": "Easy|Medium|Hard",
                "description": "Provide a clean problem statement with constraints and examples.",
                "initial_template": "def solve(param):\\n    # Write python code here\\n    pass",
                "test_cases": [
                  {{
                    "input": "input representation",
                    "expected_output": "expected representation"
                  }}
                ]
              }}
            }}
            Provide ONLY the raw JSON output. No explanations, no markdown blocks.
            """
            
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            clean_text = response.text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
                
            assessment = json.loads(clean_text.strip())
        except Exception as llm_err:
            logger.error(f"Failed to generate assessment challenges via Gemini: {llm_err}")
            
    # Fallback mock assessment if LLM call fails
    if not assessment:
        assessment = {
            "mcqs": [
                {
                    "question": "What is the primary difference between a queue and a stack structure?",
                    "options": [
                        "Queue is FIFO (First-In, First-Out); Stack is LIFO (Last-In, First-Out)",
                        "Queue is LIFO; Stack is FIFO",
                        "Queue is slower than Stack",
                        "Stack handles only strings; Queue handles integers"
                    ],
                    "answer": "Queue is FIFO (First-In, First-Out); Stack is LIFO (Last-In, First-Out)",
                    "explanation": "Queues insert at the tail and remove from the head (FIFO), whereas stacks insert and remove from the same end (LIFO)."
                }
            ],
            "coding_challenge": {
                "title": "Array Subset Alignment Check",
                "difficulty": "Easy",
                "description": "Given two arrays, determine if the second array is a subset of the first array. Return True or False.",
                "initial_template": "def is_subset(arr1: list, arr2: list) -> bool:\n    # Write your solution code here\n    pass",
                "test_cases": [
                  {
                    "input": "arr1=[1,2,3,4], arr2=[2,4]",
                    "expected_output": "True"
                  }
                ]
            }
        }
        
    return {
        "match_score": overall_match,
        "matched_skills": matched_skills,
        "lacking_skills": lacking_skills,
        "missing_skills": missing_skills,
        "learning_resources": learning_resources,
        "assessment": assessment
    }


@app.post("/clear-jd-store")
async def clear_jd_store():
    """
    Clears the Job Description vector database index.
    """
    try:
        jd_index.clear()
        return {"status": "success", "detail": "Job Description Vector Store cleared."}
    except Exception as e:
        logger.error(f"Failed to clear JD vector index: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
