import { useState } from 'react';

interface ImageItem {
  url: string;
  alt: string;
  thumbUrl: string;
}

interface Props {
  images: ImageItem[];
}

export default function ImageViewer({ images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-daos-warm flex items-center justify-center rounded-sm">
        <span style={{ fontFamily: '"Playfair Display", Georgia, serif' }} className="text-daos-ink/30 text-xl">
          No image available
        </span>
      </div>
    );
  }

  const active = images[activeIndex];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-[3/4] bg-daos-paper rounded-sm overflow-hidden flex items-center justify-center shadow-sm">
        <img
          src={active.url}
          alt={active.alt}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Thumbnail strip — only shown when more than one image */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={[
                'w-16 h-16 rounded-sm overflow-hidden border-2 transition-colors duration-200 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-daos-terracotta-dark',
                i === activeIndex
                  ? 'border-daos-terracotta-dark'
                  : 'border-transparent hover:border-daos-clay',
              ].join(' ')}
            >
              <img
                src={img.thumbUrl}
                alt={img.alt || `Image ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
