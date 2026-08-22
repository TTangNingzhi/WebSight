const formatCoordinate = (value) => Number.isFinite(value) ? Math.round(value) : 0;

/**
 * The eye tracker may sample at 60, 120, 250 Hz, or faster. Research callbacks
 * should still receive every sample, while the marker and text only need to
 * update once per browser paint. This renderer keeps the latest sample and uses
 * requestAnimationFrame solely for presentation—it does not throttle capture or
 * semantic mapping.
 */
export const createGazeRenderer = ({elements}) => {
    let latestSample = null;
    let animationFrameId = null;

    const flush = () => {
        animationFrameId = null;
        if (!latestSample) {
            return;
        }

        const {raw, viewport, semantic} = latestSample;
        elements.screenX.textContent = formatCoordinate(raw.screenX);
        elements.screenY.textContent = formatCoordinate(raw.screenY);
        elements.windowX.textContent = formatCoordinate(viewport.x);
        elements.windowY.textContent = formatCoordinate(viewport.y);
        elements.lineNumber.textContent = semantic.lineNum;
        elements.columnNumber.textContent = semantic.columnNum;
        elements.token.textContent = semantic.token;
        elements.astChain.textContent = semantic.astChain;

        // posAtCoords uses viewport coordinates, so a fixed-position marker is
        // the direct visual equivalent. transform avoids top/left layout work.
        elements.marker.style.transform =
            `translate3d(${viewport.x - 10}px, ${viewport.y - 10}px, 0)`;
    };

    const renderLatest = (sample) => {
        latestSample = sample;
        if (animationFrameId === null) {
            animationFrameId = window.requestAnimationFrame(flush);
        }
    };

    return {
        renderLatest,
        setStatus: (message) => {
            elements.sourceStatus.textContent = message;
        },
        destroy: () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
        }
    };
};
