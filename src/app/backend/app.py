import os
import json
import re
import pdfplumber
import nltk
from nltk.tokenize import sent_tokenize
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

# Setup
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found.")
genai.configure(api_key=api_key)

nltk.download("punkt")
nltk.download("punkt_tab")

app = FastAPI()

# Allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_pdf(file_path):
    text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text.append(page_text)
    return "\n".join(text)


def preprocess_text(text):
    text = re.sub(r"\s+", " ", text).strip()
    return sent_tokenize(text)


def analyze_clauses_in_batch(clauses):
    model = genai.GenerativeModel(model_name="gemini-2.5-flash")
    clauses_with_ids = [{"id": i, "text": clause} for i, clause in enumerate(clauses)]

    system_prompt = """
    You are an expert legal risk analyst. You will be given a JSON array of legal clauses.
    Return a JSON array where each clause has:
    - id
    - analysis { risky, score, summary, reason, category }
    Categories: ['Financial','Liability','Operational','Compliance','Termination','Data Privacy','Intellectual Property','Uncategorized']
    """

    prompt = f"{system_prompt}\n\nCLAUSES_JSON:\n{json.dumps(clauses_with_ids, indent=2)}"
    response = model.generate_content(prompt)
    json_text = response.text.strip().replace("```json", "").replace("```", "")
    analyses = json.loads(json_text)

    analysis_map = {item["id"]: item["analysis"] for item in analyses}
    return [
        {
            "Clause": c["text"],
            **analysis_map.get(c["id"], {
                "risky": False, "score": 0,
                "summary": "Not analyzed",
                "reason": "Not analyzed",
                "category": "Error"
            })
        }
        for c in clauses_with_ids
    ]


def calculate_overall_risk(analysis_results):
    risky_clauses = [r for r in analysis_results if r.get("risky")]
    if not risky_clauses:
        return {
            "overall_risk_score": 0,
            "risk_summary": "No significant risks identified.",
            "total_clauses": len(analysis_results),
            "risky_clause_count": 0
        }
    avg_score = sum(c["score"] for c in risky_clauses) / len(risky_clauses)
    top_risks = sorted(risky_clauses, key=lambda x: x["score"], reverse=True)[:3]
    risk_summary = "Top risks:\n" + "\n".join(
        f"- {c['summary']} (Score {c['score']})" for c in top_risks
    )
    return {
        "overall_risk_score": round(avg_score),
        "risk_summary": risk_summary,
        "total_clauses": len(analysis_results),
        "risky_clause_count": len(risky_clauses)
    }


@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    text = read_pdf(temp_path)
    clauses = preprocess_text(text)
    clause_analysis = analyze_clauses_in_batch(clauses)
    summary = calculate_overall_risk(clause_analysis)

    os.remove(temp_path)

    return {
        "document_summary": summary,
        "clause_by_clause_analysis": clause_analysis
    }
