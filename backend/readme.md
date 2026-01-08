
Project Goal: Take a sample medical report (PDF), extract its text, process it, and then use an LLM to answer questions based only on the information within that report.

# Sample Data: A medical report PDF.
# OCR: Convert PDF to text.
# Text Processing: Chunk the text for RAG.
# Embeddings: Create numerical representations of text chunks.
# Vector Store: Store embeddings for efficient retrieval.
# LLM Integration: Use an LLM to answer questions based on retrieved context.


OCR (PDF to text)
Text Processing (Chunking)
Embeddings
Vector Store (ChromaDB)
LLM Integration (Gemini)
RAG Chain (using LangChain)