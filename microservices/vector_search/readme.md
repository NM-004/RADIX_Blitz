# Vector Search Microservice

This microservice provides an extremely fast, high-performance API for calculating skill matches between a candidate and a company's job requirements. It utilizes **Google's TurboQuant (turbovec)** for vector search and **BAAI/bge-small-en-v1.5** for high-quality semantic skill embeddings.

## How it Works

1. **Semantic Matching**: Instead of matching exact keywords (e.g., "React JS" != "React"), it converts skills into vector embeddings and matches them based on semantic similarity using L2 distance.
2. **Dynamic Request Scoping**: For every request, an ephemeral index is created to compare only the candidate's skills against the company's required skills.
3. **Global Knowledge Base**: As a secondary feature, it acts as a global collector. Every unique skill sent to this API (from candidates or companies) is embedded and permanently saved into a global vector database stored on disk, allowing for future analytics on all skills passing through the system.

## File and Folder Structure

- `main.py`: The core FastAPI application. It contains the server setup, the SentenceTransformer model initialization, and the logic for the `/vector-match` endpoint.
- `requirements.txt`: The python dependencies required to run this microservice (`fastapi`, `turbovec`, `sentence-transformers`, `pydantic`, `numpy`).
- `test.ipynb`: A Jupyter notebook containing a quick script to test the `/vector-match` API endpoint locally.
- `global_skills_index.tv`: *(Generated automatically at runtime)* The persistent binary TurboQuant index containing all unique skills ever processed by the API.
- `global_skills.json`: *(Generated automatically at runtime)* A JSON array mapping strings to the vectors inside `global_skills_index.tv`.

## Running the API

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the FastAPI server (we recommend port 8001 to avoid conflicts):
   ```bash
   uvicorn main:app --reload --port 8001
   ```
3. The API will now be listening at `http://127.0.0.1:8001`. You can open `http://127.0.0.1:8001/docs` in your browser to test it via Swagger UI, or use the provided `test.ipynb`.
