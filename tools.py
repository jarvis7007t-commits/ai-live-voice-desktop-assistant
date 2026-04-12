import os
import subprocess
import requests
import platform
import webbrowser

def open_application(app_name):
    """Opens a specific application on the PC."""
    try:
        if platform.system() == "Windows":
            # Try to start the application
            subprocess.Popen(["start", "", app_name], shell=True)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", "-a", app_name])
        else:
            subprocess.Popen([app_name])
        return f"Successfully opened {app_name}"
    except Exception as e:
        return f"Error opening {app_name}: {str(e)}"

def download_file(url, save_path):
    """Downloads a file from a URL to a specific local path."""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return f"Successfully downloaded file to {save_path}"
    except Exception as e:
        return f"Error downloading file: {str(e)}"

def create_file(file_path, content=""):
    """Creates a new file with the given content."""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully created file at {file_path}"
    except Exception as e:
        return f"Error creating file: {str(e)}"

def run_command(command):
    """Executes a shell command on the PC and returns the output."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            return f"Command executed successfully. Output: {result.stdout}"
        else:
            return f"Command failed with error: {result.stderr}"
    except Exception as e:
        return f"Error executing command: {str(e)}"

def open_url(url):
    """Opens a URL in the default web browser."""
    try:
        webbrowser.open(url)
        return f"Opened URL: {url}"
    except Exception as e:
        return f"Error opening URL: {str(e)}"
