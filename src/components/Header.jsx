function Header() {
  return (
    <div className="relative py-6 mb-8">
      {/* Top bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-[5px] bg-[#FCEC73]"
        style={{ boxShadow: '0 0 18px rgba(252, 236, 115, 0.5)' }}
      />
      
      <div className="flex items-center gap-2 md:justify-start justify-center">
        <div className="flex md:flex-row flex-col items-center gap-4">
          <img 
            src="/rose.png" 
            alt="Rose" 
            className="h-9 w-auto object-contain pr-2"
            style={{
              filter: 'brightness(0) saturate(100%) invert(89%) sepia(19%) saturate(895%) hue-rotate(358deg) brightness(103%) contrast(94%)',
              WebkitFilter: 'brightness(0) saturate(100%) invert(89%) sepia(19%) saturate(895%) hue-rotate(358deg) brightness(103%) contrast(94%)',
            }}
          />
          <h1 className="text-6xl text-theme text-center md:text-left">NYC Movie Showtimes</h1>
        </div>
      </div>
      
      {/* Bottom bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[5px] bg-[#FCEC73]"
        style={{ boxShadow: '0 0 12px rgba(252, 236, 115, 0.5)' }}
      />
    </div>
  );
}

export default Header; 