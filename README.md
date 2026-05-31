<div align="center">

<h1> MedicGraph â€” OCR + Agentic RAG</h1>

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

<p><em>Upload a medical report PDF â†’ Extract text via OCR â†’ Chunk & embed into a vector store â†’ Ask natural-language questions and get grounded, context-aware answers from an LLM.</em></p>

</div>

---

## ðŸ“– Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Environment Variables](#-environment-variables)
- [Usage](#-usage)
- [RAG Pipeline Deep Dive](#-rag-pipeline-deep-dive)
- [Current Project Status](#-current-project-status)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ðŸ” Overview

**MedicGraph-OCR-Agentic-RAG** is an end-to-end system that transforms static medical report PDFs into an interactive, queryable knowledge base. It combines:

1. **OCR & Text Extraction** â€” Extracts text from both selectable and scanned PDFs using `pypdf` and `pytesseract`.
2. **Intelligent Chunking** â€” Splits extracted text into semantically meaningful chunks using LangChain's `RecursiveCharacterTextSplitter`.
3. **Vector Embeddings** â€” Generates embeddings via OpenAI's `text-embedding-ada-002` (routed through OpenRouter) and stores them in ChromaDB.
4. **RAG Chain** â€” Uses Google Gemini (`gemini-2.5-flash`) as the LLM backbone with LangChain's retrieval chain to answer questions grounded exclusively in the medical report's content.

> The system ensures **hallucination-safe responses** by instructing the LLM to only answer from the provided context, making it suitable for sensitive medical data interpretation.

---

## ðŸ— Architecture



---

##  Tech Stack

### Backend
| Technology | Purpose | Version |
|---|---|---|
| **Python** | Core runtime | 3.10+ |
| **FastAPI** | REST API framework | Latest |
| **Uvicorn** | ASGI server | Latest |
| **LangChain** | RAG orchestration framework | 0.2.16 |
| **ChromaDB** | Vector database (persistent) | Latest |
| **pypdf** | PDF text extraction | Latest |
| **pytesseract** | OCR for scanned PDFs | Latest |
| **Pillow / pdf2image** | Image processing for OCR | Latest |
| **Google Gemini** | LLM (gemini-2.5-flash) | via `langchain-google-genai` |
| **OpenAI Embeddings** | Text embeddings (ada-002) | via OpenRouter |
| **Pydantic** | Data validation | â‰¥2.7.0 |
| **python-dotenv** | Environment management | Latest |

### Frontend
| Technology | Purpose | Version |
|---|---|---|
| **Next.js** | React framework | 16.1.1 |
| **React** | UI library | 19.2.3 |
| **TypeScript** | Type safety | ^5 |
| **Tailwind CSS** | Utility-first styling | v4 |

---

##  Project Structure

```
```

> **Legend:**Implemented | = Scaffolded / Planned

---

## ðŸš€ Getting Started

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

### 2. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:8000`.

---

##  Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# OpenRouter API key  used for OpenAI-compatible embedding requests
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here

# Google Gemini API key  used for LLM inference
GEMINI_API_KEY=AIzaSy-your-gemini-key-here
```

>  **Security:** Never commit `.env` files to version control. Both `.gitignore` files already exclude them.

---

##  Usage

### Running the RAG Pipeline Test

The most complete working flow is in the test script:

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

### Listing Available Gemini Models

```bash
cd backend/test
python list_gemini_models.py
```

### FastAPI Endpoints (Current)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check â€” returns `{"Hello": "World"}` |
| `GET` | `/items/{item_id}` | Sample parameterized endpoint |

> ðŸ“Œ The FastAPI server currently runs with scaffold endpoints. Medical report upload and query endpoints are planned.

---

## ðŸ”¬ RAG Pipeline Deep Dive

The core intelligence of this project lives in the Retrieval-Augmented Generation pipeline:

### Step 1: Document Ingestion & OCR
```
PDF â†’ pypdf (selectable text) â†’ fallback to pytesseract (scanned pages)
```

### Step 2: Text Chunking
```python
RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
```
- **Chunk size:** 1000 characters ensures each chunk has enough context for the LLM
- **Overlap:** 200 characters prevents loss of information at chunk boundaries

### Step 3: Embedding & Storage
```
Text Chunks â†’ OpenAI ada-002 Embeddings â†’ ChromaDB (persistent SQLite)
```

### Step 4: Retrieval & Generation
```
User Question â†’ Vector Similarity Search â†’ Top-K Relevant Chunks â†’ Gemini LLM â†’ Grounded Answer
```

### System Prompt (Medical Expert)
```
You are an AI expert assistant in medical reports. Answer questions only based on
provided Context. If the answer is not in the context, just state you don't have
enough information.
```

This constraint ensures the LLM never fabricates medical information â€” a critical safety requirement.

---

## ðŸ“Š Current Project Status

| Component | Status | Notes |
|---|---|---|
| **OCR Text Extraction** | âœ… Working | `pypdf` for selectable text; pytesseract fallback scaffolded |
| **Text Chunking** | âœ… Working | LangChain `RecursiveCharacterTextSplitter` |
| **Vector Embeddings** | âœ… Working | OpenAI `ada-002` via OpenRouter |
| **ChromaDB Vector Store** | âœ… Working | Persistent local storage with SQLite |
| **LLM Integration** | âœ… Working | Google Gemini `2.5-flash` via LangChain |
| **RAG Retrieval Chain** | âœ… Working | Full pipeline tested in `rag_pipeline_test.py` |
| **FastAPI Server** | ðŸ”¶ Scaffold | Basic server running; endpoints not yet wired to RAG |
| **API Route Handlers** | ðŸ”² Planned | `app/api/` directory created but empty |
| **Pydantic Schemas** | ðŸ”² Planned | `app/schemas/` directory created but empty |
| **Data Models** | ðŸ”² Planned | `app/models/` directory created but empty |
| **Agentic AI Modules** | ðŸ”² Planned | `app/Agents/` directory created but empty |
| **Frontend UI** | ðŸ”¶ Scaffold | Default Next.js 16 template; no custom UI yet |
| **Frontend â†” Backend** | ðŸ”² Planned | No API integration between frontend and backend |
| **Scanned PDF OCR** | ðŸ”¶ Partial | Code scaffolded but `pdf2image` integration commented out |
| **Authentication** | ðŸ”² Not Started | â€” |
| **Docker Support** | ðŸ”² Not Started | â€” |
| **Unit Tests** | ðŸ”² Not Started | Only integration test exists |

---

## ðŸ—º Roadmap

### Phase 1 â€” Core API Integration *(Current Focus)*
- [ ] Wire OCR + RAG pipeline into FastAPI endpoints
- [ ] Create `POST /upload` endpoint for PDF ingestion
- [ ] Create `POST /query` endpoint for natural-language questions
- [ ] Define Pydantic schemas for request/response validation
- [ ] Add proper error handling and HTTP status codes

### Phase 2 â€” Frontend Development
- [ ] Build PDF upload interface with drag-and-drop
- [ ] Build chat/query interface for medical report Q&A
- [ ] Display source chunks alongside LLM answers
- [ ] Add loading states and error handling

### Phase 3 â€” Agentic AI Layer
- [ ] Implement multi-step medical reasoning agents
- [ ] Add document comparison capabilities (compare multiple reports)
- [ ] Build knowledge graph from extracted medical entities

### Phase 4 â€” Production Hardening
- [ ] Add authentication and authorization
- [ ] Dockerize backend and frontend
- [ ] Add comprehensive unit and integration tests
- [ ] Set up CI/CD pipeline
- [ ] Add rate limiting and request validation
- [ ] Implement logging and monitoring

---

## ðŸ¤ Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure your code follows the existing project structure and includes appropriate documentation.

---

## ðŸ“„ License

This project is licensed under the MIT License â€” see the [LICENSE](LICENSE) file for details.

---

<div align="center">

<p><strong>Built with  for smarter healthcare</strong></p>

<p><em>MedicGraph  Because every medical report deserves intelligent analysis.</em></p>

</div>
