import {createCodeEditor} from "./code-editor.js";
import {createCoordinateMapper} from "./coordinate-mapper.js";
import {startMouseGazeSource, startWebSocketGazeSource} from "./gaze-sources.js";
import {createGazeRenderer} from "./gaze-ui.js";

// Start here when adapting the demo. Change the code file or switch the source
// from "mouse" to "websocket"; the editor and mapping modules need no changes.
const CONFIG = {
    codeFile: "./public/code/TwoSum.java", // BinarySearch.java, etc.
    gazeSource: "mouse", // "mouse" or "websocket"
    websocketUrl: "ws://localhost:8765"
};

const getRequiredElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required page element: #${id}`);
    }
    return element;
};

const elements = {
    editor: getRequiredElement("editor"),
    marker: getRequiredElement("gaze-marker"),
    sourceStatus: getRequiredElement("source-status"),
    screenX: getRequiredElement("screen-x"),
    screenY: getRequiredElement("screen-y"),
    windowX: getRequiredElement("window-x"),
    windowY: getRequiredElement("window-y"),
    lineNumber: getRequiredElement("line-number"),
    columnNumber: getRequiredElement("column-number"),
    token: getRequiredElement("token"),
    astChain: getRequiredElement("ast-chain")
};

const loadCode = async (filename) => {
    const response = await fetch(filename);
    if (!response.ok) {
        throw new Error(`Unable to load ${filename}: HTTP ${response.status}`);
    }
    return response.text();
};

try {
    const code = await loadCode(CONFIG.codeFile);
    const editor = createCodeEditor({parent: elements.editor, code});
    const coordinateMapper = createCoordinateMapper();
    const renderer = createGazeRenderer({elements});

    /**
     * Add full-rate raw-data recording here. This callback runs for every source
     * sample and is intentionally not throttled by requestAnimationFrame.
     *
     * In a real experiment, stream or batch samples to durable storage. Avoid
     * repeatedly copying an ever-growing JavaScript/React array, which becomes
     * slower and consumes more memory as the session continues.
     */
    const recordRawSample = (_sample) => {
        // TODO: implement experiment-specific raw gaze recording.
    };

    /**
     * Add full-rate semantic-data recording here. Every valid gaze sample has
     * already been mapped to line, column, token, and AST chain at this point.
     */
    const recordMappedSample = (_sample) => {
        // TODO: implement experiment-specific mapped gaze recording.
    };

    const handleGazeSample = (rawSample) => {
        recordRawSample(rawSample);

        // Convert screen coordinates into the viewport coordinate system used
        // by EditorView.posAtCoords. Mouse samples contain client coordinates;
        // screen-only eye-tracker samples use the latest pointer calibration.
        const viewportPosition = coordinateMapper.toViewport(rawSample);
        if (!viewportPosition) {
            renderer.setStatus("Move the pointer over this page once to calibrate the browser position");
            return;
        }

        const mappedSample = {
            raw: rawSample,
            viewport: viewportPosition,
            semantic: editor.mapViewportPosition(viewportPosition)
        };

        // Mapping/recording receives every sample. Only the visible marker and
        // text are coalesced to the newest sample once per animation frame.
        recordMappedSample(mappedSample);
        renderer.renderLatest(mappedSample);
    };

    const sourceOptions = {
        onSample: handleGazeSample,
        onStatus: renderer.setStatus,
        url: CONFIG.websocketUrl
    };
    const stopSource = CONFIG.gazeSource === "websocket"
        ? startWebSocketGazeSource(sourceOptions)
        : startMouseGazeSource(sourceOptions);

    window.addEventListener("beforeunload", () => {
        stopSource();
        renderer.destroy();
        coordinateMapper.destroy();
        editor.destroy();
    }, {once: true});
} catch (error) {
    elements.sourceStatus.textContent = error.message;
    console.error(error);
}
