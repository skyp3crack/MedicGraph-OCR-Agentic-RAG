
# rag_pipeline_test.py
# --- Imports ---
import os

from dotenv import load_dotenv
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings  # Corrected imports
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

load_dotenv() # This loads the variables from .env into os.environ



# --- 1. OCR and Text Extraction ---
def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        pdf_reader = PdfReader(pdf_path)
        for page_num, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
            else:
                print(f"Page {page_num + 1} might be scanned. Direct text extraction failed. "
                      "For scanned PDFs, you'd need to convert pages to images and use pytesseract.image_to_string().")
                # Placeholder for actual OCR logic for scanned pages
                # For a robust solution, integrate pdf2image here.
                text += "[OCR_PLACEHOLDER_FOR_SCANNED_PAGE]\n"
    except Exception as e:
        print(f"Error during PDF processing: {e}")
        return None
    return text

# --- PDF File Path ---
pdf_file_name = "1.FORMAT-LAPORAN-PERUBATAN-1-2024-9-MOCK1.pdf"
# Construct absolute path to the data directory regardless of where script is run from
pdf_path = os.path.join(os.path.dirname(__file__), "..", "data", pdf_file_name)

print(f"Attempting to extract text from: {pdf_path}")
medical_report_text = extract_text_from_pdf(pdf_path)

if medical_report_text is None or not medical_report_text.strip():
    print("Failed to extract text from PDF or extracted text is empty. Please check PDF path and content.")
    exit()

print("\n--- Extracted Text (first 500 chars) ---")
print(medical_report_text[:500])


# --- 2. Text Processing and Embeddings ---
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    is_separator_regex=False,
)

chunks = text_splitter.create_documents([medical_report_text])
print(f"\n--- Number of chunks: {len(chunks)} ---")
if not chunks:
    print("No chunks created. Exiting.")
    exit()
print("\n--- First Chunk Content ---")
print(chunks[0].page_content)


# --- 3. Embeddings Model Configuration ---
embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.environ["GEMINI_API_KEY"]
)


# --- 4. Vector Store and RAG ---
print("\n--- Creating/Loading Vector Store ---")
# Ensure persist_directory exists or Chroma will create it
vector_store = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings_model, # Parameter name is 'embedding'
    persist_directory="./chroma_db"
)
print("Vector store created/persisted.")


# --- 5. LLM Initialization ---
llm = GoogleGenerativeAI(
    model="gemini-2.5-flash", # Using a common Gemini model
    google_api_key=os.environ["GEMINI_API_KEY"]
)


# --- 6. Prompt Formatting ---
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI expert assistant in medical reports. Answer questions only based on provided Context. If the answer is not in the context, just state you don't have enough information."),
    ("human", "Context: {context}\nQuestion: {input}")
])

#search_kwargs={"k": 10} for more relevant docs

# --- 7. Create RAG Chain ---
document_chain = create_stuff_documents_chain(llm, prompt)
retriever_vs = vector_store.as_retriever()

retrieval_chain = create_retrieval_chain(
    retriever_vs, # Retriever first
    document_chain # Document chain second
)

# --- 8. Test RAG ---
print("\n--- Testing RAG ---")
question_1 = "What is the patient's name and age ?"
response_1 = retrieval_chain.invoke({"input": question_1})
print(f"Question: {question_1}")
print(f"Answer: {response_1['answer']}")

print("-" * 30)

question_2 = "What medications were prescribed?"
response_2 = retrieval_chain.invoke({"input": question_2})
print(f"Question: {question_2}")
print(f"Answer: {response_2['answer']}")

print("-" * 30)

question_3 = "What is the capital of France?" # Question not in context
response_3 = retrieval_chain.invoke({"input": question_3})
print(f"Question: {question_3}")
print(f"Answer: {response_3['answer']}")
