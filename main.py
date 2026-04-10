import sys
import asyncio
import threading
from PyQt6.QtWidgets import QApplication
from ui import WardenixUI
from assistant import WardenixAssistant

class WardenixApp:
    def __init__(self):
        self.qapp = QApplication(sys.argv)
        self.ui = WardenixUI()
        self.assistant = WardenixAssistant()
        
        # Connect UI signals
        self.ui.mic_btn.clicked.connect(self.toggle_session)
        
    def toggle_session(self):
        # Logic to start/stop asyncio loop in a thread
        self.ui.status_label.setText("Connecting...")
        threading.Thread(target=self.run_assistant, daemon=True).start()

    def run_assistant(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.assistant.start_session(self.audio_callback, self.status_callback))

    def audio_callback(self, data):
        # Handle incoming audio data
        pass

    def status_callback(self, msg):
        self.ui.status_label.setText(msg)

    def run(self):
        self.ui.show()
        sys.exit(self.qapp.exec())

if __name__ == "__main__":
    app = WardenixApp()
    app.run()
