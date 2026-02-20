import { useState, useEffect, useCallback, useRef } from 'react';

interface UseProgressiveImageLoaderOptions {
  urls: string[];
  priorityFrames?: number[]; // İlk yüklenecek frame indeksleri
  batchSize?: number; // Her seferde kaç frame yüklenecek
  onProgress?: (loaded: number, total: number) => void;
}

interface UseProgressiveImageLoaderResult {
  images: (HTMLImageElement | null)[];
  isFirstFrameReady: boolean;
  isPriorityLoaded: boolean;
  isFullyLoaded: boolean;
  loadedCount: number;
  progress: number;
}

export function useProgressiveImageLoader({
  urls,
  priorityFrames = [0, 1, 2], // İlk 3 frame öncelikli
  batchSize = 5,
  onProgress,
}: UseProgressiveImageLoaderOptions): UseProgressiveImageLoaderResult {
  const [images, setImages] = useState<(HTMLImageElement | null)[]>(() =>
    new Array(urls.length).fill(null)
  );
  const [isFirstFrameReady, setIsFirstFrameReady] = useState(false);
  const [isPriorityLoaded, setIsPriorityLoaded] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const loadedRef = useRef<Set<number>>(new Set());
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(urls.length).fill(null));

  const loadImage = useCallback((url: string, index: number): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadedRef.current = new Set();
    imagesRef.current = new Array(urls.length).fill(null);

    const loadImageAndUpdate = async (index: number) => {
      if (!isMounted || loadedRef.current.has(index)) return;

      try {
        const img = await loadImage(urls[index], index);

        if (!isMounted) return;

        loadedRef.current.add(index);
        imagesRef.current[index] = img;

        setImages([...imagesRef.current]);
        setLoadedCount(loadedRef.current.size);
        onProgress?.(loadedRef.current.size, urls.length);

        // İlk frame yüklendiğinde
        if (index === 0) {
          setIsFirstFrameReady(true);
        }

        // Öncelikli frame'ler yüklendiğinde
        if (priorityFrames.every(i => loadedRef.current.has(i))) {
          setIsPriorityLoaded(true);
        }

        // Tüm frame'ler yüklendiğinde
        if (loadedRef.current.size === urls.length) {
          setIsFullyLoaded(true);
        }
      } catch {
        // Ignore individual frame load failures.
      }
    };

    const loadSequentially = async () => {
      // 1. Önce ilk frame'i yükle (hemen göster)
      await loadImageAndUpdate(0);

      // 2. Öncelikli frame'leri yükle
      const priorityPromises = priorityFrames
        .filter(i => i !== 0)
        .map(i => loadImageAndUpdate(i));
      await Promise.all(priorityPromises);

      // 3. Geri kalan frame'leri batch'ler halinde yükle
      const remainingIndices = urls
        .map((_, i) => i)
        .filter(i => !priorityFrames.includes(i));

      for (let i = 0; i < remainingIndices.length; i += batchSize) {
        if (!isMounted) break;

        const batch = remainingIndices.slice(i, i + batchSize);
        await Promise.all(batch.map(index => loadImageAndUpdate(index)));

        // Küçük bir gecikme ile browser'a nefes aldır
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    loadSequentially();

    return () => {
      isMounted = false;
    };
  }, [urls, priorityFrames, batchSize, loadImage, onProgress]);

  return {
    images,
    isFirstFrameReady,
    isPriorityLoaded,
    isFullyLoaded,
    loadedCount,
    progress: urls.length > 0 ? (loadedCount / urls.length) * 100 : 0,
  };
}
