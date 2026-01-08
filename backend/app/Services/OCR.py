# Sample Data: A medical report PDF.
# OCR: Convert PDF to text.
from pypdf import PdfReader
import pytesseract
from PIL import Image # Imported but not used in the provided code snippet for OCR
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import GoogleGenerativeAI # This should be from langchain_google_genai for Google Generative AI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

import os

# --- 1. Tesseract-OCR Engine Path (CRITICAL for OCR) ---
# You MUST set the path to your Tesseract executable if it's not in your system's PATH.
# Example for Windows:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# For Linux/macOS, it's usually in PATH if installed correctly.

# --- 2. OCR and Text Extraction ---
def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        pdf_reader = PdfReader(pdf_path)
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text: # If extract_text() returns content (selectable text)
                text += page_text + "\n"
            else: # If page.extract_text() is empty, it might be a scanned PDF, so try OCR
                # This part requires converting PDF page to image first.
                # For a simple demo, you might manually convert one page to PNG/JPG.
                # For a robust solution, you'd need 'pdf2image' library and 'poppler' utility.
                print(f"Page {pdf_reader.pages.index(page) + 1} might be scanned. Attempting OCR...")
                # Placeholder for actual OCR logic (requires pdf2image and PIL.Image)
                # from pdf2image import convert_from_path
                # images = convert_from_path(pdf_path, first_page=pdf_reader.pages.index(page)+1, last_page=pdf_reader.pages.index(page)+1)
                # if images:
                #     text += pytesseract.image_to_string(images[0]) + "\n"
                # else:
                #     print(f"OCR failed for page {pdf_reader.pages.index(page) + 1}.")
                # For now, let's just add a placeholder or skip if OCR is not fully implemented
                text += "[OCR_PLACEHOLDER_FOR_SCANNED_PAGE]\n" # Or handle as per your project's scope
    except Exception as e:
        print(f"Error during PDF processing: {e}")
        return None
    return text

# --- 3. Execution Flow Issue (for FastAPI) ---
# The following lines execute immediately when OCR.py is imported/run.
# In a FastAPI backend, you typically want these to be part of a function
# that an endpoint calls, or initialized once when the app starts.

# --- 4. PDF File Path Mismatch ---
# The image shows your PDF is named '1.FORMAT-LAPORAN-PERUBATAN-1-2024-9-M...' inside 'backend/data/'.
# Your OCR.py is in 'backend/app/Services/'.
# So, the relative path should be adjusted.
pdf_file_name = "1.FORMAT-LAPORAN-PERUBATAN-1-2024-9-M.pdf" # Assuming it's a .pdf
pdf_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", pdf_file_name)

medical_report = extract_text_from_pdf(pdf_path)

# Handle case where text extraction fails
if medical_report is None or not medical_report.strip():
    print("Failed to extract text from PDF or extracted text is empty. Exiting.")
    # In a FastAPI context, you'd raise an HTTPException or return an error response.
    exit() # For a standalone script

print(medical_report[:500])


# --- 5. Text Processing and Embeddings ---
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    is_separator_regex=False,
)

# Ensure medical_report is not None/empty before chunking
chunks = text_splitter.create_documents([medical_report])
print(f"Number of chunks: {len(chunks)}")
if not chunks:
    print("No chunks created. Exiting.")
    exit() # For a standalone script
print(chunks[0].page_content)


# --- 6. Embeddings Model Configuration ---
# 'qwen/qwen3-embedding-8b' is not a standard model for OpenAIEmbeddings.
# If using OpenRouter, you might need a specific LangChain integration for OpenRouter,
# or ensure OpenRouter exposes this Qwen model via an OpenAI-compatible endpoint
# that OpenAIEmbeddings can correctly interpret.
# For standard OpenAI models, it would be "text-embedding-ada-002" or "text-embedding-3-small".
# If you intend to use Qwen via OpenRouter, verify the exact model string and how LangChain handles it.
# For a quick test, consider using a standard OpenAI embedding model or Google's.
embeddings_model = OpenAIEmbeddings(
    model="text-embedding-ada-002", # Recommended for standard OpenAI
    # openai_api_base="https://openrouter.ai/api/v1", # Correct base URL for OpenRouter
    # openai_api_key=os.environ["OPENROUTER_API_KEY"] # Use OPENROUTER_API_KEY for OpenRouter
)
# If you specifically want Qwen via OpenRouter, you might need to check OpenRouter's documentation
# or use a custom LLM class if LangChain's OpenAIEmbeddings doesn't map it directly.


# --- 7. Vector Store and RAG ---
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings_model, # Parameter name is 'embedding', not 'embedding_function'
    persist_directory="./chroma_db"
)
vector_store.persist()


# --- 8. LLM Initialization Error ---
# 'GoogleGenerativeAI' class itself is the LLM. It does not have a '.build()' method.
# Also, ensure you import from 'langchain_google_genai'
from langchain_google_genai import GoogleGenerativeAI # Correct import

llm = GoogleGenerativeAI(
    model="gemini-pro", # 'gemini-2.0-flash-exp' might be an experimental or specific version. 'gemini-pro' is more common.
    google_api_key=os.environ["GEMINI_API_KEY"] # Use google_api_key for GoogleGenerativeAI
)

# --- 9. Prompt Formatting ---
# 'CO-START' is a typo. The prompt template uses '{context}' and '{input}'.
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI expert assistant in medical reports. Answer questions only based on provided Context. If the answer is not in the context, just state you don't have enough information."),
    ("human", "Context: {context}\nQuestion: {input}")
])


# --- 10. create_retrieval_chain Arguments Order ---
# The arguments are swapped. It should be (retriever, document_chain).
documents_chain = create_stuff_documents_chain(llm, prompt)
retriever_vs = vector_store.as_retriever()

retrieval_chain = create_retrieval_chain(
    retriever_vs, # Retriever first
    documents_chain # Document chain second
)

# --- 11. Test RAG ---
Questions = "What is patient name and diagnosis" # Typo: 'Questions' should be 'question' for consistency
response = retrieval_chain.invoke({"input": Questions})
print(f"Question: {Questions}")
print(f"Answer: {response['answer']}")
