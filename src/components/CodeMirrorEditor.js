import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {java} from '@codemirror/lang-java';
import {syntaxTree} from "@codemirror/language";
import {EditorView} from "@codemirror/view";
import RedCircle from "./RedCircle";

// CodeMirror treats extensions as configuration. Reusing these instances avoids
// reconfiguring the editor whenever a new gaze sample renders this component.
const editorExtensions = [
    java(),
    EditorView.theme({
        "&": {
            fontSize: "16px"
        }
    })
];

/**
 * Get the most bottom token node in the given position from a middle layer node in the syntax tree.
 * @param node a node in the syntax tree, most likely the middle layer node instead of the most bottom token
 * @param position the position of current gaze in the editor
 * @returns {*|{firstChild}|null} the most bottom token node in the given position
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

const setSemanticInfoIfChanged = (setSemanticInfo, nextSemanticInfo) => {
    setSemanticInfo(currentSemanticInfo => (
        currentSemanticInfo.lineNum === nextSemanticInfo.lineNum &&
        currentSemanticInfo.columnNum === nextSemanticInfo.columnNum &&
        currentSemanticInfo.token === nextSemanticInfo.token &&
        currentSemanticInfo.astChain === nextSemanticInfo.astChain
            ? currentSemanticInfo
            : nextSemanticInfo
    ));
};

const CodeMirrorEditor = ({code, gazePosOnScreen}) => {

    const [windowPosOnScreen, setWindowPosOnScreen] = useState({x: 0, y: 0});
    const gazePosOnWindow = useMemo(() => ({
        x: gazePosOnScreen.x - windowPosOnScreen.x,
        y: gazePosOnScreen.y - windowPosOnScreen.y
    }), [gazePosOnScreen.x, gazePosOnScreen.y, windowPosOnScreen.x, windowPosOnScreen.y]);

    // Some semantic information we want to interpret from raw gaze data, e.g., line, column, token, AST chain
    const [semanticInfo, setSemanticInfo] = useState({
        lineNum: 0,
        columnNum: 0,
        token: "",
        astChain: ""
    });

    const editorRef = useRef(null);

    // Calculate the position of the top-left corner of the web page on the screen using the mouse move event.
    // It is accurate enough but relying on user's mouse movement into the browser window.
    // This is a workaround because, to the best of my knowledge, there is no direct way to get this information.
    // I suspect the relative position of web page is privacy- and security-sensitive.
    // However, although I haven't found a way, some functions of window object may help,
    // e.g., screenX/Y, outerWidth/Height, innerWidth/Height, visualViewport. Future developers can explore more.
    useEffect(() => {
        const handleMouseMove = (event) => {
            const nextWindowPosition = {
                x: event.screenX - event.clientX,
                y: event.screenY - event.clientY
            };
            setWindowPosOnScreen(currentWindowPosition => (
                currentWindowPosition.x === nextWindowPosition.x &&
                currentWindowPosition.y === nextWindowPosition.y
                    ? currentWindowPosition
                    : nextWindowPosition
            ));
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    useEffect(() => {
        const emptySemanticInfo = {
            lineNum: 0,
            columnNum: 0,
            token: "",
            astChain: ""
        };

        if (editorRef.current) {
            const view = editorRef.current.view;

            // Convert the gaze coordinates on the window to the position in the editor.
            // Note that the position returned by the API is actually where the CURSOR would be located if you clicked at that point.
            // For example, if you click on the blank space after the last character of a line,
            // the position returned will be the location of the last character, not the blank space!
            // Therefore, if we use it directly, we may get the wrong line and column numbers.
            // To resolve this, we need to check if the gaze position is within the range of actual characters in the line.
            const position = view.posAtCoords(gazePosOnWindow);

            if (position !== null) {
                const line = view.state.doc.lineAt(position);

                // Get the coordinates of the first and last characters of the line.
                const firstCharCoords = view.coordsAtPos(line.from)
                const lastCharCoords = view.coordsAtPos(line.to);

                // Check if the gaze position is within the range of the characters within that line.
                if (
                    lastCharCoords &&
                    firstCharCoords &&
                    gazePosOnWindow.y >= firstCharCoords.top && gazePosOnWindow.y <= lastCharCoords.bottom &&
                    gazePosOnWindow.x >= firstCharCoords.left && gazePosOnWindow.x <= lastCharCoords.right
                ) {
                    const nextSemanticInfo = {
                        ...emptySemanticInfo,
                        lineNum: line.number,
                        columnNum: position - line.from + 1
                    };
                    const tree = syntaxTree(view.state);
                    // Get the AST node at the given position. However, it is not the most bottom token, could be a middle layer node.
                    const node = tree.resolveInner(position, 0);
                    if (node) {
                        // Get the most bottom token node in the given position from a middle layer node in the syntax tree.
                        const bottomNode = getMostBottomToken(node, position);
                        if (bottomNode) {
                            // Get the token and two parent nodes' type names as the AST chain.
                            const parent1 = bottomNode.parent;
                            const parent2 = parent1 ? parent1.parent : null;
                            nextSemanticInfo.token = view.state.sliceDoc(bottomNode.from, bottomNode.to);
                            nextSemanticInfo.astChain = `${bottomNode.type.name} -> ${parent1 ? parent1.type.name : ""} -> ${parent2 ? parent2.type.name : ""}`;
                        }
                    }
                    setSemanticInfoIfChanged(setSemanticInfo, nextSemanticInfo);
                    return;
                }
            }
        }
        setSemanticInfoIfChanged(setSemanticInfo, emptySemanticInfo);
    }, [gazePosOnWindow]);

    const handleCreateEditor = useCallback((view) => {
        editorRef.current = {view};
    }, []);

    const {lineNum, columnNum, token, astChain} = semanticInfo;

    return (
        <div>
            <RedCircle gazePosOnWindow={gazePosOnWindow}/>
            <ul>
                <li>Gaze (mouse) position on screen: X: {gazePosOnScreen.x}, Y: {gazePosOnScreen.y}</li>
                <li>Gaze (mouse) position on window: X: {gazePosOnWindow.x}, Y: {gazePosOnWindow.y}</li>
                <li>Gaze (mouse) is over line {lineNum}, column {columnNum}</li>
                <ul>
                    <li>Token: {token}</li>
                    <li>AST chain: {astChain}</li>
                </ul>
            </ul>
            <CodeMirror
                value={code}
                extensions={editorExtensions} // Can be extended with more languages
                height="500px"
                onCreateEditor={handleCreateEditor}
                // readOnly // Can be added to disable editing
            />
        </div>
    );
};

export default CodeMirrorEditor;
