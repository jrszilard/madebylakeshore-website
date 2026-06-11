import { useEffect, useRef, useState } from 'react';

interface ImageItem {
  url: string;
  alt: string;
  thumbUrl: string;
}

interface SecretLinkRegion {
  enabled?: boolean;
  url?: string;
  xPct?: number;
  yPct?: number;
  widthPct?: number;
  heightPct?: number;
}

interface Props {
  images: ImageItem[];
  secretLinkRegion?: SecretLinkRegion | null;
}

interface ImageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function ImageViewer({ images, secretLinkRegion }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageBox, setImageBox] = useState<ImageBox | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const shouldShowSecretLink = Boolean(secretLinkRegion?.enabled && secretLinkRegion?.url);

  function updateImageBox() {
    const frame = frameRef.current;
    const image = imageRef.current;

    if (!frame || !image || !image.naturalWidth || !image.naturalHeight) {
      setImageBox(null);
      return;
    }

    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const frameRatio = frameWidth / frameHeight;

    let width = frameWidth;
    let height = frameHeight;
    let left = 0;
    let top = 0;

    if (frameRatio > imageRatio) {
      height = frameHeight;
      width = height * imageRatio;
      left = (frameWidth - width) / 2;
    } else {
      width = frameWidth;
      height = width / imageRatio;
      top = (frameHeight - height) / 2;
    }

    setImageBox({ left, top, width, height });
  }

  useEffect(() => {
    updateImageBox();
    window.addEventListener('resize', updateImageBox);
    return () => window.removeEventListener('resize', updateImageBox);
  }, [activeIndex, images]);

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

  const secretLinkStyle =
    shouldShowSecretLink && imageBox
      ? {
          left: imageBox.left + ((secretLinkRegion?.xPct ?? 0) / 100) * imageBox.width,
          top: imageBox.top + ((secretLinkRegion?.yPct ?? 0) / 100) * imageBox.height,
          width: ((secretLinkRegion?.widthPct ?? 15) / 100) * imageBox.width,
          height: ((secretLinkRegion?.heightPct ?? 10) / 100) * imageBox.height,
        }
      : undefined;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        ref={frameRef}
        className="relative aspect-[3/4] bg-daos-paper rounded-sm overflow-hidden flex items-center justify-center shadow-sm"
      >
        <img
          ref={imageRef}
          src={active.url}
          alt={active.alt}
          className="w-full h-full object-contain"
          onLoad={updateImageBox}
        />
        {shouldShowSecretLink && secretLinkStyle && (
          <a
            href={secretLinkRegion?.url}
            rel="noopener"
            aria-label="hidden link"
            className="absolute block hover:bg-daos-terracotta/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-daos-terracotta transition-colors"
            style={secretLinkStyle}
          />
        )}
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
