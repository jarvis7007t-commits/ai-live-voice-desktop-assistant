import os
import asyncio
import base64
import json
from google import genai
from automation import PCAutomation
from dotenv import load_dotenv

load_dotenv()

class WardenixAssistant:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"), http_options={'api_version': 'v1alpha'})
        self.automation = PCAutomation()
        self.model_id = "gemini-2.0-flash-exp" # Using Flash for Live
        
    async def start_session(self, audio_callback, status_callback):
        async with self.client.aio.live.connect(model=self.model_id, config={"response_modalities": ["AUDIO"]}) as session:
            self.session = session
            
            # Start receiving loop
            receive_task = asyncio.create_task(self._receive_loop(audio_callback, status_callback))
            
            # Send initial setup/instruction
            instruction = "You are Wardenix, the ultimate AI OS Assistant with FULL NATIVE SYSTEM ACCESS. You control this PC via Python. You can move the mouse, type, and manage files. Be bold and helpful."
            await session.send(instruction, end_of_turn=True)
            
            await receive_task

    async def _receive_loop(self, audio_callback, status_callback):
        async for message in self.session:
            if message.server_content:
                model_turn = message.server_content.model_turn
                if model_turn:
                    for part in model_turn.parts:
                        if part.inline_data:
                            audio_callback(part.inline_data.data)
            
            if message.tool_call:
                for fc in message.tool_call.function_calls:
                    result = await self._handle_tool_call(fc)
                    await self.session.send(
                        genai.types.LiveClientToolResponse(
                            function_responses=[
                                genai.types.FunctionResponse(
                                    name=fc.name,
                                    id=fc.id,
                                    response={"result": result}
                                )
                            ]
                        )
                    )

    async def _handle_tool_call(self, fc):
        name = fc.name
        args = fc.args
        print(f"AI Tool Call: {name} with {args}")
        
        if name == "move_mouse": return self.automation.move_mouse(args['x'], args['y'])
        if name == "click_mouse": return self.automation.click_mouse(args.get('button', 'left'), args.get('double', False))
        if name == "type_text": return self.automation.type_text(args['text'])
        if name == "press_key": return self.automation.press_key(args['key'])
        if name == "set_volume": return self.automation.set_volume(args['level'])
        if name == "set_brightness": return self.automation.set_brightness(args['level'])
        if name == "open_app": return self.automation.open_app(args['name'])
        if name == "manage_file": return self.automation.manage_file(args['action'], args['filePath'], args.get('content', ''))
        
        return "unknown tool"

    async def send_audio(self, audio_data):
        await self.session.send(base64.b64encode(audio_data).decode("utf-8"), end_of_turn=False)

    async def send_vision(self, frame_data):
        await self.session.send(
            genai.types.LiveClientRealtimeInput(
                media_chunks=[
                    genai.types.Blob(data=frame_data, mime_type="image/jpeg")
                ]
            )
        )
