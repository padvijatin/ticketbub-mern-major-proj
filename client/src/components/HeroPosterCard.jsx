import PosterImage from "./PosterImage.jsx";

const HeroPosterCard = ({
  image = "",
  title = "",
  wrapperClassName = "",
  imageClassName = "hero-swiper-card-image",
}) => {
  return (
    <div className={`hidden h-full items-center justify-end md:flex ${wrapperClassName}`.trim()}>
      <div className="relative flex h-full w-full max-w-[29rem] items-center justify-end">
        <div className="absolute inset-x-[0.2rem] inset-y-[2.2rem] rounded-[2.1rem] bg-[rgba(28,28,28,0.14)] blur-[24px]" />
        <div className="relative h-[calc(100%-3rem)] w-full overflow-hidden rounded-[1.9rem] shadow-[0_24px_54px_rgba(28,28,28,0.24)]">
          <div className="relative aspect-[2/3] h-full max-h-full w-full overflow-hidden rounded-[1.9rem]">
            <PosterImage
              src={image}
              alt={title}
              className={`absolute inset-0 h-full w-full ${imageClassName}`.trim()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroPosterCard;
