import pyautogui
import subprocess
import os
import platform
import webbrowser
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
import screen_brightness_control as sbc

class PCAutomation:
    def __init__(self):
        pyautogui.FAILSAFE = False

    def move_mouse(self, x, y):
        pyautogui.moveTo(x, y)
        return "ok"

    def click_mouse(self, button='left', double=False):
        if double:
            pyautogui.doubleClick(button=button)
        else:
            pyautogui.click(button=button)
        return "ok"

    def type_text(self, text):
        pyautogui.write(text)
        return "ok"

    def press_key(self, key):
        pyautogui.press(key)
        return "ok"

    def scroll(self, direction, amount):
        clicks = amount if direction == 'up' else -amount
        pyautogui.scroll(clicks)
        return "ok"

    def open_url(self, url):
        webbrowser.open(url)
        return "ok"

    def set_volume(self, level):
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        # Convert 0-100 to -65.25 to 0.0
        volume.SetMasterVolumeLevelScalar(level / 100, None)
        return "ok"

    def set_brightness(self, level):
        sbc.set_brightness(level)
        return "ok"

    def system_power(self, action):
        if action == 'shutdown':
            os.system("shutdown /s /t 1")
        elif action == 'restart':
            os.system("shutdown /r /t 1")
        return "ok"

    def manage_file(self, action, file_path, content=""):
        try:
            if action in ['create', 'write']:
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                with open(file_path, 'w') as f:
                    f.write(content)
            elif action == 'delete':
                if os.path.exists(file_path):
                    os.remove(file_path)
            return "ok"
        except Exception as e:
            return f"error: {str(e)}"

    def open_app(self, name):
        try:
            subprocess.Popen(name)
            return "ok"
        except:
            # Fallback for common apps
            os.system(f"start {name}")
            return "ok"
