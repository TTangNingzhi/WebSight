/**
 * Browsers do not expose a dependable API for the exact position of the web
 * page's content area on the physical screen. window.screenX/screenY locate the
 * outer browser window, which also includes tabs, toolbars, and borders.
 *
 * A pointer event contains both screen and client coordinates, so their
 * difference gives a practical calibration of the viewport's top-left corner:
 *
 *   viewport origin on screen = event.screen - event.client
 *
 * For a real eye tracker, ask the participant to move the pointer over the page
 * once after moving/resizing the browser, or run the experiment in a fixed/full-
 * screen window. Also validate devicePixelRatio and multi-monitor coordinates
 * against the eye tracker's coordinate system.
 */
export const createCoordinateMapper = () => {
    let windowPosOnScreen = null;

    const calibrate = ({screenX, screenY, clientX, clientY}) => {
        if (![screenX, screenY, clientX, clientY].every(Number.isFinite)) {
            return;
        }

        windowPosOnScreen = {
            x: screenX - clientX,
            y: screenY - clientY
        };
    };

    const toViewport = (sample) => {
        // Mouse demo samples already contain exact client coordinates. They also
        // continuously refresh calibration for later screen-only gaze samples.
        if (Number.isFinite(sample.clientX) && Number.isFinite(sample.clientY)) {
            calibrate(sample);
            return {x: sample.clientX, y: sample.clientY};
        }

        if (!windowPosOnScreen) {
            return null;
        }

        return {
            x: sample.screenX - windowPosOnScreen.x,
            y: sample.screenY - windowPosOnScreen.y
        };
    };

    const handlePointerMove = (event) => calibrate(event);
    window.addEventListener("pointermove", handlePointerMove, {passive: true});

    return {
        toViewport,
        isCalibrated: () => windowPosOnScreen !== null,
        destroy: () => window.removeEventListener("pointermove", handlePointerMove)
    };
};
