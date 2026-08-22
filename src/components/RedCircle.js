/**
 * RedCircle component is a simple red circle that follows the user's gaze position on the screen.
 * @param gazePosOnWindow The gaze position on the window.
 * @returns {JSX.Element} A red circle that follows the user's gaze position.
 * @constructor
 */
const RedCircle = ({gazePosOnWindow}) => {
    const circleStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        transform: `translate3d(${gazePosOnWindow.x - 10}px, ${gazePosOnWindow.y - 10}px, 0)`,
        width: '20px',
        height: '20px',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 1000,
    };

    return (
        <div style={circleStyle}></div>
    );
}

export default RedCircle;
