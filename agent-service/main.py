import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.adk.apps import App
from google.adk.runners import InMemoryRunner
from google.genai import types as genai_types
from agent import root_agent
from tools import transcript_var, material_summary_var

app = FastAPI(title="Agent Service - VibeLearning")

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

@app.post("/chat", response_model=ChatResponse)
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
        async for event in event_stream:
            # Accumulate text content of the events
            if event.content and event.content.parts:
                part_text = event.content.parts[0].text
                if part_text:
                    answer_text += part_text
                    
        if not answer_text:
            raise HTTPException(status_code=500, detail="Agent returned empty response")
            
        return ChatResponse(answer=answer_text.strip())
        
    except Exception as e:
        print(f"Error executing agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Reset context variables
        transcript_var.reset(transcript_token)
        material_summary_var.reset(material_summary_token)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
