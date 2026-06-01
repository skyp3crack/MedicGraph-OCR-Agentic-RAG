<div align="center">

<h1> MedicGraph OCR + Agentic RAG</h1>

<p><strong>Intelligent Medical Report Analysis powered by OCR, Vector Search, and LLM-driven Retrieval-Augmented Generation</strong></p>

<p>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python"></a>
  <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16.1-000000?logo=next.js&logoColor=white" alt="Next.js"></a>
  <a href="https://langchain.com"><img src="https://img.shields.io/badge/LangChain-0.2-1C3C3C?logo=langchain&logoColor=white" alt="LangChain"></a>
  <a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google&logoColor=white" alt="Gemini"></a>
  <a href="https://www.trychroma.com"><img src="https://img.shields.io/badge/ChromaDB-Vector_Store-FF6F00" alt="ChromaDB"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
</p>

<hr>

<p><em>Upload a medical report PDF &rarr; Extract text via OCR &rarr; Chunk & embed into a vector store &rarr; Ask natural-language questions and get grounded, context-aware answers from an LLM.</em></p>

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Usage](#-usage)
- [RAG Pipeline Deep Dive](#-rag-pipeline-deep-dive)
- [Current Project Status](#-current-project-status)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

**MedicGraph-OCR-Agentic-RAG** is an end-to-end system that transforms static medical report PDFs into an interactive, queryable knowledge base. It combines:

1. **OCR & Text Extraction** — Extracts text from both selectable and scanned PDFs using `pypdf` with `pytesseract` fallback support.
2. **Intelligent Chunking** — Splits extracted text into semantically meaningful chunks using LangChain's `RecursiveCharacterTextSplitter`.
3. **Vector Embeddings** — Generates embeddings via OpenAI's `text-embedding-ada-002` (routed through OpenRouter) and stores them in ChromaDB.
4. **RAG Chain** — Uses Google Gemini (`gemini-2.5-flash`) as the LLM backbone with LangChain's retrieval chain to answer questions grounded exclusively in the medical report's content.

> The system ensures **hallucination-safe responses** by instructing the LLM to only answer from the provided context, making it suitable for sensitive medical data interpretation.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                       │
│                   http://localhost:3000                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (REST)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (:8000)                        │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ /api/upload│  │ /api/query   │  │ /api/health              │ │
│  └─────┬─────┘  └──────┬───────┘  └──────────────────────────┘ │
│        │               │                                        │
│  ┌─────▼───────────────▼────────────────────────────────────┐  │
│  │              RAG Service (Orchestrator)                    │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ OCR Service  │  │ Embedding    │  │ LLM (Gemini)   │  │  │
│  │  │ (pypdf +     │  │ Service      │  │ via LangChain  │  │  │
│  │  │  tesseract)  │  │ (ada-002)    │  │                │  │  │
│  │  └─────────────┘  └──────┬───────┘  └────────────────┘  │  │
│  └──────────────────────────┼───────────────────────────────┘  │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   ChromaDB      │                          │
│                    │  (Vector Store) │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙ Tech Stack

### Backend
| Technology | Purpose | Version |
|---|---|---|
| **Python** | Core runtime | 3.10+ |
| **FastAPI** | REST API framework with auto-docs | ≥0.100 |
| **Uvicorn** | ASGI server | Latest |
| **LangChain** | RAG orchestration framework | 0.2.x |
| **ChromaDB** | Vector database (persistent) | ≥0.4.0 |
| **pypdf** | PDF text extraction | ≥4.0.0 |
| **pytesseract** | OCR for scanned PDFs | ≥0.3.10 |
| **Pillow / pdf2image** | Image processing for OCR | Latest |
| **Google Gemini** | LLM (`gemini-2.5-flash`) | via `langchain-google-genai` |
| **OpenAI Embeddings** | Text embeddings (`ada-002`) | via OpenRouter |
| **Pydantic** | Data validation & settings | ≥2.7.0 |
| **Pydantic Settings** | Environment configuration | ≥2.2.0 |

### Frontend
| Technology | Purpose | Version |
|---|---|---|
| **Next.js** | React framework | 16.1.1 |
| **React** | UI library | 19.2.3 |
| **TypeScript** | Type safety | ^5 |
| **Tailwind CSS** | Utility-first styling | v4 |

---

## 📁 Project Structure

```
MedicGraph-OCR-Agentic-RAG/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                 # Centralized settings (Pydantic BaseSettings)
│   │   ├── Services/
│   │   │   ├── __init__.py
│   │   │   ├── ocr_service.py        # PDF text extraction (pypdf + tesseract)
│   │   │   ├── embedding_service.py  # Text chunking + vector store management
│   │   │   └── rag_service.py        # RAG pipeline orchestrator
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py             # FastAPI endpoint handlers
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── requests.py           # Pydantic request models
│   │   │   └── responses.py          # Pydantic response models
│   │   ├── models/                   # Data models (planned)
│   │   └── Agents/                   # Agentic AI modules (planned)
│   ├── data/                         # Sample medical report PDFs
│   ├── test/
│   │   ├── rag_pipeline_test.py      # End-to-end RAG integration test
│   │   └── list_gemini_models.py     # Utility: list available Gemini models
│   ├── main.py                       # FastAPI application entry point
│   ├── requirements.txt              # Pinned Python dependencies
│   ├── .env.example                  # Environment variable template
│   ├── .gitignore
│   └── pyrightconfig.json            # Type checking configuration
├── frontend/                         # Next.js 16 application (scaffold)
├── doc/
│   └── adr/
│       └── 0001-choose-docling-for-medical-ocr.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Notes |
|---|---|
| **Python 3.10+** | Backend runtime |
| **Node.js 18+** | Frontend runtime |
| **Tesseract OCR** | Required for scanned PDF support. [Install guide](https://github.com/tesseract-ocr/tesseract) |
| **Poppler** | Required by `pdf2image` for PDF-to-image conversion. [Install guide](https://poppler.freedesktop.org/) |
| **OpenRouter API Key** | For OpenAI embedding access. [Get one](https://openrouter.ai/) |
| **Google Gemini API Key** | For LLM inference. [Get one](https://aistudio.google.com/apikey) |

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/MedicGraph-OCR-Agentic-RAG.git
cd MedicGraph-OCR-Agentic-RAG/backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your actual API keys (see Environment Variables section)

# Run the FastAPI development server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory (use `.env.example` as a template):

```env
# Required — API Keys
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
GEMINI_API_KEY=AIzaSy-your-gemini-key-here

# Optional — Model Configuration (defaults shown)
# EMBEDDING_MODEL=text-embedding-ada-002
# EMBEDDING_API_BASE=https://openrouter.ai/api/v1
# LLM_MODEL=gemini-2.5-flash

# Optional — Storage Configuration (defaults shown)
# CHROMA_PERSIST_DIR=./chroma_db
# UPLOAD_DIR=./uploads

# Optional — Chunking Configuration (defaults shown)
# CHUNK_SIZE=1000
# CHUNK_OVERLAP=200
# RETRIEVER_K=5
```

> ⚠ **Security:** Never commit `.env` files to version control. Both `.gitignore` files already exclude them.

---

## 📡 API Reference

### `GET /`
Root endpoint — returns service info and links.

```json
{
  "service": "MedicGraph OCR + Agentic RAG",
  "version": "0.1.0",
  "docs": "/docs",
  "health": "/api/health"
}
```

### `POST /api/upload`
Upload a medical report PDF for ingestion into the RAG pipeline.

**Request:** `multipart/form-data` with a `file` field (PDF only)

**Response:**
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "num_chunks": 12,
  "characters_extracted": 8450,
  "message": "Successfully ingested 'report.pdf' into 12 chunks"
}
```

### `POST /api/query`
Ask a natural-language question about a previously ingested document.

**Request:**
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What is the patient's diagnosis?"
}
```

**Response:**
```json
{
  "answer": "Based on the medical report, the patient was diagnosed with...",
  "source_chunks": [
    {
      "content": "...relevant text from the report...",
      "metadata": {}
    }
  ],
  "document_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `GET /api/health`
Health check with service status.

```json
{
  "status": "healthy",
  "services": {
    "fastapi": "healthy",
    "rag_service": "healthy",
    "loaded_documents": "2"
  },
  "version": "0.1.0"
}
```

> 📘 **Full interactive documentation** is auto-generated at `http://localhost:8000/docs` (Swagger UI).

---

## 💻 Usage

### Using the API (cURL)

```bash
# 1. Upload a medical report PDF
curl -X POST http://localhost:8000/api/upload \
  -F "file=@path/to/medical_report.pdf"

# 2. Query the ingested document (use the document_id from step 1)
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"document_id": "YOUR_DOCUMENT_ID", "question": "What is the patient diagnosis?"}'

# 3. Check service health
curl http://localhost:8000/api/health
```

### Running the RAG Pipeline Test (Standalone)

For direct pipeline testing without the API server:

```bash
cd backend/test
python rag_pipeline_test.py
```

This will:
1. Load the sample medical report PDF from `backend/data/`
2. Extract text using `pypdf`
3. Chunk the text into 1000-character segments with 200-character overlap
4. Generate embeddings via OpenRouter (OpenAI `text-embedding-ada-002`)
5. Store vectors in ChromaDB (`backend/test/chroma_db/`)
6. Initialize Google Gemini (`gemini-2.5-flash`) as the LLM
7. Ask 3 test questions and print the RAG-grounded answers

---

## 🔬 RAG Pipeline Deep Dive

The core intelligence of this project lives in the Retrieval-Augmented Generation pipeline:

### Step 1: Document Ingestion & OCR
```
PDF → pypdf (selectable text) → fallback to pytesseract (scanned pages)
```

### Step 2: Text Chunking
```python
RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
```
- **Chunk size:** 1000 characters ensures each chunk has enough context for the LLM
- **Overlap:** 200 characters prevents loss of information at chunk boundaries

### Step 3: Embedding & Storage
```
Text Chunks → OpenAI ada-002 Embeddings → ChromaDB (persistent SQLite)
```

### Step 4: Retrieval & Generation
```
User Question → Vector Similarity Search → Top-K Relevant Chunks → Gemini LLM → Grounded Answer
```

### System Prompt (Medical Expert)
```
You are an AI expert assistant in medical reports. Answer questions only based on
provided Context. If the answer is not in the context, just state you don't have
enough information. Be precise and cite specific findings from the report when possible.
```

This constraint ensures the LLM never fabricates medical information — a critical safety requirement.

---

## 📊 Current Project Status

| Component | Status | Notes |
|---|---|---|
| **OCR Text Extraction** | ✅ Working | `pypdf` for selectable text; pytesseract fallback scaffolded |
| **Text Chunking** | ✅ Working | LangChain `RecursiveCharacterTextSplitter` |
| **Vector Embeddings** | ✅ Working | OpenAI `ada-002` via OpenRouter |
| **ChromaDB Vector Store** | ✅ Working | Persistent local storage with SQLite |
| **LLM Integration** | ✅ Working | Google Gemini `2.5-flash` via LangChain |
| **RAG Retrieval Chain** | ✅ Working | Full pipeline tested in `rag_pipeline_test.py` |
| **Service Architecture** | ✅ Working | Modular services: OCR, Embedding, RAG |
| **Pydantic Settings** | ✅ Working | Centralized config via `BaseSettings` |
| **FastAPI Server** | ✅ Working | CORS-enabled with structured logging |
| **API Endpoints** | ✅ Working | `POST /upload`, `POST /query`, `GET /health` |
| **Pydantic Schemas** | ✅ Working | Request/response validation models |
| **Agentic AI Modules** | 🔲 Planned | `app/Agents/` directory reserved |
| **Frontend UI** | 🔶 Scaffold | Default Next.js 16 template; no custom UI yet |
| **Frontend ↔ Backend** | 🔲 Planned | CORS configured; API integration pending |
| **Scanned PDF OCR** | 🔶 Partial | Code scaffolded; requires Tesseract + Poppler setup |
| **Authentication** | 🔲 Not Started | — |
| **Docker Support** | 🔲 Not Started | — |
| **Unit Tests** | 🔲 Not Started | Only integration test exists |

---

## 🗺 Roadmap

### Phase 1 — Core API Integration ✅ *(Completed)*
- [x] Wire OCR + RAG pipeline into FastAPI endpoints
- [x] Create `POST /api/upload` endpoint for PDF ingestion
- [x] Create `POST /api/query` endpoint for natural-language questions
- [x] Define Pydantic schemas for request/response validation
- [x] Add proper error handling and HTTP status codes
- [x] Add CORS middleware for frontend integration
- [x] Centralize configuration with Pydantic BaseSettings

### Phase 2 — Frontend Development
- [ ] Build PDF upload interface with drag-and-drop
- [ ] Build chat/query interface for medical report Q&A
- [ ] Display source chunks alongside LLM answers
- [ ] Add loading states and error handling

### Phase 3 — Agentic AI Layer
- [ ] Implement multi-step medical reasoning agents
- [ ] Add document comparison capabilities (compare multiple reports)
- [ ] Build knowledge graph from extracted medical entities

### Phase 4 — Production Hardening
- [ ] Add authentication and authorization
- [ ] Dockerize backend and frontend
- [ ] Add comprehensive unit and integration tests
- [ ] Set up CI/CD pipeline
- [ ] Add rate limiting and request validation
- [ ] Implement logging and monitoring

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure your code follows the existing project structure and includes appropriate documentation.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

<p><strong>Built with ❤ for smarter healthcare</strong></p>

<p><em>MedicGraph — Because every medical report deserves intelligent analysis.</em></p>

</div>
