from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import turbovec
import numpy as np
import os
import json
from sentence_transformers import SentenceTransformer

app = FastAPI(
    title="Vector Search Match API",
    description="Vector search skill matching using BAAI/bge-small-en-v1.5 and TurboQuant (turbovec)"
)

# Load the sentence transformer model
print("Loading model BAAI/bge-small-en-v1.5...")
model = SentenceTransformer("BAAI/bge-small-en-v1.5")
EMBEDDING_DIM = 384  # bge-small-en-v1.5 dimension
print("Model loaded successfully.")

# Initialize Global Vector DB for all seen skills
GLOBAL_INDEX_PATH = "global_skills_index.tv"
GLOBAL_SKILLS_PATH = "global_skills.json"

global_skills = []
if os.path.exists(GLOBAL_SKILLS_PATH):
    with open(GLOBAL_SKILLS_PATH, "r") as f:
        global_skills = json.load(f)

if os.path.exists(GLOBAL_INDEX_PATH):
    global_idx = turbovec.TurboQuantIndex.load(GLOBAL_INDEX_PATH)
else:
    global_idx = turbovec.TurboQuantIndex(dim=EMBEDDING_DIM)

class MatchRequest(BaseModel):
    candidate_id: str
    candidate_skills: List[str]
    company_id: str
    required_skills: List[str]

class MatchResponse(BaseModel):
    match_score: int
    matched_skills: List[str]
    partial_matches: List[Dict[str, str]]
    missing_skills: List[str]
    matched_time: str

@app.post("/vector-match", response_model=MatchResponse)
async def vector_match(request: MatchRequest):
    if not request.required_skills:
        return MatchResponse(
            match_score=100,
            matched_skills=[],
            partial_matches=[],
            missing_skills=[],
            matched_time=datetime.utcnow().isoformat()
        )
        
    try:
        # 1. Update Global Vector DB with any new skills
        all_skills = set(request.required_skills)
        if request.candidate_skills:
            all_skills.update(request.candidate_skills)
            
        new_skills = [s for s in all_skills if s not in global_skills]
        
        if new_skills:
            new_embeddings = model.encode(new_skills, normalize_embeddings=True).astype(np.float32)
            global_idx.add(new_embeddings)
            global_skills.extend(new_skills)
            
            # Persist to disk
            global_idx.write(GLOBAL_INDEX_PATH)
            with open(GLOBAL_SKILLS_PATH, "w") as f:
                json.dump(global_skills, f)

        # 2. Ephemeral Exact Matching (Company Requirements vs Candidate)
        req_embeddings = model.encode(request.required_skills, normalize_embeddings=True).astype(np.float32)
        
        matched = set()
        partial = []
        missing = set(request.required_skills)
        
        # Track requirements that have been partially satisfied to prevent double counting
        partial_satisfied_reqs = set()
        
        if request.candidate_skills:
            cand_embeddings = model.encode(request.candidate_skills, normalize_embeddings=True).astype(np.float32)
            
            # Compute exact pairwise L2 distances using numpy broadcasting
            # req_embeddings shape: (num_req, DIM)
            # cand_embeddings shape: (num_cand, DIM)
            
            for i, cand_skill in enumerate(request.candidate_skills):
                # Calculate exact L2 distances between this candidate skill and all required skills
                diff = req_embeddings - cand_embeddings[i]
                distances = np.linalg.norm(diff, axis=1)
                
                # Find the index of the closest required skill
                closest_idx = np.argmin(distances)
                dist = distances[closest_idx]
                matched_doc = request.required_skills[closest_idx]
                
                # Strong Match Threshold (approx >0.85 cosine similarity)
                if dist <= 0.55:
                    matched.add(matched_doc)
                    if matched_doc in missing:
                        missing.remove(matched_doc)
                    if matched_doc in partial_satisfied_reqs:
                        partial_satisfied_reqs.remove(matched_doc)
                        # Remove from partial matches array if it upgraded to a full match
                        partial = [p for p in partial if p["required"] != matched_doc]
                        
                # Partial Match Threshold (approx >0.68 cosine similarity)
                elif dist <= 0.80:
                    # Only add partial match if it hasn't been strongly matched
                    if matched_doc not in matched and matched_doc not in partial_satisfied_reqs:
                        partial_satisfied_reqs.add(matched_doc)
                        partial.append({
                            "required": matched_doc,
                            "candidate_has": cand_skill
                        })
                            
        # Final Score Calculation
        total_reqs = len(request.required_skills)
        score_points = len(matched) + (len(partial) * 0.5)
        match_score = int((score_points / total_reqs) * 100)
        
        return MatchResponse(
            match_score=match_score,
            matched_skills=list(matched),
            partial_matches=partial,
            missing_skills=list(missing),
            matched_time=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
