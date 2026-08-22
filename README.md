# WebSight: A Semantic Gaze-to-Code Mapping Layer for Web Experiments

🚀 **[Try our live demo here!](https://www.nztang.com/WebSight/)** 🎉

## Motivation

Eye-tracking studies receive screen coordinates, but code studies usually need line, column, token, and syntax information. A recent study pipeline [[1]](https://dl.acm.org/doi/10.1145/3664808) [[2]](https://dl.acm.org/doi/10.1145/3643732) restricted Java methods to 26 lines so they fit without scrolling and displayed them without syntax highlighting. Its post-processing used screenshots, OpenCV token boxes, OCR, fuzzy matching, manual verification, and separate AST parsing.

WebSight performs this mapping directly in the browser, while retaining syntax highlighting, scrolling, and editing:

```text
screen gaze coordinates -> CodeMirror position -> line/column -> token/syntax context
```

## Solution

WebSight uses [CodeMirror](https://codemirror.net/) to map each gaze sample to the current document and syntax tree in real time.

Below is a snapshot of our tool in action (using the mouse as a proxy for eye gaze). Feel free to try our [live demo](https://www.nztang.com/WebSight/) as well!

<div align="center">
    <img src="./public/demo.gif" width="700px" max-width="100%" alt="Demo">
</div>

## Run locally

Open this repository in VS Code, then use the **Live Server: Open with Live Server** command on `/index.html`. No dependency installation or build step is required.

## Adapting the demo

The most commonly changed options are intentionally placed near the top of `/src/main.js`:

```js
const CONFIG = {
    codeFile: "./public/code/TwoSum.java",
    gazeSource: "mouse", // "mouse" or "websocket"
    websocketUrl: "ws://localhost:8765"
};
```

The source is divided by responsibility:

- `/index.html`: page content and the CodeMirror import map;
- `/src/main.js`: configuration and the end-to-end gaze pipeline;
- `/src/gaze-sources.js`: mouse demo and WebSocket data sources;
- `/src/coordinate-mapper.js`: screen-to-browser coordinate calibration;
- `/src/code-editor.js`: CodeMirror initialization and line/token/AST mapping;
- `/src/gaze-ui.js`: frame-limited marker and text rendering;
- `/src/styles.css`: all page and marker styling.

We also provide an example publisher in `/examples/mouse_simulation.py`. It streams normalized mouse coordinates from a Python WebSocket server, which mirrors the bridge often needed when an eye tracker SDK such as Tobii Pro does not expose a browser JavaScript API. It is an optional integration example and is not required by the webpage.

### End-to-end data flow

An eye-tracker bridge sends normalized coordinates:

```json
{"x": 0.42, "y": 0.31, "timestamp": 1720000000}
```

`/src/main.js` then calls `recordMappedSample` for every sample with both the original data and its mapping:

```json
{
  "raw": {"source": "websocket", "timestamp": 1720000000, "screenX": 806.4, "screenY": 334.8},
  "viewport": {"x": 798.4, "y": 245.8},
  "semantic": {"lineNum": 8, "columnNum": 15, "token": "target", "astChain": "VariableName -> BinaryExpression -> IfStatement"}
}
```

Replace the two recording hooks in `/src/main.js` with experiment-specific storage. For long sessions, send samples to a backend in batches instead of keeping an ever-growing browser array.

> We previously tried the [Monaco Editor](https://microsoft.github.io/monaco-editor/), another popular web-based code editor with core features same as VSCode. However, Monaco Editor doesn't offer any APIs to convert coordinates to the offset or line/column position in the code, which is essential for analyzing eye tracking data.

## Contact

For more information, please contact [Ningzhi Tang](mailto:ntang@nd.edu) from the [SaNDwich Lab](https://toby.li/) at the University of Notre Dame. I'm happy to discuss the technical details and potential collaborations!
