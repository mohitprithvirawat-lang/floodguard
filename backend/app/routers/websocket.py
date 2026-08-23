import json
import logging
from typing import List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("floodguard.ws")

router = APIRouter(tags=["Real-Time WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.alert_connections: Set[WebSocket] = set()

    async def connect_live(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected to /ws/live. Total active: {len(self.active_connections)}")

    def disconnect_live(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected from /ws/live. Total active: {len(self.active_connections)}")

    async def connect_alerts(self, websocket: WebSocket):
        await websocket.accept()
        self.alert_connections.add(websocket)
        logger.info(f"WebSocket client connected to /ws/alerts. Total active: {len(self.alert_connections)}")

    def disconnect_alerts(self, websocket: WebSocket):
        self.alert_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected from /ws/alerts. Total active: {len(self.alert_connections)}")

    async def broadcast_live(self, message: dict):
        if not self.active_connections:
            return
        dead = []
        payload = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending live update to WebSocket: {e}")
                dead.append(connection)
        for d in dead:
            self.active_connections.discard(d)

    async def broadcast_alert(self, alert_data: dict):
        if not self.alert_connections and not self.active_connections:
            return
        payload = json.dumps({"type": "ALERT_NEW", "data": alert_data})
        targets = set(self.alert_connections).union(self.active_connections)
        dead = []
        for connection in targets:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending alert to WebSocket: {e}")
                dead.append(connection)
        for d in dead:
            self.alert_connections.discard(d)
            self.active_connections.discard(d)

ws_manager = ConnectionManager()

@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect_live(websocket)
    try:
        while True:
            # Keep listening for incoming client pings or commands
            data = await websocket.receive_text()
            # Respond to client ping
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_live(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect_live(websocket)

@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await ws_manager.connect_alerts(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_alerts(websocket)
    except Exception as e:
        logger.warning(f"WebSocket alerts connection error: {e}")
        ws_manager.disconnect_alerts(websocket)
