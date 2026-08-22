/**
 * Option 1: use mouse movement as a proxy for eye gaze. This is the source used
 * by the public deployment demo. Every browser event is forwarded; rendering is
 * limited separately, so source sampling and UI refresh are not conflated.
 */
export const startMouseGazeSource = ({onSample, onStatus}) => {
    const handleMouseMove = (event) => {
        onSample({
            source: "mouse",
            timestamp: event.timeStamp,
            screenX: event.screenX,
            screenY: event.screenY,
            clientX: event.clientX,
            clientY: event.clientY
        });
    };

    window.addEventListener("mousemove", handleMouseMove, {passive: true});
    onStatus("Mouse demo connected");

    return () => window.removeEventListener("mousemove", handleMouseMove);
};

/**
 * Option 2: receive normalized gaze coordinates through WebSocket.
 *
 * The example Python publisher is in /examples/mouse_simulation.py. A WebSocket
 * bridge provides flexibility when an eye tracker SDK (for example Tobii Pro)
 * does not expose a browser JavaScript API.
 */
export const startWebSocketGazeSource = ({
    onSample,
    onStatus,
    url = "ws://localhost:8765"
}) => {
    const socket = new WebSocket(url);

    socket.addEventListener("open", () => onStatus(`WebSocket connected: ${url}`));
    socket.addEventListener("close", () => onStatus("WebSocket disconnected"));
    socket.addEventListener("error", () => onStatus("WebSocket error"));
    socket.addEventListener("message", (event) => {
        try {
            const scaledPosition = JSON.parse(event.data);
            onSample({
                source: "websocket",
                // Preserve the tracker/server timestamp when one is provided,
                // and separately record when this browser received the sample.
                timestamp: scaledPosition.timestamp ?? null,
                receivedAt: performance.now(),
                screenX: scaledPosition.x * window.screen.width,
                screenY: scaledPosition.y * window.screen.height
            });
        } catch (error) {
            console.error("Invalid gaze sample received from WebSocket", error);
        }
    });

    return () => socket.close();
};
