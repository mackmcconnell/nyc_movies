function TheaterFilter({ selectedTheater, onChange }) {
  const theaters = ['all', 'Metrograph', 'Film Forum'];

  return (
    <div className="flex gap-2">
      {theaters.map(theater => (
        <button
          key={theater}
          onClick={() => onChange(theater)}
          className={`
            px-4 py-2 
            bg-[#1a0f0f] 
            text-[#FCEC73] 
            rounded 
            font-bold
            ${selectedTheater === theater 
              ? 'border-[3px] border-[#FCEC73]' 
              : 'border-[3px] border-transparent'
            }
          `}
          style={{
            textShadow: '0 0 12px rgba(252, 236, 115, 0.5)',
            ...(selectedTheater === theater ? {
              boxShadow: '0 0 12px rgba(252, 236, 115, 0.5)'
            } : {})
          }}
        >
          {theater === 'all' ? 'All Theaters' : theater}
        </button>
      ))}
    </div>
  );
}

export default TheaterFilter; 