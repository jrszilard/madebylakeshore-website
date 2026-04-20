import { useState, useEffect, useCallback } from 'react';

interface CarouselImage {
  url: string;
  alt?: string;
  caption?: string;
}

interface Props {
  images: CarouselImage[];
  interval?: number;
}

export default function MediumCarousel({ images, interval = 3500 }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent(i => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (paused || images.length <= 1) return;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [paused, next, interval, images.length]);

  if (!images.length) return null;

  return (
    <div
      className="relative overflow-hidden rounded-sm bg-daos-warm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div className="relative aspect-[4/3]">
        {images.map((img, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
          >
            <img
              src={img.url}
              alt={img.alt ?? ''}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Caption */}
      {images[current]?.caption && (
        <p className="px-4 py-2 font-sans text-sm text-daos-charcoal italic">
          {images[current].caption}
        </p>
      )}

      {/* Controls */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to image ${i + 1}`}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i === current ? '#2d2a26' : '#c4a77d' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
