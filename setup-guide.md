# Wardenix AI Assistant - Python Setup Guide

Wardenix has been converted to a **Full Python System** for deeper hardware control and better performance.

## 🚀 Features
- **Pure Python Core**: Faster execution and native system access.
- **PyQt6 UI**: Modern, transparent floating capsule.
- **Advanced Automation**: Control mouse, keyboard, volume, brightness, and more via `pyautogui` and `pycaw`.
- **Gemini Live API**: Real-time multimodal interaction using the `google-genai` Python SDK.

## 📦 Project Structure
- `main.py`: Entry point for the application.
- `ui.py`: PyQt6 based floating UI.
- `assistant.py`: Gemini Live API integration logic.
- `automation.py`: PC control engine (Mouse, KB, System).
- `requirements.txt`: List of Python dependencies.

## 🛠 Step-by-Step Installation Guide

Follow these steps to install Wardenix on your PC:

### Step 1: Download the Project
- Click on the **Settings** (Gear icon) in the top right of this screen.
- Select **"Export to ZIP"**.
- Save the file to your PC.

### Step 2: Extract the Folder
- Right-click the downloaded `.zip` file.
- Select **"Extract All..."**.
- You will see a folder named `Wardenix_AI_Assistant` (or similar).

### Step 3: Prepare Environment
- Open the extracted folder.
- Ensure you have **Python 3.10+** installed on your Windows PC.
- Open a terminal (CMD or PowerShell) in that folder and run:
  ```bash
  pip install -r requirements.txt
  ```

### Step 4: Create the Installer (.exe)
- To create a single installable file with an icon (like in the images you provided), run:
  ```bash
  python build_installer.py
  ```
- Once finished, a new folder named **`dist`** will appear.
- Inside `dist`, you will find **`Wardenix_AI_Assistant.exe`**.

### Step 5: Run Wardenix
- Double-click the `.exe` file to start your AI Assistant!
- You can move this file to your Desktop or Pin it to your Taskbar.

## 🛡 Security & Permissions
- The first time you run the `.exe`, Windows might show a "SmartScreen" warning because the app is not signed. Click **"More info"** -> **"Run anyway"**.
- Ensure your `.env` file with the `GEMINI_API_KEY` is in the same folder as the `.exe` or set as a System Environment Variable.
