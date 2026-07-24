import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

try:
    from .parsers import (
        extract_text, 
        gemini_parse_jd, 
        gemini_parse_resume
    )
except ImportError:
    from parsers import (
        extract_text, 
        gemini_parse_jd, 
        gemini_parse_resume
    )

try:
    from .advanced_parser import parse_document_advanced
except ImportError:
    from advanced_parser import parse_document_advanced

# Load environment variables: check local .env first, then fallback to backend/.env
local_env = os.path.join(os.path.dirname(__file__), '.env')
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', '.env')

if os.path.exists(local_env):
    load_dotenv(local_env)
elif os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

app = FastAPI(
    title="RADIX Document Parsing Microservice",
    description="Parser microservice running on port 8001 supporting Standard and XML-based Advanced parsing",
    version="1.0.0"
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FileParseRequest(BaseModel):
    filepath: str
    parser_type: Optional[str] = "standard" # "standard" or "advanced"

@app.get("/")
def read_root():
    return {"status": "running", "service": "RADIX Parser Microservice"}

@app.post("/parse-jd")
async def parse_jd(request: FileParseRequest):
    if not os.path.exists(request.filepath):
        alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), request.filepath)
        if os.path.exists(alt_path):
            request.filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail=f"Job Description file not found: {request.filepath}")
            
    try:
        if request.parser_type == "advanced":
            from advanced_parser import gemini_available
            if not gemini_available:
                raise HTTPException(
                    status_code=400,
                    detail="Google Gemini API key is missing. Please add your GEMINI_API_KEY inside the '.env' file inside the 'microservices/parser_service' folder to run Advanced XML parsing."
                )
            result = parse_document_advanced(request.filepath, is_jd=True)
        else:
            text = extract_text(request.filepath)
            filename = os.path.basename(request.filepath)
            result = gemini_parse_jd(text, filename)
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing Job Description: {str(e)}")

@app.post("/parse-resume")
async def parse_resume(request: FileParseRequest):
    if not os.path.exists(request.filepath):
        alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), request.filepath)
        if os.path.exists(alt_path):
            request.filepath = alt_path
        else:
            raise HTTPException(status_code=404, detail=f"Resume file not found: {request.filepath}")
            
    try:
        if request.parser_type == "advanced":
            from advanced_parser import gemini_available
            if not gemini_available:
                raise HTTPException(
                    status_code=400,
                    detail="Google Gemini API key is missing. Please add your GEMINI_API_KEY inside the '.env' file inside the 'microservices/parser_service' folder to run Advanced XML parsing."
                )
            result = parse_document_advanced(request.filepath, is_jd=False)
        else:
            text = extract_text(request.filepath)
            filename = os.path.basename(request.filepath)
            result = gemini_parse_resume(text, filename)
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing Resume: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
