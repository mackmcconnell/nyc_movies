// Generate dates for the next two weeks
const getNextTwoWeeks = () => {
  const dates = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const dates = getNextTwoWeeks();
const todayStr = dates[0];
const tomorrowStr = dates[1];

// Keep your existing base movies...
export const sampleMovieData = [
  // Week 1 - Classic Films
  {
    title: "The Godfather",
    theater: "Metrograph",
    date: todayStr,
    time: "7:00 PM",
    duration: "175 min",
    director: "Francis Ford Coppola"
  },
  {
    title: "In the Mood for Love",
    theater: "Film Forum",
    date: dates[2],
    time: "6:30 PM",
    duration: "98 min",
    director: "Wong Kar-wai"
  },
  {
    title: "2001: A Space Odyssey",
    theater: "Quad Cinema",
    date: dates[3],
    time: "8:00 PM",
    duration: "149 min",
    director: "Stanley Kubrick"
  },
  {
    title: "Seven Samurai",
    theater: "Metrograph",
    date: dates[4],
    time: "3:00 PM",
    duration: "207 min",
    director: "Akira Kurosawa"
  },
  {
    title: "Paris, Texas",
    theater: "Film Forum",
    date: todayStr,
    time: "9:15 PM",
    duration: "145 min",
    director: "Wim Wenders"
  },
  // Week 2 - More Classics
  {
    title: "Mulholland Drive",
    theater: "Metrograph",
    date: dates[7],
    time: "7:30 PM",
    duration: "147 min",
    director: "David Lynch"
  },
  {
    title: "8½",
    theater: "Quad Cinema",
    date: dates[8],
    time: "8:15 PM",
    duration: "138 min",
    director: "Federico Fellini"
  },
  {
    title: "Persona",
    theater: "Film Forum",
    date: dates[9],
    time: "7:00 PM",
    duration: "83 min",
    director: "Ingmar Bergman"
  },
  {
    title: "La Dolce Vita",
    theater: "Metrograph",
    date: dates[4],
    time: "6:30 PM",
    duration: "174 min",
    director: "Federico Fellini"
  },
  // Adding more movies for each theater and date...
  {
    title: "Breathless",
    theater: "Film Forum",
    date: todayStr,
    time: "4:30 PM",
    duration: "90 min",
    director: "Jean-Luc Godard"
  },
  {
    title: "Tokyo Story",
    theater: "Quad Cinema",
    date: todayStr,
    time: "5:15 PM",
    duration: "136 min",
    director: "Yasujirō Ozu"
  },
  {
    title: "Stalker",
    theater: "Metrograph",
    date: tomorrowStr,
    time: "4:00 PM",
    duration: "162 min",
    director: "Andrei Tarkovsky"
  },
  {
    title: "The 400 Blows",
    theater: "Film Forum",
    date: tomorrowStr,
    time: "3:30 PM",
    duration: "99 min",
    director: "François Truffaut"
  },
  {
    title: "Wings of Desire",
    theater: "Quad Cinema",
    date: tomorrowStr,
    time: "6:00 PM",
    duration: "128 min",
    director: "Wim Wenders"
  },
  // Adding contemporary films as well
  {
    title: "Past Lives",
    theater: "Metrograph",
    date: todayStr,
    time: "9:30 PM",
    duration: "105 min",
    director: "Celine Song"
  },
  {
    title: "Poor Things",
    theater: "Film Forum",
    date: tomorrowStr,
    time: "9:00 PM",
    duration: "141 min",
    director: "Yorgos Lanthimos"
  }
];

// Additional movies to generate more showings
const additionalMovies = [
  {
    title: "The Seventh Seal",
    director: "Ingmar Bergman",
    duration: "96 min"
  },
  {
    title: "Bicycle Thieves",
    director: "Vittorio De Sica",
    duration: "89 min"
  },
  {
    title: "Mirror",
    director: "Andrei Tarkovsky",
    duration: "107 min"
  }
];

const theaters = ["Metrograph", "Film Forum", "Quad Cinema"];
const times = ["1:00 PM", "3:30 PM", "6:00 PM", "8:30 PM", "9:45 PM"];

// Generate additional showings across the two weeks
additionalMovies.forEach(movie => {
  dates.forEach(date => {
    // Add 1-2 showings per movie per day
    const numShowings = Math.floor(Math.random() * 2) + 1;
    for (let j = 0; j < numShowings; j++) {
      const theater = theaters[Math.floor(Math.random() * theaters.length)];
      const time = times[Math.floor(Math.random() * times.length)];
      
      sampleMovieData.push({
        ...movie,
        theater,
        date,
        time
      });
    }
  });
});

// Sort movies by date and time
sampleMovieData.sort((a, b) => {
  const dateCompare = new Date(a.date) - new Date(b.date);
  if (dateCompare === 0) {
    return a.time.localeCompare(b.time);
  }
  return dateCompare;
}); 