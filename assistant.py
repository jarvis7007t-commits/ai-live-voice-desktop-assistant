import os
import json
import ollama
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from google import genai
from google.genai import types as genai_types
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

# Initialize Gemini Client if key is present
gemini_client = None
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Define tools for Ollama
TOOLS = [
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

def call_ollama(messages, model=OLLAMA_MODEL, stream=False):
    """Helper to call Ollama with tool support."""
    if stream:
        return ollama.chat(model=model, messages=messages, stream=True)
    
    # Handle tool calls in a loop for non-streaming initial call
    while True:
        response = ollama.chat(model=model, messages=messages, tools=TOOLS)
        
        if not response['message'].get('tool_calls'):
            return response
            
        messages.append(response['message'])
        
        for tool in response['message']['tool_calls']:
            name = tool['function']['name']
            args = tool['function']['arguments']
            print(f"[Ollama] Executing tool: {name} with arguments: {args}")
            
            if name in AVAILABLE_TOOLS:
                try:
                    result = AVAILABLE_TOOLS[name](**args)
                except Exception as e:
                    result = f"Error executing tool: {str(e)}"
            else:
                result = f"Error: Tool {name} not found"
            
            messages.append({'role': 'tool', 'content': str(result)})

def call_gemini(messages, stream=False):
    """Helper to call Gemini."""
    if not gemini_client:
        raise Exception("Gemini API Key not configured.")
    
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
        return gemini_client.models.generate_content_stream(
            model='gemini-2.0-flash',
            contents=gemini_history + [last_msg],
            config=genai_types.GenerateContentConfig(system_instruction=system_instruction)
        )
    else:
        response = gemini_client.models.generate_content(
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
            # Try Ollama if requested and enabled
            if use_local and OLLAMA_ENABLED:
                try:
                    print(f"[Wardenix] Attempting Ollama with model: {requested_model}...")
                    # First call to handle tools (non-streaming)
                    final_response = call_ollama(messages, model=requested_model, stream=False)
                    
                    # Now stream the final content if any
                    content = final_response['message']['content']
                    if content:
                        yield content
                    return
                except Exception as e:
                    print(f"[Wardenix] Ollama failed: {str(e)}. Falling back to Gemini...")
            
            # Fallback to Gemini
            print("[Wardenix] Using Gemini...")
            stream = call_gemini(messages, stream=True)
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            yield f"Error: {str(e)}"

    return Response(stream_with_context(generate()), mimetype='text/plain')

if __name__ == "__main__":
    print(f"Wardenix Backend starting on port 5000...")
    app.run(port=5000, debug=False)
