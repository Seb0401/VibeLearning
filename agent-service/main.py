import os
import uvicorn
import asyncio

# Load local environment variables if available
for dotenv_path in ["../.env.local", ".env.local"]:
    if os.path.exists(dotenv_path):
        try:
            with open(dotenv_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        parts = line.split("=", 1)
                        k = parts[0].strip().replace("\x00", "")
                        v = parts[1].strip().replace("\x00", "")
                        if v.startswith('"') and v.endswith('"'):
                            v = v[1:-1]
                        elif v.startswith("'") and v.endswith("'"):
                            v = v[1:-1]
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"Warning loading env: {e}")

if "GEMINI_API_KEY" in os.environ and "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.adk.apps import App
from google.adk.runners import InMemoryRunner
from google.genai import types as genai_types
from agent import root_agent
from tools import transcript_var, material_summary_var

app = FastAPI(title="Agent Service - VibeLearning")

use_vertexai = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
if use_vertexai:
    client = genai.Client()
else:
    client = genai.Client(vertexai=False, api_key=os.environ.get("GOOGLE_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ADK App and Runner
adk_app = App(name="education_assistant", root_agent=root_agent)
runner = InMemoryRunner(app=adk_app)

class ChatRequest(BaseModel):
    question: str
    transcript: str = ""
    material_summary: str = ""
    user_id: str = "default_student"
    session_id: str = "default_session"

class ChatResponse(BaseModel):
    answer: str

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Agent Service"}

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not req.question:
        raise HTTPException(status_code=400, detail="missing question")
        
    # Set context variables for the duration of the request
    transcript_token = transcript_var.set(req.transcript)
    material_summary_token = material_summary_var.set(req.material_summary)
    
    try:
        # Check if session exists, otherwise create it
        session = await runner.session_service.get_session(
            app_name=adk_app.name,
            user_id=req.user_id,
            session_id=req.session_id
        )
        if not session:
            await runner.session_service.create_session(
                app_name=adk_app.name,
                user_id=req.user_id,
                session_id=req.session_id
            )

        user_message = genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=req.question)]
        )
        
        # Run agent asynchronously
        event_stream = runner.run_async(
            user_id=req.user_id,
            session_id=req.session_id,
            new_message=user_message
        )
        
        answer_text = ""
        source = "rag_local"  # default
        async for event in event_stream:
            # Accumulate text content of the events
            if event.content and event.content.parts:
                part_text = event.content.parts[0].text
                if part_text:
                    answer_text += part_text
            
            # Detect which tool was called
            func_calls = event.get_function_calls()
            if func_calls:
                for fc in func_calls:
                    if fc.name == "web_search":
                        source = "web_search"
                    elif fc.name == "rag_local":
                        source = "rag_local"
                    
        if not answer_text:
            raise HTTPException(status_code=500, detail="Agent returned empty response")
            
        return JSONResponse(
            content={"answer": answer_text.strip(), "source": source},
            media_type="application/json; charset=utf-8"
        )
        
    except Exception as e:
        print(f"Error executing agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Reset context variables
        transcript_var.reset(transcript_token)
        material_summary_var.reset(material_summary_token)

@app.post("/generate-canvas")
async def generate_canvas(request: Request):
    body = await request.json()
    transcript = body.get("transcript", "")
    material_summary = body.get("material_summary", "")
    concepts = body.get("concepts", [])
    chat_history = body.get("chat_history", "")

    prompt = f"""
Eres un asistente educativo. Analiza toda esta información de una clase:

TRANSCRIPT: {transcript}
MATERIAL: {material_summary}
CONCEPTOS CLAVE: {concepts}
CHAT DEL ESTUDIANTE: {chat_history}

Extrae los conceptos más importantes y sus relaciones. Para cada concepto genera:
- Un ID único (n1, n2, etc.)
- Label corto
- Resumen de 1-2 oraciones
- Lista de IDs de conceptos relacionados
- Un término de búsqueda en inglés para encontrar una imagen representativa
- Un término de búsqueda en inglés para YouTube

Responde SOLO con este JSON sin texto adicional:
{{
  "nodes": [
    {{
      "id": "n1",
      "label": "string",
      "summary": "string",
      "connections": ["n2"],
      "image_query": "string",
      "video_query": "string"
    }}
  ]
}}
"""

    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=prompt
    )

    import re, json
    text = response.text
    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        raise HTTPException(status_code=500, detail="No JSON in response")
    
    canvas_data = json.loads(match.group())
    
    return JSONResponse(
        content=canvas_data,
        media_type="application/json; charset=utf-8"
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
