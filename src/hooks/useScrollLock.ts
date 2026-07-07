import { useEffect } from 'react';

export function useScrollLock(lock: boolean) {
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lenis = (window as any).lenis;

        const preventDefault = (e: TouchEvent) => {
            if (e.touches.length > 1) return;
            const isScrollable = (e.target as HTMLElement).closest('.overflow-y-auto');
            if (!isScrollable) {
                e.preventDefault();
            }
        };

        const handleWheel = (e: WheelEvent) => {
            const isScrollable = (e.target as HTMLElement).closest('.overflow-y-auto');
            if (!isScrollable) {
                e.preventDefault();
            } else {
                e.stopPropagation();
            }
        };

        if (lock) {
            // 1. Handle Lenis (Smooth Scroll)
            if (lenis) {
                lenis.stop();
            }

            // 2. Standard Scroll Lock
            const scrollY = window.scrollY;
            const originalOverflow = document.body.style.overflow;
            const originalPosition = document.body.style.position;
            const originalTop = document.body.style.top;
            const originalWidth = document.body.style.width;

            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            // 3. Final barrier against touch bleed
            document.addEventListener('touchmove', preventDefault, { passive: false });
            document.addEventListener('wheel', handleWheel, { passive: false });

            return () => {
                // Restore Lenis
                if (lenis) {
                    lenis.start();
                }

                // Restore standard scroll
                const savedScrollY = parseInt(document.body.style.top || '0') * -1;
                document.body.style.position = originalPosition;
                document.body.style.top = originalTop;
                document.body.style.width = originalWidth;
                document.body.style.overflow = originalOverflow;

                if (!isNaN(savedScrollY) && savedScrollY > 0) {
                    window.scrollTo(0, savedScrollY);
                }

                document.removeEventListener('touchmove', preventDefault);
                document.removeEventListener('wheel', handleWheel);
            };
        } else {
            // Explicitly force unlock if lock is false
            if (lenis) {
                lenis.start();
            }
            if (document.body.style.position === 'fixed') {
                const savedScrollY = parseInt(document.body.style.top || '0') * -1;
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                if (!isNaN(savedScrollY) && savedScrollY > 0) {
                    window.scrollTo(0, savedScrollY);
                }
            }
        }
    }, [lock]);
}
