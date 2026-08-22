import React, {useState, useEffect} from 'react';
import CodeMirrorEditor from "./CodeMirrorEditor";
import Description from "./Description";

/**
 * Main component of the application, which registers the source data stream, fetches the code content,
 * and passes them to the CodeMirrorEditor.
 * @returns {Element} Main component of the application.
 */
const Component = () => {
    const codeFilename = "TwoSum.java"; // TwoSum.java, BinarySearch.java, etc.
    const [code, setCode] = useState("");

    // Fetch the code content.
    useEffect(() => {
        fetch("/code/" + codeFilename)
            .then(response => response.text())
            .then(data => setCode(data));
    }, []);

    const [mousePosOnScreen, setMousePosOnScreen] = useState({
        x: 0, y: 0,
    });

    // Option 1: Register source data stream via mouse move event.
    // We use this as for deployment demonstration.
    useEffect(() => {
        let animationFrameId = null;
        let latestMousePosition = null;

        const handleMouseMove = (event) => {
            latestMousePosition = {
                x: event.screenX, y: event.screenY,
            };

            // Mouse and gaze sources can emit faster than the browser can paint.
            // Keep only the newest sample and update React at most once per frame.
            if (animationFrameId === null) {
                animationFrameId = window.requestAnimationFrame(() => {
                    setMousePosOnScreen(latestMousePosition);
                    animationFrameId = null;
                });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    // Option 2: Register source data stream via WebSocket.
    // For the server-side implementation of the mouse simulation, refer to /public/mouse_simulation.py.
    // This allows you the best flexibility, especially Tobii Pro SDK does not support JavaScript.

    // useEffect(() => {
    //     const ws = new WebSocket('ws://localhost:8765');
    //     ws.onmessage = (event) => {
    //         console.log("Received data: " + event.data);
    //         const scaledPos = JSON.parse(event.data);
    //         setMousePosOnScreen({
    //             x: scaledPos.x * window.screen.width,
    //             y: scaledPos.y * window.screen.height,
    //         });
    //     };
    //     return () => ws.close();
    // }, []);

    // TODO: implement your own method here to get the eye gaze data, e.g., via Tobii Pro SDK, etc.

    // const [eyePosOnScreen, setEyePosOnScreen] = useState({
    //     x: 0, y: 0,
    // });
    //
    // useEffect(() => {
    // }, []);

    return (
        <div style={{margin: '40px 100px'}}>
            <Description/>
            <CodeMirrorEditor code={code} gazePosOnScreen={mousePosOnScreen}/>
        </div>
    );
}

export default Component;
