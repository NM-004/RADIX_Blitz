import os
import json
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv

# Load env configurations
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
        logger.info("Vector DB: Gemini API is configured for embeddings.")
    except Exception as e:
        logger.error(f"Vector DB: Failed to configure Gemini API: {e}")


class EmbeddingClient:
    """Client to generate text embeddings using Gemini API."""
    @staticmethod
    def get_embedding(text: str) -> Optional[List[float]]:
        if not gemini_available:
            logger.warning("Gemini API not available. Cannot generate embedding.")
            return None
        try:
            import google.generativeai as genai
            response = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return response.get("embedding", None)
        except Exception as e:
            logger.error(f"Failed to generate embedding for text '{text[:30]}...': {e}")
            return None


class TurboQuantIndex:
    """
    Vector search index that mimics Turbovec API structure.
    Implements high-performance numpy cosine similarity matching with automatic file persistence.
    """
    def __init__(self, index_name: str, dimension: int = 768):
        self.index_name = index_name
        self.dimension = dimension
        self.vectors: Dict[str, List[float]] = {}
        self.metadata: Dict[str, Dict[str, Any]] = {}
        
        # Setup storage folder inside scratch/vector_store/
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.storage_dir = os.path.join(project_root, "scratch", "vector_store")
        os.makedirs(self.storage_dir, exist_ok=True)
        self.file_path = os.path.join(self.storage_dir, f"{index_name}_store.json")
        
        # Load existing index if it exists
        self.load()

    def add_vector(self, key: str, vector: Optional[List[float]], meta: Optional[Dict[str, Any]] = None):
        """Adds a vector and its metadata to the local index."""
        if vector is not None:
            if len(vector) != self.dimension:
                raise ValueError(f"Vector dimension mismatch. Expected {self.dimension}, got {len(vector)}")
            self.vectors[key] = vector
        
        self.metadata[key] = meta or {}
        self.save()

    def query(self, query_vector: List[float], top_k: int = 5) -> List[Tuple[str, float, Dict[str, Any]]]:
        """Runs cosine similarity query against the stored vectors."""
        if not self.vectors:
            return []
            
        if len(query_vector) != self.dimension:
            raise ValueError(f"Query vector dimension mismatch. Expected {self.dimension}, got {len(query_vector)}")
            
        q_arr = np.array(query_vector)
        q_norm = np.linalg.norm(q_arr)
        if q_norm == 0:
            return []
            
        results = []
        for key, vec in self.vectors.items():
            v_arr = np.array(vec)
            v_norm = np.linalg.norm(v_arr)
            if v_norm == 0:
                similarity = 0.0
            else:
                similarity = float(np.dot(q_arr, v_arr) / (q_norm * v_norm))
                
            results.append((key, similarity, self.metadata.get(key, {})))
            
        # Sort by similarity in descending order
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def clear(self):
        """Wipes the index."""
        self.vectors = {}
        self.metadata = {}
        if os.path.exists(self.file_path):
            try:
                os.remove(self.file_path)
            except Exception as e:
                logger.error(f"Failed to delete index file: {e}")
        self.save()

    def save(self):
        """Persists the index vectors and metadata to disk."""
        data = {
            "vectors": self.vectors,
            "metadata": self.metadata,
            "dimension": self.dimension
        }
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save vector index '{self.index_name}': {e}")

    def load(self):
        """Loads index state from disk."""
        if not os.path.exists(self.file_path):
            return
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.vectors = data.get("vectors", {})
                self.metadata = data.get("metadata", {})
                self.dimension = data.get("dimension", 768)
                logger.info(f"Loaded {len(self.vectors)} vectors into '{self.index_name}' index.")
        except Exception as e:
            logger.error(f"Failed to load vector index '{self.index_name}': {e}")
