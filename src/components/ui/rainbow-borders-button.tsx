import React from 'react';

export const RainbowButton = () => {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <button className="rainbow-border relative w-[140px] h-10 flex items-center justify-center gap-2.5 px-4 bg-black rounded-xl border-none text-white cursor-pointer font-black transition-all duration-200">
                Button
            </button>
        </div>
    );
};
