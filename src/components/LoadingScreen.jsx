function LoadingScreen() {
  // Debug log to verify component is rendering
  console.log('Loading screen rendered');

  return (
    <div className="h-screen flex items-center justify-center -mt-[25vh]">
      <div className="relative w-32 h-32">
        {/* Spinning Circle */}
        <div className="absolute inset-0 animate-spin">
          <div className="h-full w-full rounded-full border-4 border-[#FCEC73] 
                         border-t-transparent blur-[0.5px]">
          </div>
        </div>
        
        {/* Rose Image */}
        <img 
          src="/rose.png" 
          alt="Loading..." 
          onError={(e) => console.error('Failed to load rose image')}
          onLoad={() => console.log('Rose image loaded successfully')}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-12 h-auto z-10"
          style={{
            filter: 'brightness(0) saturate(100%) invert(89%) sepia(19%) saturate(895%) hue-rotate(358deg) brightness(103%) contrast(94%) blur(0.5px)',
            WebkitFilter: 'brightness(0) saturate(100%) invert(89%) sepia(19%) saturate(895%) hue-rotate(358deg) brightness(103%) contrast(94%) blur(0.5px)'
          }}
        />
      </div>
    </div>
  );
}

export default LoadingScreen; 