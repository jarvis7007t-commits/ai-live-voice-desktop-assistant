import os
import subprocess
import sys

def build():
    print("🚀 Starting Wardenix Build Process...")
    
    # 1. Check for icon
    icon_path = "icon.ico"
    if not os.path.exists(icon_path):
        print("⚠️ Warning: icon.ico not found. Using default icon.")
        icon_cmd = ""
    else:
        icon_cmd = f"--icon={icon_path}"

    # 2. PyInstaller Command
    # --noconsole: Hide the terminal window
    # --onefile: Bundle everything into a single .exe
    # --name: Name of the output file
    cmd = [
        "pyinstaller",
        "--noconsole",
        "--onefile",
        f"--name=Wardenix_AI_Assistant",
        icon_cmd,
        "main.py"
    ]
    
    # Remove empty strings
    cmd = [c for c in cmd if c]

    print(f"📦 Running: {' '.join(cmd)}")
    
    try:
        subprocess.check_call(cmd)
        print("\n✅ Build Successful!")
        print("📂 Your installer is located in the 'dist' folder.")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Build Failed: {e}")

if __name__ == "__main__":
    build()
