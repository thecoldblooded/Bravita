
import { useState } from "react";
import bravitaGif from "@/assets/bravita.gif";

export const ImageWithFallback = () => {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="w-32 h-32 bg-orange-100 rounded-lg animate-pulse flex items-center justify-center">
                <svg className="w-16 h-16 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <img
            src={bravitaGif}
            alt="Loading"
            className="w-full h-full object-contain"
            onError={() => setError(true)}
        />
    );
};
