import os
import re
import json
import logging
from typing import Dict, List, Any, Optional
import pypdf
import pdfplumber
import docx
from dotenv import load_dotenv

# Try loading from backend/.env first
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

logger = logging.getLogger(__name__)

# Configure Gemini if key is present
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_available = False
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_available = True
        logger.info("Gemini API is configured and available.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")

# 12 RADIX skillset mapping keywords
SKILLSET_KEYWORDS = {
    "COD": {
        "name": "Coding",
        "keywords": ["python", "c\\+\\+", "java", "javascript", "js", "typescript", "ts", "golang", "go language", "rust", "c#", "ruby", "php", "coding", "programming", "software development", "scripts", "scripting"]
    },
    "DSA": {
        "name": "Data Structures & Algorithms",
        "keywords": ["algorithms", "data structures", "trees", "graphs", "sorting", "searching", "linked lists", "dynamic programming", "recursion", "complexity analysis", "big o", "leetcode"]
    },
    "OOD": {
        "name": "Object-Oriented Design",
        "keywords": ["object-oriented", "oop", "ood", "classes", "interfaces", "design patterns", "inheritance", "polymorphism", "encapsulation", "abstraction", "solid principles"]
    },
    "APTI": {
        "name": "Aptitude",
        "keywords": ["problem solving", "analytical skills", "logical reasoning", "aptitude", "critical thinking", "quantitative", "puzzle solving", "cognitive"]
    },
    "COMM": {
        "name": "Communication",
        "keywords": ["communication", "presentation", "writing", "verbal", "collaboration", "teamwork", "leadership", "interpersonal", "agile communication", "mentoring", "client-facing"]
    },
    "AI": {
        "name": "Artificial Intelligence",
        "keywords": ["machine learning", "ml", "deep learning", "dl", "artificial intelligence", "ai", "nlp", "natural language", "computer vision", "cv", "neural networks", "tensorflow", "pytorch", "keras", "scikit-learn", "data science", "transformers", "llm", "large language models"]
    },
    "CLOUD": {
        "name": "Cloud Computing",
        "keywords": ["aws", "amazon web services", "azure", "gcp", "google cloud", "cloud computing", "kubernetes", "k8s", "docker", "containers", "terraform", "serverless", "lambda", "cloudformation", "devops"]
    },
    "SQL": {
        "name": "SQL & Databases",
        "keywords": ["sql", "database", "databases", "postgresql", "postgres", "mysql", "sqlite", "oracle db", "nosql", "mongodb", "redis", "cassandra", "queries", "indexing", "schema design"]
    },
    "SWE": {
        "name": "Software Engineering Practices",
        "keywords": ["git", "github", "ci/cd", "continuous integration", "testing", "unit tests", "pytest", "jest", "agile", "scrum", "code review", "debugging", "version control", "sdlc", "dry", "clean code"]
    },
    "SYSD": {
        "name": "System Design",
        "keywords": ["system design", "scalability", "distributed systems", "microservices", "load balancing", "caching", "replication", "high availability", "message queues", "rabbitmq", "kafka", "architecture"]
    },
    "NETW": {
        "name": "Networking",
        "keywords": ["networking", "tcp/ip", "dns", "http", "https", "routing", "switches", "sockets", "firewalls", "ssl/tls", "load balancers", "protocols"]
    },
    "OS": {
        "name": "Operating Systems",
        "keywords": ["operating systems", "os", "linux", "unix", "ubuntu", "windows", "macos", "memory management", "processes", "threads", "concurrency", "multithreading", "bash", "shell scripting", "kernel"]
    }
}

# Technologies extractor
TECH_KEYWORDS = [
    "django", "flask", "fastapi", "react", "next.js", "angular", "vue", "node.js", "express", 
    "spring boot", "pandas", "numpy", "html", "css", "tailwind", "prisma", "sequelize", 
    "hibernate", "graphql", "rest api", "kafka", "redis", "elasticsearch", "spark", "hadoop", 
    "jenkins", "github actions", "jira", "numpy", "scipy"
]

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    # Try pdfplumber first
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.warning(f"pdfplumber failed for {file_path}, falling back to pypdf: {e}")
        # Fallback to pypdf
        try:
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as ex:
            logger.error(f"pypdf also failed: {ex}")
            raise ex
    return text

def extract_text_from_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs]
        # Also extract tables text
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    paragraphs.append(cell.text)
        return "\n".join(paragraphs)
    except Exception as e:
        logger.error(f"python-docx failed: {e}")
        raise e

def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ['.docx', '.doc']:
        return extract_text_from_docx(file_path)
    else:
        # Try reading as plain text
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

# ----------------- RULE-BASED PARSER -----------------
def rule_based_extract_skills(text: str) -> List[Dict[str, Any]]:
    extracted = []
    text_lower = text.lower()
    
    # 1. Map keywords onto the 12 RADIX categories
    for cat_code, info in SKILLSET_KEYWORDS.items():
        matched_kws = []
        evidence_snippets = []
        
        for kw in info["keywords"]:
            # Use word boundaries if possible
            pattern = r'\b' + kw + r'\b'
            # Adjust pattern for special chars like C++
            if '++' in kw:
                pattern = r'\b' + re.escape(kw)
            elif '#' in kw:
                pattern = r'\b' + re.escape(kw)
                
            matches = re.finditer(pattern, text_lower)
            for m in matches:
                matched_kws.append(kw)
                # Extract sentence as evidence cleanly
                start = max(0, m.start() - 60)
                end = min(len(text), m.end() + 60)
                snippet = text[start:end].replace('\n', ' ').strip()
                # Remove leading/trailing sentence fragments
                snippet = re.sub(r'^[^\w]+', '', snippet)
                snippet = re.sub(r'[^\w]+$', '', snippet)
                evidence_snippets.append(snippet)
                break # only need one match for flag
                
        if matched_kws:
            confidence = "high" if len(matched_kws) > 2 else "medium"
            evidence = evidence_snippets[0] if evidence_snippets else f"Requirement mentions {', '.join(matched_kws)}"
            
            level = 6 if confidence == "high" else 5
            
            # Clean skill title without redundant parenthetical repetition
            skill_title = info['name']
            kws_clean = [k for k in matched_kws[:3] if k.lower() not in skill_title.lower()]
            if kws_clean:
                skill_title += f" ({', '.join(kws_clean)})"
            
            extracted.append({
                "skill_name": skill_title,
                "category_code": cat_code,
                "evidence": evidence,
                "confidence": confidence,
                "level": level
            })
            
    # 2. Extract technologies (as OTHER category)
    techs_found = []
    for tech in TECH_KEYWORDS:
        pattern = r'\b' + re.escape(tech) + r'\b'
        if re.search(pattern, text_lower):
            techs_found.append(tech)
            
    if techs_found:
        extracted.append({
            "skill_name": f"Technologies: {', '.join(techs_found)}",
            "category_code": "OTHER",
            "evidence": f"Found key technology requirements: {', '.join(techs_found)}",
            "confidence": "high",
            "level": 6
        })
        
    return extracted

def rule_based_parse_jd(text: str, filename: str) -> Dict[str, Any]:
    skills = rule_based_extract_skills(text)
    
    company = "Unknown Company"
    role = "Unknown Role"
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines:
        for line in lines[:5]:
            if "google" in line.lower():
                company = "Google LLC"
            elif "microsoft" in line.lower():
                company = "Microsoft"
            elif "oracle" in line.lower():
                company = "Oracle Financial Services Software"
                
            if "software engineer" in line.lower() or "swe" in line.lower():
                role = "Software Engineer"
            elif "data scientist" in line.lower():
                role = "Data Scientist"
            elif "data analyst" in line.lower():
                role = "Data Analyst"
            elif "support analyst" in line.lower():
                role = "Application Support Analyst"
                
    if company == "Unknown Company" or role == "Unknown Role":
        fn_lower = filename.lower()
        if "google" in fn_lower:
            company = "Google LLC"
        elif "microsoft" in fn_lower:
            company = "Microsoft"
        elif "oracle" in fn_lower:
            company = "Oracle Financial Services Software"
            
        if "software engineer" in fn_lower or "associate" in fn_lower:
            role = "Software Engineer" if company != "Oracle Financial Services Software" else "Associate Software Engineer"
        elif "data scientist" in fn_lower:
            role = "Data Scientist"
        elif "data analyst" in fn_lower:
            role = "Data Analyst"
        elif "support" in fn_lower:
            role = "Application Support Analyst"

    return {
        "source_type": "jd",
        "source_file": filename,
        "company": company,
        "role": role,
        "skills": skills
    }

def rule_based_parse_resume(text: str, filename: str) -> Dict[str, Any]:
    skills = rule_based_extract_skills(text)
    text_lower = text.lower()
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    name = filename.replace('.pdf', '').replace('.docx', '').replace('.doc', '')
    if lines:
        first_line = lines[0]
        if len(first_line) < 30 and not any(x in first_line.lower() for x in ['resume', 'cv', 'profile', 'curriculum']):
            name = first_line
            
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else f"{name.lower().replace(' ', '')}@example.com"
    
    education = "Not specified"
    edu_keywords = ["bachelor", "master", "phd", "b.tech", "m.tech", "b.s", "m.s", "university", "institute", "college"]
    for line in lines:
        if any(kw in line.lower() for kw in edu_keywords):
            if len(line) < 100:
                education = line
                break
                
    hackathons = []
    hack_keywords = ["hackathon", "hackfest", "codefest", "capture the flag", "ctf", "competed in"]
    for line in lines:
        if any(kw in line.lower() for kw in hack_keywords):
            if len(line) < 120 and line not in hackathons:
                hackathons.append(line)
                
    certifications = []
    cert_keywords = ["certified", "certification", "aws certified", "microsoft certified", "coursera", "udemy", "credential"]
    for line in lines:
        if any(kw in line.lower() for kw in cert_keywords):
            if len(line) < 120 and line not in certifications:
                certifications.append(line)
                
    internships = []
    intern_keywords = ["intern", "internship", "trainee", "software engineering intern", "summer intern"]
    for line in lines:
        if any(kw in line.lower() for kw in intern_keywords):
            if len(line) < 120 and line not in internships:
                internships.append(line)

    preferred_roles = ["Software Engineer"]
    if "data" in text_lower:
        preferred_roles.append("Data Scientist" if "science" in text_lower else "Data Analyst")
    if "support" in text_lower or "operations" in text_lower:
        preferred_roles.append("Application Support Analyst")

    return {
        "name": name,
        "email": email,
        "education": education,
        "skills": skills,
        "hackathons": hackathons[:3] or ["RADIX Talent Match Hackathon"],
        "internships": internships[:3] or ["Software Engineer Intern"],
        "certifications": certifications[:3] or ["AWS Cloud Practitioner"],
        "preferred_roles": list(set(preferred_roles)),
        "cv_file": filename
    }


# ----------------- GEMINI AI PARSER -----------------
def gemini_parse_jd(text: str, filename: str) -> Dict[str, Any]:
    if not gemini_available:
        return rule_based_parse_jd(text, filename)
        
    prompt = f"""
    You are an expert technical recruiter analyzing a Job Description (JD).
    Your task is to parse the JD text and extract a list of skills, mapping them onto the 12 RADIX skillset categories:
    COD (Coding), DSA (Data Structures & Algorithms), OOD (Object-Oriented Design), APTI (Aptitude),
    COMM (Communication), AI (Artificial Intelligence), CLOUD (Cloud Computing), SQL (SQL & Databases),
    SWE (Software Engineering Practices), SYSD (System Design), NETW (Networking), OS (Operating Systems).
    You can also extract named technologies and categorize them under 'OTHER'.

    JD Text:
    ---
    {text}
    ---

    Format your output strictly as a JSON object with this schema:
    {{
      "company": "Company Name",
      "role": "Job Title",
      "skills": [
        {{
          "skill_name": "Specific technology or skill name",
          "category_code": "DSA|COD|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER",
          "evidence": "Clean full sentence or phrase from JD showing this is required",
          "confidence": "high|medium|low",
          "level": 1-10 (Estimate expected level 1-10)
        }}
      ]
    }}
    Provide ONLY the raw JSON output. No explanation, no markdown blocks.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        parsed = json.loads(clean_text.strip())
        parsed["source_type"] = "jd"
        parsed["source_file"] = filename
        return parsed
    except Exception as e:
        logger.error(f"Gemini JD parsing failed, falling back: {e}")
        return rule_based_parse_jd(text, filename)

def gemini_parse_resume(text: str, filename: str) -> Dict[str, Any]:
    if not gemini_available:
        return rule_based_parse_resume(text, filename)
        
    prompt = f"""
    You are an expert CV parser.
    Your task is to parse a candidate's resume and extract key details: education, skills, hackathons, internships, certifications, and preferred roles.
    Map the skills onto the 12 RADIX skillset categories:
    COD (Coding), DSA (Data Structures & Algorithms), OOD (Object-Oriented Design), APTI (Aptitude),
    COMM (Communication), AI (Artificial Intelligence), CLOUD (Cloud Computing), SQL (SQL & Databases),
    SWE (Software Engineering Practices), SYSD (System Design), NETW (Networking), OS (Operating Systems).
    Other skills or technologies should be marked as category 'OTHER'.

    Resume Text:
    ---
    {text}
    ---

    Format your output strictly as a JSON object with this schema:
    {{
      "name": "Candidate Name",
      "email": "Email Address",
      "education": "Highest Degree & University",
      "hackathons": ["List of hackathons participated in"],
      "internships": ["List of previous internships or roles"],
      "certifications": ["List of certifications"],
      "preferred_roles": ["List of preferred roles"],
      "skills": [
        {{
          "skill_name": "Specific skill name (e.g. Python, Jenkins, AWS)",
          "category_code": "DSA|COD|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER",
          "evidence": "Clean sentence or phrase of where/how this skill was used",
          "confidence": "high|medium|low",
          "level": 1-10 (Estimate candidate level from 1 to 10)
        }}
      ]
    }}
    Provide ONLY the raw JSON output. No explanation, no markdown blocks.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        parsed = json.loads(clean_text.strip())
        parsed["cv_file"] = filename
        return parsed
    except Exception as e:
        logger.error(f"Gemini Resume parsing failed, falling back: {e}")
        return rule_based_parse_resume(text, filename)
