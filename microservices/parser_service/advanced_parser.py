import os
import re
import json
import logging
import zipfile
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables: check local .env first, then fallback to backend/.env
local_env = os.path.join(os.path.dirname(__file__), '.env')
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', '.env')

if os.path.exists(local_env):
    load_dotenv(local_env)
elif os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_available = False
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_available = True
        logger.info("Advanced Parser: Gemini API is configured.")
    except Exception as e:
        logger.error(f"Advanced Parser: Failed to configure Gemini: {e}")

# Helper to convert PDF to DOCX using pdf2docx
def convert_pdf_to_docx(pdf_path: str, docx_path: str) -> bool:
    try:
        from pdf2docx import Converter
        logger.info(f"Converting PDF '{pdf_path}' to DOCX '{docx_path}'...")
        cv = Converter(pdf_path)
        cv.convert(docx_path, start=0, end=None)
        cv.close()
        return True
    except Exception as e:
        logger.error(f"pdf2docx conversion failed: {e}")
        return False

# Helper to extract word/document.xml from DOCX
def extract_docx_xml(docx_path: str) -> str:
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read("word/document.xml").decode("utf-8")
        return xml_content
    except Exception as e:
        logger.error(f"Failed to extract XML from DOCX: {e}")
        raise e

# Cleanup helper
def safe_delete(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.warning(f"Could not delete temporary file '{filepath}': {e}")


# ----------------- ADVANCED GEMINI JD PARSER -----------------
def gemini_parse_xml_jd(xml_content: str, filename: str) -> Dict[str, Any]:
    if not gemini_available:
        logger.warning("Gemini API key missing. Advanced parser falling back to standard parsing.")
        raise RuntimeError("Gemini API key is not configured for Advanced XML parsing. Please add GEMINI_API_KEY in the parser_service/.env file.")

    # Limit XML size to fit token limit
    xml_cropped = xml_content[:150000]
    
    prompt = f"""
    You are an expert technical recruiter analyzing a Job Description (JD) provided in its raw DOCX XML layout structure.
    Using raw XML allows you to inspect tables, bullet points, headers, and relative formatting.
    Your task is to parse this XML layout, extract the skills required, and map them exactly onto the 12 RADIX skillset categories:
    - COD (Coding): General programming capabilities, scripting, language fluency (e.g. Python, Java, C++, TypeScript).
    - DSA (Data Structures & Algorithms): Core DSA requirements (e.g. hash maps, binary trees, dynamic programming, sorting).
    - OOD (Object-Oriented Design): Class design, SOLID principles, design patterns.
    - APTI (Aptitude): Logical reasoning, mathematical problem-solving.
    - COMM (Communication): Writing, presenting, team collaboration, documentation.
    - AI (Artificial Intelligence): Machine learning, deep learning, LLMs, prompt engineering, computer vision, NLP.
    - CLOUD (Cloud Computing): Cloud platforms (AWS, GCP, Azure), Docker, Kubernetes, CI/CD pipelines.
    - SQL (SQL & Databases): Database management, SQL querying, schema design, NoSQL databases (e.g. MongoDB, Redis).
    - SWE (Software Engineering Practices): Testing frameworks (JUnit, PyTest), Git, version control, agile methodology, code reviews.
    - SYSD (System Design): Scalability, system architecture, microservices, load balancers, caching strategies, message queues (e.g. Kafka, RabbitMQ).
    - NETW (Networking): TCP/IP, DNS, HTTP/HTTPS protocols, firewalls, network routing.
    - OS (Operating Systems): Linux/Unix commands, memory management, threads, processes, file systems.
    - OTHER (For any named technologies like React, Django, Kafka, etc. that do not fit neatly into one of the 12 core categories).

    Analyze the XML content below carefully to extract requirements:

    XML Content:
    ---
    {xml_cropped}
    ---

    Format your output strictly as a JSON object matching this schema:
    {{
      "company": "Company Name",
      "role": "Job Title",
      "skills": [
        {{
          "skill_name": "Specific technology or skill name",
          "category_code": "DSA|COD|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER",
          "evidence": "Short phrase or sentence from the text showing this is required",
          "confidence": "high|medium|low",
          "level": 1-10 (Estimate the expected level from 1 to 10 based on seniority described in the text: Junior=1-4, Mid=5-7, Senior=8-10)
        }}
      ]
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
        
    parsed = json.loads(clean_text.strip())
    parsed["source_type"] = "jd"
    parsed["source_file"] = filename
    return parsed


# ----------------- ADVANCED GEMINI RESUME PARSER -----------------
def gemini_parse_xml_resume(xml_content: str, filename: str) -> Dict[str, Any]:
    if not gemini_available:
        logger.warning("Gemini API key missing. Advanced parser falling back to standard parsing.")
        raise RuntimeError("Gemini API key is not configured for Advanced XML parsing. Please add GEMINI_API_KEY in the parser_service/.env file.")

    xml_cropped = xml_content[:150000]

    prompt = f"""
    You are an expert CV compiler analyzing a candidate's resume provided in its raw DOCX XML layout structure.
    By reading raw XML, you can preserve formatting structure, experience blocks, and list items.
    Your task is to parse this XML layout and extract key details: education, skills, hackathons, internships, certifications, and preferred roles.
    Map the skills onto the 12 RADIX skillset categories:
    - COD (Coding): General programming capabilities, scripting, language fluency (e.g. Python, Java, C++, TypeScript).
    - DSA (Data Structures & Algorithms): Core DSA requirements (e.g. hash maps, binary trees, dynamic programming, sorting).
    - OOD (Object-Oriented Design): Class design, SOLID principles, design patterns.
    - APTI (Aptitude): Logical reasoning, mathematical problem-solving.
    - COMM (Communication): Writing, presenting, team collaboration, documentation.
    - AI (Artificial Intelligence): Machine learning, deep learning, LLMs, prompt engineering, computer vision, NLP.
    - CLOUD (Cloud Computing): Cloud platforms (AWS, GCP, Azure), Docker, Kubernetes, CI/CD pipelines.
    - SQL (SQL & Databases): Database management, SQL querying, schema design, NoSQL databases (e.g. MongoDB, Redis).
    - SWE (Software Engineering Practices): Testing frameworks (JUnit, PyTest), Git, version control, agile methodology, code reviews.
    - SYSD (System Design): Scalability, system architecture, microservices, load balancers, caching strategies, message queues (e.g. Kafka, RabbitMQ).
    - NETW (Networking): TCP/IP, DNS, HTTP/HTTPS protocols, firewalls, network routing.
    - OS (Operating Systems): Linux/Unix commands, memory management, threads, processes, file systems.
    - OTHER (For any named technologies like React, Django, Kafka, etc. that do not fit neatly into one of the 12 core categories).

    Analyze the XML content below carefully to extract the candidate's indicators:

    XML Content:
    ---
    {xml_cropped}
    ---

    Format your output strictly as a JSON object matching this schema:
    {{
      "name": "Candidate Name",
      "email": "Email Address",
      "education": "Highest Degree & University (e.g. B.Tech Computer Science from IIT Delhi)",
      "hackathons": ["List of hackathons participated in"],
      "internships": ["List of previous internships or roles"],
      "certifications": ["List of certifications"],
      "preferred_roles": ["List of preferred roles"],
      "skills": [
        {{
          "skill_name": "Specific skill or technology name",
          "category_code": "DSA|COD|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER",
          "evidence": "Brief description of where/how this skill was used in the CV based on experience descriptions",
          "confidence": "high|medium|low",
          "level": 1-10 (Estimate candidate level from 1 to 10 based on years of experience or complexity described: Beg=1-4, Int=5-7, Adv=8-10)
        }}
      ]
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
        
    parsed = json.loads(clean_text.strip())
    parsed["cv_file"] = filename
    return parsed


# ----------------- ENTRYPOINT DISPATCHERS -----------------
def parse_document_advanced(filepath: str, is_jd: bool = True) -> Dict[str, Any]:
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filepath)[1].lower()
    
    temp_docx = None
    
    try:
        # 1. Handle PDF vs DOCX
        if ext == ".pdf":
            # Generate a temporary docx path in the scratch directory
            scratch_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "scratch")
            os.makedirs(scratch_dir, exist_ok=True)
            temp_docx = os.path.join(scratch_dir, f"temp_{os.path.splitext(filename)[0]}.docx")
            
            # Convert PDF to DOCX
            success = convert_pdf_to_docx(filepath, temp_docx)
            if not success:
                raise RuntimeError("Could not convert PDF to DOCX layout structure.")
            
            target_docx = temp_docx
        elif ext == ".docx":
            target_docx = filepath
        else:
            # Fallback for plain text or doc formats
            raise ValueError(f"Advanced parser requires PDF or DOCX file formats. Got format: {ext}")
            
        # 2. Extract raw XML content
        xml_content = extract_docx_xml(target_docx)
        
        # 3. Call LLM Structurer
        if is_jd:
            result = gemini_parse_xml_jd(xml_content, filename)
        else:
            result = gemini_parse_xml_resume(xml_content, filename)
            
        return result
        
    finally:
        # Clean up temporary DOCX
        if temp_docx:
            safe_delete(temp_docx)
