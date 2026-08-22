import {basicSetup} from "codemirror";
import {java} from "@codemirror/lang-java";
import {syntaxTree} from "@codemirror/language";
import {EditorView} from "@codemirror/view";

const emptySemanticInformation = () => ({
    lineNum: 0,
    columnNum: 0,
    token: "",
    astChain: ""
});

/**
 * Get the bottom-most token node at a document position from a middle-layer
 * syntax-tree node.
 *
 * CodeMirror's resolveInner usually returns a deep node already. The explicit
 * descent makes the intended token mapping clear and supports nodes produced
 * by nested/overlay parsers. The guard also prevents a malformed or unexpected
 * tree from trapping a high-frequency gaze pipeline in a loop.
 */
const getMostBottomToken = (node, position) => {
    let currentNode = node;

    while (currentNode.firstChild) {
        const child = currentNode.childBefore(position + 1);
        if (!child || child === currentNode || child.from > position || child.to < position) {
            return null;
        }
        currentNode = child;
    }

    return currentNode.from <= position && currentNode.to >= position ? currentNode : null;
};

/**
 * Create the CodeMirror editor and expose the coordinate-to-semantics mapping.
 * Keeping this module independent from gaze acquisition makes it easy to swap
 * mouse, WebSocket, Tobii, or another source without touching editor logic.
 */
export const createCodeEditor = ({parent, code}) => {
    const view = new EditorView({
        doc: code,
        extensions: [basicSetup, java()],
        parent
    });

    /**
     * Convert a gaze position in browser viewport coordinates to code semantics.
     * EditorView.posAtCoords expects client/viewport coordinates, not physical
     * screen coordinates and not document coordinates.
     */
    const mapViewportPosition = (gazePosOnWindow) => {
        const position = view.posAtCoords(gazePosOnWindow);
        if (position === null) {
            return emptySemanticInformation();
        }

        const line = view.state.doc.lineAt(position);

        // posAtCoords returns the cursor position that a click would create. On
        // blank space after the last character it can therefore return line.to.
        // Check the actual rendered character range to avoid mapping that blank
        // space to the line's final token.
        const firstCharCoords = view.coordsAtPos(line.from);
        const lastCharCoords = view.coordsAtPos(line.to);
        const isOverRenderedLine = firstCharCoords && lastCharCoords &&
            gazePosOnWindow.y >= firstCharCoords.top &&
            gazePosOnWindow.y <= lastCharCoords.bottom &&
            gazePosOnWindow.x >= firstCharCoords.left &&
            gazePosOnWindow.x <= lastCharCoords.right;

        if (!isOverRenderedLine) {
            return emptySemanticInformation();
        }

        const semanticInformation = {
            ...emptySemanticInformation(),
            lineNum: line.number,
            columnNum: position - line.from + 1
        };

        // CodeMirror incrementally maintains this syntax tree as the participant
        // edits, so gaze mapping does not need to reparse the whole Java file.
        const node = syntaxTree(view.state).resolveInner(position, 0);
        const bottomNode = node ? getMostBottomToken(node, position) : null;

        if (bottomNode) {
            const parent1 = bottomNode.parent;
            const parent2 = parent1 ? parent1.parent : null;
            semanticInformation.token = view.state.sliceDoc(bottomNode.from, bottomNode.to);
            semanticInformation.astChain = [
                bottomNode.type.name,
                parent1 ? parent1.type.name : "",
                parent2 ? parent2.type.name : ""
            ].join(" -> ");
        }

        return semanticInformation;
    };

    return {
        view,
        mapViewportPosition,
        destroy: () => view.destroy()
    };
};
