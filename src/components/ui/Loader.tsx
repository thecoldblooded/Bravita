import React from "react";
import styled from "styled-components";
import bravitaGif from "@/assets/bravita.gif";

interface LoaderProps {
  size?: string;
  noMargin?: boolean;
  className?: string;
}

export default function Loader({ size = "240px", noMargin = false, className }: LoaderProps) {
  return (
    <StyledWrapper $size={size} $noMargin={noMargin} className={className}>
      <div className="loader-container">
        <img
          src={bravitaGif}
          alt="Bravita Loader"
          className="bravita-gif"
        />
        <div className="shimmer"></div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div<{ $size: string; $noMargin: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: ${props => props.$noMargin ? "0" : "2rem 0"};
  width: 100%;
  
  .loader-container {
    position: relative;
    width: ${props => props.$size};
    height: ${props => props.$size};
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    /* Subtle glow effect only if NOT in a button/noMargin context */
    box-shadow: ${props => props.$noMargin ? "none" : "0 10px 30px -10px rgba(246, 139, 40, 0.2)"};
    background: ${props => props.$noMargin ? "transparent" : "white"};
    overflow: hidden;
  }

  .bravita-gif {
    width: 90%;
    height: 90%;
    object-fit: contain;
    z-index: 2;
  }

  /* Premium shimmer effect over the loader */
  .shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: shimmer 1.5s infinite;
    z-index: 3;
  }

  @keyframes shimmer {
    100% {
      left: 100%;
    }
  }
`;
