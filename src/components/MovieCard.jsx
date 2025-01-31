function MovieCard({ movie }) {
  // Function to convert ALL CAPS to Title Case
  const toTitleCase = (str) => {
    // Words that should not be capitalized in titles
    const minorWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 
                       'of', 'on', 'or', 'the', 'to', 'with'];
    
    // Check if string is all uppercase
    const isAllCaps = str === str.toUpperCase();
    
    if (!isAllCaps) return str;
    
    return str.toLowerCase().split(' ').map((word, index) => {
      // Always capitalize first and last word
      if (index === 0 || index === str.split(' ').length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Don't capitalize minor words
      if (minorWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // Capitalize other words
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  return (
    <div className="bg-[#E1EBFD] p-4 flex flex-col h-full"
         style={{ boxShadow: '4px 4px 4px rgba(136, 102, 93, 1)' }}>
      <p className="font-['Source_Code_Pro'] text-[#8C8C8C] text-sm mb-1">
        {movie.theater}
      </p>
      
      <h2 className="font-['Source_Code_Pro'] text-2xl font-semibold text-[#1A0F0F] mb-3 truncate"
          title={toTitleCase(movie.title)}>
        {toTitleCase(movie.title).length > 35 
          ? `${toTitleCase(movie.title).slice(0, 35)}...` 
          : toTitleCase(movie.title)}
      </h2>
      
      <div className="font-['Source_Code_Pro'] mt-auto">
        <p className="text-[#1A0F0F] text-sm mb-2">
          Showtimes:
        </p>
        <div className="flex flex-wrap gap-2">
          {movie.showtimes.map((time, index) => (
            <span 
              key={index}
              className="bg-[#FCEC73] px-3 py-1 text-[#1A0F0F] text-sm"
              style={{ boxShadow: '0 0 12px rgba(252, 236, 115, 0.5)' }}
            >
              {time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MovieCard; 