import { useEffect, useState } from "react";

export const fallbackPosterImage = "/fallback.jpg";

export const resolvePosterSource = (value = "") => String(value || "").trim() || fallbackPosterImage;

const PosterImage = ({ src = "", alt = "", className = "", fallbackSrc = fallbackPosterImage, onError, ...props }) => {
  const normalizedSrc = String(src || "").trim();
  const [imageSrc, setImageSrc] = useState(normalizedSrc || fallbackSrc);

  useEffect(() => {
    setImageSrc(normalizedSrc || fallbackSrc);
  }, [fallbackSrc, normalizedSrc]);

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt}
      className={className}
      onError={(eventObject) => {
        if (imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
        }

        onError?.(eventObject);
      }}
    />
  );
};

export default PosterImage;
