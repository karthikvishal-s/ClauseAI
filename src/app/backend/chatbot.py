import pdfplumber
import re
import json
import nltk
import os
import time
import google.generativeai as genai
from dotenv import load_dotenv
import numpy as np
import faiss
from nltk.tokenize import sent_tokenize

# --- Gemini Configuration ---
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in .env file.")
genai.configure(api_key=api_key)

# --- Text Preprocessing Functions (No changes needed) ---
def read_pdf(file_path):
    text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text.append(page_text)
    return "\n".join(text)

def preprocess_text(text):
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n(?!\s*(?:\d+\.|\([a-z\d]+\)|[A-Z\s]{5,}))', ' ', text)
    blocks = text.split('\n')
    final_clauses = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        if len(block.split()) < 3 and block.endswith(':'):
            continue
        if re.match(r'^(Lessor|Lessee|Date:)', block, re.IGNORECASE):
            continue
        block = re.sub(r'^\s*(\d+(\.\d+)*\.|\([a-zA-Z\d]+\))\s*', '', block)
        sentences = sent_tokenize(block)
        final_clauses.extend(sentences)
    return final_clauses

# --- Legal Analyzer Class (Updated for Gemini) ---
class LegalAnalyzer:
    def __init__(self, pdf_path):
        print(f"Initializing analyzer with document: {pdf_path}")
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"The document was not found at: {pdf_path}")
        
        raw_text = read_pdf(pdf_path)
        self.clauses = preprocess_text(raw_text)
        self.vector_store = self._create_vector_store()
        print("Analyzer is ready.")

    def _create_vector_store(self, model='models/text-embedding-004'):
        print(f"Creating vector store for {len(self.clauses)} clauses...")
        result = genai.embed_content(model=model, content=self.clauses, task_type="retrieval_document")
        embeddings = result['embedding']
        dimension = len(embeddings[0])
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype('float32'))
        return index

    def ask_question(self, question: str) -> str:
        if not self.vector_store:
            return "Vector store is not available."
        
        question_embedding_response = genai.embed_content(
            model='models/text-embedding-004',
            content=question,
            task_type="retrieval_query"
        )
        question_embedding = question_embedding_response['embedding']
        
        k = 3
        _, indices = self.vector_store.search(np.array([question_embedding]).astype('float32'), k)
        
        relevant_clauses = [self.clauses[i] for i in indices[0]]
        context = "\n".join(relevant_clauses)
        
        rag_model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        prompt = f"Using ONLY the context below, answer the user's question.\n\nCONTEXT:\n{context}\n\nQUESTION: {question}\n\nANSWER:"
        response = rag_model.generate_content(prompt)
        return response.text.strip()