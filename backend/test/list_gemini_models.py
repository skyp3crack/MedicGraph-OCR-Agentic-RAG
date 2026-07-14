
import os

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv() # Load your .env file

# Configure the API key
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

print("Available Gemini Models:")
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(f"  - {m.name} (version: {m.version})")
        # You can also print more details if needed:
        # print(f"    Description: {m.description}")
        # print(f"    Input Token Limit: {m.input_token_limit}")
        # print(f"    Output Token Limit: {m.output_token_limit}")
        # print(f"    Temperature: {m.temperature}")
        # print(f"    Top P: {m.top_p}")
        # print(f"    Top K: {m.top_k}")
