// Utility to get GIF duration in ms using gifuct-js
// Usage: getGifDurationFromUrl(url).then(duration => ...)
import { decompressFrames, parseGIF } from 'gifuct-js';

export async function getGifDurationFromUrl(url: string): Promise<number> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);
  // Sum all frame delays (in hundredths of a second)
  const totalHundredths = frames.reduce((sum, frame) => sum + (frame.delay || 10), 0);
  // Convert to ms
  return totalHundredths * 10;
}
