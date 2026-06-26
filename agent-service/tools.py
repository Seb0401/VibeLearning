import contextvars
import urllib.parse
import httpx
from bs4 import BeautifulSoup
from google import genai
from google.adk.tools import ToolContext

# Context variables for request-level data
transcript_var = contextvars.ContextVar("transcript", default="")
material_summary_var = contextvars.ContextVar("material_summary", default="")

ALLOWLIST_DOMAINS = [
    "pubmed.ncbi.nlm.nih.gov",
    "es.khanacademy.org",
    "encyclopediabritannica.com",
    "docs.python.org",
    "developer.mozilla.org",
    "rae.es"
]

def rag_local(query: str) -> dict:
    """
    Searches the local live class context (including the live class transcript and the uploaded educational material summary)
    to answer questions about what is currently being taught or discussed in class.
    ALWAYS use this tool first when answering questions related to the active class, the topic of the class, or any material mentioned in the class.
    
    Args:
        query: The search query or specific concept to look up in the local class transcript or material summary.
    """
    transcript = transcript_var.get()
    material_summary = material_summary_var.get()
    
    if not transcript.strip() and not material_summary.strip():
        return {"status": "not_found", "context": "No local class context available."}
        
    client = genai.Client() # uses GOOGLE_API_KEY from environment
    prompt = f"""
    You are a precise educational assistant.
    Given the following educational material summary and the live class transcript, find all relevant information to answer the query: "{query}".
    
    Material Summary:
    {material_summary}
    
    Live Class Transcript:
    {transcript}
    
    If the context contains relevant information, summarize the relevant points clearly and concisely to help answer the query.
    If the context does not contain any relevant information to answer the query, reply exactly with: "No local context found."
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        text = response.text.strip()
        if "No local context found" in text:
            return {"status": "not_found", "context": "No relevant local context found."}
        return {"status": "success", "context": text}
    except Exception as e:
        print(f"Error in rag_local: {e}")
        return {"status": "error", "message": str(e)}

def web_search(query: str) -> dict:
    """
    Searches the web for general knowledge, definitions, documentation, or scientific papers when the local class context (rag_local) does not have the answer.
    This search is restricted to trusted high-quality educational and scientific sources.
    
    Args:
        query: The search query or general knowledge question to look up on the web.
    """
    # We perform an open search on DuckDuckGo and then filter results in python using ALLOWLIST_DOMAINS
    full_query = query
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(full_query)}"
        response = httpx.get(url, headers=headers, timeout=10.0)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        results = []
        
        for div in soup.find_all("div", class_="result"):
            a_title = div.find("a", class_="result__a")
            a_snippet = div.find("a", class_="result__snippet")
            if a_title:
                title = a_title.get_text(strip=True)
                href = a_title.get("href", "")
                if "uddg=" in href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
                    if "uddg" in parsed:
                        href = parsed["uddg"][0]
                snippet = a_snippet.get_text(strip=True) if a_snippet else ""
                
                # Double check domain is in allowlist
                is_allowed = any(domain in href for domain in ALLOWLIST_DOMAINS)
                if is_allowed and href:
                    results.append({
                        "title": title,
                        "url": href,
                        "snippet": snippet
                    })
                    if len(results) >= 3:
                        break
                        
        if not results:
            return {"status": "no_results", "results": []}
            
        return {"status": "success", "results": results}
    except Exception as e:
        print(f"Error in web_search: {e}")
        return {"status": "error", "message": str(e)}
