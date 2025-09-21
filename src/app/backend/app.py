# app.py
import os
import re
import json
import tempfile
import requests
import pdfplumber
import openai
import nltk
import time
import traceback
from nltk.tokenize import sent_tokenize
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Assuming chatbot.py is in the same directory as app.py
from chatbot import LegalAnalyzer

# ------------------- Config -------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in .env")

openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

nltk.download("punkt", quiet=True)

# ------------------- FastAPI Init -------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Global Cache for Analyzers -------------------
analyzer_cache = {}

# ------------------- Helpers -------------------
def read_pdf_from_url(url: str) -> str:
    """Download PDF from URL and extract text."""
    try:
        r = requests.get(url, stream=True, timeout=30)
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download PDF: {e}")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        for chunk in r.iter_content(chunk_size=8192):
            tmp.write(chunk)
        tmp_path = tmp.name

    texts = []
    with pdfplumber.open(tmp_path) as pdf:
        for p in pdf.pages:
            texts.append(p.extract_text() or "")
    full_text = "\n".join(texts)

    try:
        os.remove(tmp_path)
    except Exception:
        pass

    return full_text

def preprocess_text_to_clauses(text: str):
    """Split document into clauses using sentence tokenizer."""
    text = re.sub(r"\s+", " ", text).strip()
    clauses = sent_tokenize(text)
    return [c.strip() for c in clauses if len(c.strip()) > 10]

def chunk_list(items, chunk_size):
    """Yield successive chunks from a list."""
    for i in range(0, len(items), chunk_size):
        yield items[i:i+chunk_size]

def safe_json_parse(text: str):
    """Safely parse JSON returned from OpenAI, clean up code blocks."""
    text = text.strip().lstrip("```json").rstrip("```").strip()
    text = re.sub(r'\n(?=\s*")', '', text)
    try:
        return json.loads(text)
    except Exception:
        return []

SYSTEM_PROMPT = """
You are an expert legal risk analyst. You will be given a JSON array of legal clauses, each with "id" and "text".
Return a JSON array of objects { "id": <id>, "analysis": { "risky": boolean, "score": integer 0-100, "summary": "<one-sentence summary>", "reason": "<one-sentence reason>", "category": "<one of ['Financial','Liability','Operational','Compliance','Termination','Data Privacy','Intellectual Property','Uncategorized']>" } }
Respond ONLY with the JSON array (no extra commentary).
"""

def call_openai_analyze_batch(clauses_with_ids, retries=2, delay=2):
    """Call OpenAI to analyze a batch of clauses with retry mechanism."""
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(clauses_with_ids, ensure_ascii=False)}
        ],
        "temperature": 0,
        "max_tokens": 2000
    }

    for attempt in range(retries + 1):
        try:
            resp = openai_client.chat.completions.create(**payload)
            text = resp.choices[0].message.content
            return safe_json_parse(text)
        except Exception as e:
            if attempt < retries:
                time.sleep(delay)
            else:
                raise HTTPException(status_code=500, detail=f"OpenAI API error: {e}")


@app.get("/analyze")
async def analyze(fileUrl: str = Query(..., description="Public URL of uploaded PDF")):
    try:
        full_text = read_pdf_from_url(fileUrl)
        if not full_text.strip():
            return {
                "document_summary": {
                    "overall_risk_score": 0, "risk_summary": "PDF contains no extractable text.", "total_clauses": 0, "risky_clause_count": 0
                },
                "clause_by_clause_analysis": []
            }

        clauses = preprocess_text_to_clauses(full_text)
        if not clauses:
            return {
                "document_summary": {
                    "overall_risk_score": 0, "risk_summary": "No clauses found.", "total_clauses": 0, "risky_clause_count": 0
                },
                "clause_by_clause_analysis": []
            }

        clauses_with_ids = [{"id": i, "text": c} for i, c in enumerate(clauses)]

        batch_size = 10
        final_results = []
        for batch in chunk_list(clauses_with_ids, batch_size):
            analyses = call_openai_analyze_batch(batch)
            for a in analyses:
                cid = a.get("id")
                analysis = a.get("analysis", {})
                clause_text = next((c["text"] for c in batch if c["id"] == cid), "")
                final_results.append({
                    "Clause": clause_text, **analysis
                })

        risky = [r for r in final_results if r.get("risky")]
        if risky:
            avg_score = sum(r["score"] for r in risky) / len(risky)
            top = sorted(risky, key=lambda x: x["score"], reverse=True)[:3]
            risk_summary = "Primary risks:\n" + "\n".join([f"- {t['summary']} (Score: {t['score']})" for t in top])
            overall = {
                "overall_risk_score": round(avg_score),
                "risk_summary": risk_summary,
                "total_clauses": len(final_results),
                "risky_clause_count": len(risky)
            }
        else:
            overall = {
                "overall_risk_score": 0,
                "risk_summary": "No significant risks were identified.",
                "total_clauses": len(final_results),
                "risky_clause_count": 0
            }

        return {
            "document_summary": overall,
            "clause_by_clause_analysis": final_results
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


@app.get("/chat")
async def chat_with_document(fileUrl: str, question: str):
    """
    Answers a question about a document using the LegalAnalyzer chatbot.
    """
    try:
        if fileUrl not in analyzer_cache:
            print(f"Creating new LegalAnalyzer instance for URL: {fileUrl}")
            
            r = requests.get(fileUrl, stream=True, timeout=30)
            r.raise_for_status()
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                for chunk in r.iter_content(chunk_size=8192):
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            analyzer_cache[fileUrl] = LegalAnalyzer(pdf_path=tmp_path)
            
            os.remove(tmp_path)
            print(f"Analyzer instance for {fileUrl} created and cached.")
            
        analyzer = analyzer_cache[fileUrl]
        
        answer = analyzer.ask_question(question)
        
        return {"answer": answer}

    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to download PDF: {e}")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found. Please re-upload.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")