import os
import json
import uuid
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .db_prisma import get_db

# Helper to load JSON body
def load_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except Exception:
        return None

# Endpoints: GET /api/companies/
@csrf_exempt
async def list_companies(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        db = await get_db()
        companies = await db.company.find_many(
            include={
                "roles": {
                    "include": {
                        "skillExpectations": True
                    }
                }
            }
        )
        
        result = []
        for c in companies:
            roles_data = []
            for r in c.roles:
                expectations = {exp.categoryCode: exp.expectedLevel for exp in r.skillExpectations}
                roles_data.append({
                    "id": r.id,
                    "title": r.title,
                    "expectations": expectations
                })
            result.append({
                "id": c.id,
                "name": c.name,
                "roles": roles_data
            })
            
        return JsonResponse(result, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# Endpoints: GET /api/samples/
@csrf_exempt
async def list_samples(request):
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        base_path = os.path.join(settings.BASE_DIR.parent, 'scratch', 'RADIX TALENT MATCH HACKATHON')
        jds_pdf_dir = os.path.join(base_path, 'JDs', 'PDF')
        jds_word_dir = os.path.join(base_path, 'JDs', 'Word')
        resumes_pdf_dir = os.path.join(base_path, 'Resumes', 'PDF')
        resumes_word_dir = os.path.join(base_path, 'Resumes', 'Word')
        
        jds = []
        resumes = []
        
        # Load JDs
        if os.path.exists(jds_pdf_dir):
            for f in os.listdir(jds_pdf_dir):
                if f.endswith('.pdf'):
                    # Map files to correct company & role
                    # Google LLC - Data Scientist.pdf
                    company = ""
                    role = ""
                    if "Google" in f:
                        company = "Google LLC"
                    elif "Microsoft" in f:
                        company = "Microsoft"
                    elif "Oracle" in f:
                        company = "Oracle Financial Services Software"
                        
                    if "Software Engineer" in f:
                        role = "Software Engineer" if company != "Oracle Financial Services Software" else "Associate Software Engineer"
                    elif "Data Scientist" in f:
                        role = "Data Scientist"
                    elif "Data Analyst" in f:
                        role = "Data Analyst"
                    elif "Support Analyst" in f:
                        role = "Application Support Analyst"
                        
                    jds.append({
                        "filename": f,
                        "file_type": "PDF",
                        "company": company,
                        "role": role,
                        "path": os.path.join(jds_pdf_dir, f)
                    })
        if os.path.exists(jds_word_dir):
            for f in os.listdir(jds_word_dir):
                if f.endswith('.docx'):
                    company = ""
                    role = ""
                    if "Google" in f:
                        company = "Google LLC"
                    elif "Microsoft" in f:
                        company = "Microsoft"
                    elif "Oracle" in f:
                        company = "Oracle Financial Services Software"
                        
                    if "Software Engineer" in f:
                        role = "Software Engineer" if company != "Oracle Financial Services Software" else "Associate Software Engineer"
                    elif "Data Scientist" in f:
                        role = "Data Scientist"
                    elif "Data Analyst" in f:
                        role = "Data Analyst"
                    elif "Support Analyst" in f:
                        role = "Application Support Analyst"
                        
                    jds.append({
                        "filename": f,
                        "file_type": "Word",
                        "company": company,
                        "role": role,
                        "path": os.path.join(jds_word_dir, f)
                    })
                    
        # Load Resumes
        if os.path.exists(resumes_pdf_dir):
            for f in os.listdir(resumes_pdf_dir):
                if f.endswith('.pdf'):
                    resumes.append({
                        "filename": f,
                        "file_type": "PDF",
                        "candidate_name": f.replace('.pdf', ''),
                        "path": os.path.join(resumes_pdf_dir, f)
                    })
        if os.path.exists(resumes_word_dir):
            for f in os.listdir(resumes_word_dir):
                if f.endswith('.docx'):
                    resumes.append({
                        "filename": f,
                        "file_type": "Word",
                        "candidate_name": f.replace('.docx', ''),
                        "path": os.path.join(resumes_word_dir, f)
                    })
                    
        return JsonResponse({"jds": jds, "resumes": resumes})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# Endpoints: CRUD /api/profiles/
@csrf_exempt
async def manage_profiles(request, profile_id=None):
    db = await get_db()
    
    if request.method == 'GET':
        if profile_id:
            # Get detailed profile
            profile = await db.candidateprofile.find_unique(
                where={"id": profile_id},
                include={"skills": True}
            )
            if not profile:
                return JsonResponse({"error": "Profile not found"}, status=404)
                
            skills_data = [{
                "skill_name": s.skillName,
                "category_code": s.categoryCode,
                "evidence": s.evidence,
                "confidence": s.confidence,
                "level": s.level
            } for s in profile.skills]
            
            return JsonResponse({
                "id": profile.id,
                "name": profile.name,
                "email": profile.email,
                "education": profile.education,
                "cv_file": profile.cvFile,
                "hackathons": profile.hackathons,
                "internships": profile.internships,
                "certifications": profile.certifications,
                "preferred_roles": profile.preferredRoles,
                "skills": skills_data
            })
        else:
            # List profiles
            profiles = await db.candidateprofile.find_many()
            result = [{
                "id": p.id,
                "name": p.name,
                "email": p.email,
                "education": p.education,
                "cv_file": p.cvFile
            } for p in profiles]
            return JsonResponse(result, safe=False)
            
    elif request.method == 'POST':
        body = load_json_body(request)
        if not body:
            return HttpResponseBadRequest("Invalid JSON")
            
        name = body.get('name')
        email = body.get('email')
        
        if not name or not email:
            return HttpResponseBadRequest("Name and email are required fields")
            
        education = body.get('education', '')
        cv_file = body.get('cv_file', '')
        hackathons = body.get('hackathons', [])
        internships = body.get('internships', [])
        certifications = body.get('certifications', [])
        preferred_roles = body.get('preferred_roles', [])
        skills = body.get('skills', [])
        
        try:
            # Check if updating an existing profile or creating a new one
            # Find by email
            existing = await db.candidateprofile.find_unique(where={"email": email})
            
            if existing:
                # Update
                profile_id = existing.id
                await db.candidateprofile.update(
                    where={"id": profile_id},
                    data={
                        "name": name,
                        "education": education,
                        "cvFile": cv_file,
                        "hackathons": hackathons,
                        "internships": internships,
                        "certifications": certifications,
                        "preferredRoles": preferred_roles
                    }
                )
                # Delete existing skills for update
                await db.candidateskill.delete_many(where={"profileId": profile_id})
            else:
                # Create
                profile = await db.candidateprofile.create(
                    data={
                        "name": name,
                        "email": email,
                        "education": education,
                        "cvFile": cv_file,
                        "hackathons": hackathons,
                        "internships": internships,
                        "certifications": certifications,
                        "preferredRoles": preferred_roles
                    }
                )
                profile_id = profile.id
                
            # Create skills
            for s in skills:
                await db.candidateskill.create(
                    data={
                        "profileId": profile_id,
                        "skillName": s.get('skill_name', ''),
                        "categoryCode": s.get('category_code', 'OTHER'),
                        "evidence": s.get('evidence', ''),
                        "confidence": s.get('confidence', 'medium'),
                        "level": int(s.get('level', 5))
                    }
                )
                
            return JsonResponse({"message": "Profile saved successfully", "id": profile_id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    elif request.method == 'DELETE':
        if not profile_id:
            return HttpResponseBadRequest("Profile ID required")
        try:
            await db.candidateprofile.delete(where={"id": profile_id})
            return JsonResponse({"message": "Profile deleted successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    return JsonResponse({"error": "Method not allowed"}, status=405)

# Endpoint: POST /api/profiles/upload-cv/
@csrf_exempt
def upload_cv(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
        
    try:
        cv_file = request.FILES.get('cv')
        if not cv_file:
            return HttpResponseBadRequest("No file uploaded under field name 'cv'")
            
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        
        # Save file with unique name to prevent collisions
        file_ext = os.path.splitext(cv_file.name)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        save_path = os.path.join(settings.MEDIA_ROOT, unique_filename)
        
        with open(save_path, 'wb+') as destination:
            for chunk in cv_file.chunks():
                destination.write(chunk)
                
        return JsonResponse({
            "message": "File uploaded successfully",
            "filename": cv_file.name,
            "saved_name": unique_filename,
            "path": save_path
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# Endpoint: GET/POST /api/history/talent-check/
@csrf_exempt
async def talent_check_history(request):
    db = await get_db()
    
    if request.method == 'GET':
        try:
            results = await db.talentcheckresult.find_many(
                include={
                    "profile": True,
                    "role": {
                        "include": {
                            "company": True
                        }
                    }
                },
                order={"checkedAt": "desc"}
            )
            
            output = [{
                "id": r.id,
                "profile_id": r.profileId,
                "candidate_name": r.profile.name,
                "company_name": r.role.company.name,
                "role_title": r.role.title,
                "readiness_score": r.readinessScore,
                "gap_details": r.gapDetails,
                "checked_at": r.checkedAt.isoformat()
            } for r in results]
            
            return JsonResponse(output, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    elif request.method == 'POST':
        body = load_json_body(request)
        if not body:
            return HttpResponseBadRequest("Invalid JSON")
            
        profile_id = body.get('profile_id')
        role_id = body.get('role_id')
        readiness_score = body.get('readiness_score')
        gap_details = body.get('gap_details')
        
        if not profile_id or not role_id or readiness_score is None or not gap_details:
            return HttpResponseBadRequest("Missing required fields")
            
        try:
            res = await db.talentcheckresult.create(
                data={
                    "profileId": profile_id,
                    "roleId": role_id,
                    "readinessScore": int(readiness_score),
                    "gapDetails": gap_details
                }
            )
            return JsonResponse({"message": "Result saved", "id": res.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    return JsonResponse({"error": "Method not allowed"}, status=405)

# Endpoint: GET/POST /api/history/skill-match/
@csrf_exempt
async def skill_match_history(request):
    db = await get_db()
    
    if request.method == 'GET':
        try:
            results = await db.skillmatchresult.find_many(
                include={
                    "profile": True,
                    "jd": {
                        "include": {
                            "role": {
                                "include": {
                                    "company": True
                                }
                            }
                        }
                    }
                },
                order={"matchedAt": "desc"}
            )
            
            output = [{
                "id": r.id,
                "profile_id": r.profileId,
                "candidate_name": r.profile.name,
                "jd_file": r.jd.sourceFile,
                "company_name": r.jd.role.company.name,
                "role_title": r.jd.role.title,
                "match_score": r.matchScore,
                "matched_skills": r.matchedSkills,
                "missing_skills": r.missingSkills,
                "matched_at": r.matchedAt.isoformat()
            } for r in results]
            
            return JsonResponse(output, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    elif request.method == 'POST':
        body = load_json_body(request)
        if not body:
            return HttpResponseBadRequest("Invalid JSON")
            
        profile_id = body.get('profile_id')
        role_id = body.get('jd_id')  # Note: The frontend passes role_id here
        source_file = body.get('jd_source_file', 'sample_jd.pdf')
        match_score = body.get('match_score')
        matched_skills = body.get('matched_skills', [])
        missing_skills = body.get('missing_skills', [])
        
        if not profile_id or not role_id or match_score is None:
            return HttpResponseBadRequest("Missing required fields")
            
        try:
            # 1. Find or create a JobDescription record in database
            # First, check if there's an existing JD for this role and source file
            existing_jds = await db.jobdescription.find_many(
                where={
                    "roleId": role_id,
                    "sourceFile": source_file
                }
            )
            
            if existing_jds:
                jd_record = existing_jds[0]
            else:
                # Create the JobDescription record
                jd_record = await db.jobdescription.create(
                    data={
                        "roleId": role_id,
                        "sourceFile": source_file
                    }
                )
                
            # 2. Save the SkillMatchResult
            res = await db.skillmatchresult.create(
                data={
                    "profileId": profile_id,
                    "jdId": jd_record.id,
                    "matchScore": int(match_score),
                    "matchedSkills": matched_skills,
                    "missingSkills": missing_skills
                }
            )
            return JsonResponse({"message": "Result saved", "id": res.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    return JsonResponse({"error": "Method not allowed"}, status=405)
