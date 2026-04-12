import os
import json
import requests
import time
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from tools import open_application, download_file, create_file, run_command, open_url

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "true").lower() == "true"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3.5:9b")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OLLAMA_URL = "http://localhost:11434/api/chat"

# Initialize Gemini Client lazily
def get_gemini_client(api_key=None):
    key = api_key or GEMINI_API_KEY
    if not key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=key)
    except ImportError:
        print("google-genai library not installed.")
        return None
    except Exception as e:
        print(f"Failed to initialize Gemini client: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    return {
        "status": "ok",
        "ollama_enabled": OLLAMA_ENABLED,
        "gemini_configured": GEMINI_API_KEY is not None and GEMINI_API_KEY != ""
    }

# Define tools for AI
TOOLS_DEF = [
    {
        'type': 'function',
        'function': {
            'name': 'open_application',
            'description': 'Open an application on the computer',
            'parameters': {
                'type': 'object',
                'properties': {
                    'app_name': {'type': 'string', 'description': 'The name or path of the application to open'},
                },
                'required': ['app_name'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'download_file',
            'description': 'Download a file from a URL to a local path',
            'parameters': {
                'type': 'object',
                'properties': {
                    'url': {'type': 'string', 'description': 'The URL of the file to download'},
                    'save_path': {'type': 'string', 'description': 'The local path where the file should be saved'},
                },
                'required': ['url', 'save_path'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'create_file',
            'description': 'Create a new file with specific content',
            'parameters': {
                'type': 'object',
                'properties': {
                    'file_path': {'type': 'string', 'description': 'The path where the file should be created'},
                    'content': {'type': 'string', 'description': 'The text content of the file'},
                },
                'required': ['file_path', 'content'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'run_command',
            'description': 'Execute a shell command on the computer',
            'parameters': {
                'type': 'object',
                'properties': {
                    'command': {'type': 'string', 'description': 'The shell command to run'},
                },
                'required': ['command'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'open_url',
            'description': 'Open a website URL in the default browser',
            'parameters': {
                'type': 'object',
                'properties': {
                    'url': {'type': 'string', 'description': 'The URL to open'},
                },
                'required': ['url'],
            },
        },
    }
]

AVAILABLE_TOOLS = {
    'open_application': open_application,
    'download_file': download_file,
    'create_file': create_file,
    'run_command': run_command,
    'open_url': open_url
}

def call_ollama_api(messages, model, stream=False):
    """Call Ollama API using requests for better control."""
    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
        "tools": TOOLS_DEF
    }
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Ollama API error: {e}")
        raise e

def call_gemini_api(messages, api_key=None, stream=False):
    """Call Gemini API using the official SDK."""
    client = get_gemini_client(api_key)
    if not client:
        raise Exception("Gemini API Key not configured. Please add it in Settings.")
    
    from google.genai import types as genai_types
    
    # Convert messages to Gemini format
    gemini_history = []
    system_instruction = "You are Wardenix, a powerful AI assistant. Help the user with their requests."
    
    for msg in messages:
        if msg['role'] == 'system':
            system_instruction = msg['content']
        elif msg['role'] == 'user':
            gemini_history.append({'role': 'user', 'parts': [{'text': msg['content']}]})
        elif msg['role'] == 'assistant':
            gemini_history.append({'role': 'model', 'parts': [{'text': msg['content']}]})
    
    # Last message is the current query
    last_msg = gemini_history.pop() if gemini_history else {'role': 'user', 'parts': [{'text': ''}]}
    
    if stream:
        return client.models.generate_content_stream(
            model='gemini-2.0-flash',
            contents=gemini_history + [last_msg],
            config=genai_types.GenerateContentConfig(system_instruction=system_instruction)
        )
    else:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=gemini_history + [last_msg],
            config=genai_types.GenerateContentConfig(system_instruction=system_instruction)
        )
        return response.text

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    query = data.get('query')
    history = data.get('history', [])
    use_local = data.get('useLocalOllama', True)
    requested_model = data.get('model', OLLAMA_MODEL)
    api_key = data.get('apiKey')
    
    # Prepare messages
    messages = [
        {'role': 'system', 'content': 'You are Wardenix, a powerful AI assistant with full system access. Use tools to help the user with their requests.'}
    ]
    
    for msg in history:
        role = 'assistant' if msg.get('role') in ['model', 'assistant'] else 'user'
        messages.append({'role': role, 'content': msg.get('content', msg.get('text', ''))})
    
    messages.append({'role': 'user', 'content': query})

    def generate():
        nonlocal messages
        try:
            # 1. Try Ollama if requested and enabled
            if use_local and OLLAMA_ENABLED:
                try:
                    print(f"[Wardenix] Attempting Ollama with model: {requested_model}...")
                    
                    # Check if Ollama is alive first (fast check)
                    try:
                        requests.get("http://localhost:11434/api/tags", timeout=1)
                    except:
                        raise Exception("Ollama service not reachable")

                    # Handle tool calls in a loop
                    while True:
                        response = call_ollama_api(messages, requested_model, stream=False)
                        msg = response.get('message', {})
                        
                        if not msg.get('tool_calls'):
                            # Final response
                            messages.append(msg)
                            if msg.get('content'):
                                yield msg['content']
                            return
                            
                        messages.append(msg)
                        
                        for tool in msg['tool_calls']:
                            name = tool['function']['name']
                            args = tool['function']['arguments']
                            print(f"[Ollama] Tool: {name}({args})")
                            
                            if name in AVAILABLE_TOOLS:
                                try:
                                    result = AVAILABLE_TOOLS[name](**args)
                                except Exception as e:
                                    result = f"Error: {str(e)}"
                            else:
                                result = f"Error: Tool {name} not found"
                            
                            messages.append({'role': 'tool', 'content': str(result)})
                            
                except Exception as e:
                    print(f"[Wardenix] Ollama failed: {str(e)}. Falling back to Gemini...")
            
            # 2. Fallback to Gemini
            print("[Wardenix] Using Gemini...")
            try:
                stream = call_gemini_api(messages, api_key=api_key, stream=True)
                has_content = False
                for chunk in stream:
                    if chunk.text:
                        has_content = True
                        yield chunk.text
                
                if not has_content:
                    yield "Wardenix: I received an empty response from Gemini. Please try again."
            except Exception as e:
                print(f"[Wardenix] Gemini failed: {str(e)}")
                yield f"Error: {str(e)}"
                    
        except Exception as e:
            print(f"[Wardenix] Critical error: {str(e)}")
            yield f"Error: {str(e)}"

    return Response(stream_with_context(generate()), mimetype='text/plain')

if __name__ == "__main__":
    print(f"Wardenix Backend starting on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
