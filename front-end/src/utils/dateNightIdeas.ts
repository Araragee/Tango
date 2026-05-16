export interface DateNightIdea {
  id: string;
  title: string;
  category: 'cozy' | 'adventure' | 'classic' | 'creative' | 'cheap';
  cost: '$' | '$$' | '$$$';
  icon: string;
}

export const DATE_NIGHT_IDEAS: DateNightIdea[] = [
  // Cozy
  { id: 'cozy-movie-night',     title: 'Movie marathon + popcorn',     category: 'cozy',      cost: '$',   icon: 'theaters' },
  { id: 'cozy-cook-together',   title: 'Cook a new recipe together',   category: 'cozy',      cost: '$',   icon: 'restaurant' },
  { id: 'cozy-board-games',     title: 'Board games + hot chocolate',  category: 'cozy',      cost: '$',   icon: 'casino' },
  { id: 'cozy-pottery-stream',  title: 'Painting / pottery + stream',  category: 'cozy',      cost: '$',   icon: 'palette' },
  { id: 'cozy-bath',            title: 'Candlelit bath + playlist',    category: 'cozy',      cost: '$',   icon: 'bathtub' },

  // Adventure
  { id: 'adv-hike',             title: 'Hike a new trail',             category: 'adventure', cost: '$',   icon: 'hiking' },
  { id: 'adv-bike',             title: 'Bike along the river',         category: 'adventure', cost: '$',   icon: 'directions_bike' },
  { id: 'adv-stargaze',         title: 'Drive out + stargaze',         category: 'adventure', cost: '$',   icon: 'star' },
  { id: 'adv-kayak',            title: 'Kayak or paddle-board',        category: 'adventure', cost: '$$',  icon: 'kayaking' },
  { id: 'adv-day-trip',         title: 'Day trip to a nearby town',    category: 'adventure', cost: '$$',  icon: 'directions_car' },

  // Classic
  { id: 'classic-dinner',       title: 'Dinner at a new restaurant',   category: 'classic',   cost: '$$',  icon: 'restaurant_menu' },
  { id: 'classic-coffee',       title: 'Specialty coffee crawl',       category: 'classic',   cost: '$',   icon: 'local_cafe' },
  { id: 'classic-movie-out',    title: 'Catch a movie at the cinema',  category: 'classic',   cost: '$$',  icon: 'movie' },
  { id: 'classic-concert',      title: 'Live music or open mic',       category: 'classic',   cost: '$$',  icon: 'music_note' },
  { id: 'classic-dancing',      title: 'Go dancing',                   category: 'classic',   cost: '$$',  icon: 'nightlife' },

  // Creative
  { id: 'creative-photo-walk',  title: 'Photography walk in the city', category: 'creative',  cost: '$',   icon: 'photo_camera' },
  { id: 'creative-museum',      title: 'Museum / gallery visit',       category: 'creative',  cost: '$$',  icon: 'museum' },
  { id: 'creative-cookbook',    title: 'Pick a cookbook + make a meal',category: 'creative',  cost: '$$',  icon: 'menu_book' },
  { id: 'creative-puzzle',      title: 'Jigsaw puzzle race',           category: 'creative',  cost: '$',   icon: 'extension' },

  // Cheap
  { id: 'cheap-picnic',         title: 'Park picnic',                  category: 'cheap',     cost: '$',   icon: 'park' },
  { id: 'cheap-library',        title: 'Library trip + reading hour',  category: 'cheap',     cost: '$',   icon: 'local_library' },
  { id: 'cheap-farmers',        title: 'Farmers market stroll',        category: 'cheap',     cost: '$',   icon: 'storefront' },
  { id: 'cheap-window',         title: 'Window-shop downtown',         category: 'cheap',     cost: '$',   icon: 'storefront' },
  { id: 'cheap-sunset',         title: 'Sunset spot + snacks',         category: 'cheap',     cost: '$',   icon: 'wb_twilight' },
];

export function randomDateNightIdea(filter?: { category?: DateNightIdea['category']; cost?: DateNightIdea['cost'] }): DateNightIdea {
  let pool = DATE_NIGHT_IDEAS;
  if (filter?.category) pool = pool.filter(i => i.category === filter.category);
  if (filter?.cost)     pool = pool.filter(i => i.cost === filter.cost);
  if (pool.length === 0) pool = DATE_NIGHT_IDEAS;
  return pool[Math.floor(Math.random() * pool.length)];
}
