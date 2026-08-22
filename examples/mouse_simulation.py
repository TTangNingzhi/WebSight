"""Publish the system mouse position as normalized WebSocket gaze samples.

This is a stand-in for an eye-tracker SDK such as Tobii Pro. The browser uses
the same WebSocket source and gaze-mapping pipeline for simulated and real data.

Requirements:
    pip install pyautogui websockets
"""

import asyncio
import json

import pyautogui
import websockets


async def get_mouse_position(websocket, frequency=60):
    screen_width, screen_height = pyautogui.size()
    try:
        while True:
            x, y = pyautogui.position()
            scaled_x, scaled_y = x / screen_width, y / screen_height
            position = {"x": scaled_x, "y": scaled_y}
            await websocket.send(json.dumps(position))
            await asyncio.sleep(1 / frequency)
    except websockets.ConnectionClosed:
        print("Connection closed")


async def main():
    async with websockets.serve(get_mouse_position, "localhost", 8765):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
