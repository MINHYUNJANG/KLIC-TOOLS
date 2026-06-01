import { useState, useRef, useEffect } from 'react';

export function useModalDrag() {
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging.current) return;
            setDragPos({
                x: dragStart.current.posX + e.clientX - dragStart.current.mouseX,
                y: dragStart.current.posY + e.clientY - dragStart.current.mouseY,
            });
        };
        const handleMouseUp = () => { isDragging.current = false; };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleDragStart = (e) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: dragPos.x, posY: dragPos.y };
        e.preventDefault();
    };

    const dragStyle = { transform: `translate(calc(-50% + ${dragPos.x}px), calc(-50% + ${dragPos.y}px))` };

    return { dragStyle, handleDragStart };
}
