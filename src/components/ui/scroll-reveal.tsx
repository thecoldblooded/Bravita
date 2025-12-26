import React from 'react';
import { motion } from 'framer-motion';

interface ScrollRevealProps {
    children: React.ReactNode;
    direction?: 'up' | 'down' | 'left' | 'right';
    delay?: number;
    duration?: number;
    threshold?: number;
    className?: string;
    distance?: number;
}

const ScrollReveal = ({
    children,
    direction = 'up',
    delay = 0,
    duration = 0.8,
    threshold = 0.1,
    className = "",
    distance = 50,
}: ScrollRevealProps) => {
    const getInitialPosition = () => {
        switch (direction) {
            case 'up': return { y: distance };
            case 'down': return { y: -distance };
            case 'left': return { x: distance };
            case 'right': return { x: -distance };
            default: return { y: distance };
        }
    };

    return (
        <motion.div
            initial={{
                opacity: 0,
                ...getInitialPosition()
            }}
            whileInView={{
                opacity: 1,
                x: 0,
                y: 0
            }}
            viewport={{ once: true, amount: threshold }}
            transition={{
                duration: duration,
                delay: delay,
                ease: [0.21, 0.47, 0.32, 0.98]
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;
