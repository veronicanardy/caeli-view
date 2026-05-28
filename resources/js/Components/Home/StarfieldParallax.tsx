import { ReactNode, useEffect, useRef } from 'react';

export function StarfieldParallax({ children }: { children: ReactNode }) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;

        if (!wrapper) {
            return undefined;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const smallViewport = window.matchMedia('(max-width: 767px)').matches;
        const pointer = { x: 0, y: 0 };
        let currentX = 0;
        let currentY = 0;
        let frame = 0;

        const update = () => {
            currentX += (pointer.x - currentX) * 0.12;
            currentY += (pointer.y - currentY) * 0.12;

            wrapper.style.setProperty('--parallax-x', `${currentX}px`);
            wrapper.style.setProperty('--parallax-y', `${currentY}px`);

            frame = window.requestAnimationFrame(update);
        };

        if (!reducedMotion && !coarsePointer && !smallViewport) {
            const onPointerMove = (event: PointerEvent) => {
                pointer.x = (event.clientX / window.innerWidth - 0.5) * 42;
                pointer.y = (event.clientY / window.innerHeight - 0.5) * 30;
            };

            window.addEventListener('pointermove', onPointerMove, { passive: true });
            update();

            return () => {
                window.cancelAnimationFrame(frame);
                window.removeEventListener('pointermove', onPointerMove);
            };
        }

        wrapper.style.setProperty('--parallax-x', '0px');
        wrapper.style.setProperty('--parallax-y', '0px');

        return undefined;
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="relative overflow-hidden isolate cosmic-hero"
            style={{ '--parallax-x': '0px', '--parallax-y': '0px' } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
