import sys
from PyQt6.QtWidgets import QApplication, QWidget, QHBoxLayout, QPushButton, QLabel
from PyQt6.QtCore import Qt, QPoint, QSize
from PyQt6.QtGui import QColor, QPalette, QFont

class WardenixUI(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
        self.oldPos = self.pos()

    def initUI(self):
        # Window Settings
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        # Layout
        layout = QHBoxLayout()
        layout.setContentsMargins(15, 5, 15, 5)
        layout.setSpacing(15)
        
        # Capsule Style
        self.setStyleSheet("""
            QWidget {
                background-color: #10141d;
                border: 2px solid #22d3ee;
                border-radius: 25px;
            }
            QLabel {
                color: white;
                border: none;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
            }
            QPushButton {
                background-color: transparent;
                border: none;
                color: #64748b;
                font-size: 18px;
            }
            QPushButton:hover {
                color: #22d3ee;
            }
        """)

        # Elements
        self.status_label = QLabel("Wardenix AI")
        layout.addWidget(self.status_label)
        
        self.mic_btn = QPushButton("🎤")
        layout.addWidget(self.mic_btn)
        
        self.cam_btn = QPushButton("📷")
        layout.addWidget(self.cam_btn)
        
        self.settings_btn = QPushButton("⚙️")
        layout.addWidget(self.settings_btn)
        
        self.setLayout(layout)
        self.setFixedSize(360, 56)

    # Draggable Logic
    def mousePressEvent(self, event):
        self.oldPos = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event):
        delta = QPoint(event.globalPosition().toPoint() - self.oldPos)
        self.move(self.x() + delta.x(), self.y() + delta.y())
        self.oldPos = event.globalPosition().toPoint()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ex = WardenixUI()
    ex.show()
    sys.exit(app.exec())
