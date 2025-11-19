// Add Content to config.json
// Usage: 
//   node add-content.js --movie 575265
//   node add-content.js --tv 248852
//   node add-content.js --movie 575265 --tv 248852
//   node add-content.js --movie 575265,617126,1087192

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const apiKey = process.env.TMDB_API_KEY;
if (!apiKey) {
  console.error('❌ Error: TMDB_API_KEY not found in environment variables.');
  console.error('   Please create a .env file in the dsjs directory with:');
  console.error('   TMDB_API_KEY=your_api_key_here');
  process.exit(1);
}

const baseUrl = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const configPath = path.join(__dirname, '..', 'config.json');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    movies: [],
    tv: []
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--movie' && args[i + 1]) {
      // Support comma-separated IDs
      const ids = args[i + 1].split(',').map(id => parseInt(id.trim()));
      result.movies.push(...ids);
      i++;
    } else if (args[i] === '--tv' && args[i + 1]) {
      // Support comma-separated IDs
      const ids = args[i + 1].split(',').map(id => parseInt(id.trim()));
      result.tv.push(...ids);
      i++;
    }
  }

  return result;
}

// Load existing config.json
function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading config.json:', error.message);
    process.exit(1);
  }
}

// Save config.json with backup
function saveConfig(config) {
  try {
    // Create backup
    const backupPath = configPath + '.backup.' + Date.now();
    fs.copyFileSync(configPath, backupPath);
    console.log(`📦 Backup created: ${path.basename(backupPath)}`);

    // Save updated config
    const jsonString = JSON.stringify(config, null, '\t');
    fs.writeFileSync(configPath, jsonString, 'utf8');
    console.log('✅ config.json updated successfully!');
  } catch (error) {
    console.error('❌ Error saving config.json:', error.message);
    process.exit(1);
  }
}

// Fetch movie from TMDB
async function fetchMovie(movieId) {
  try {
    console.log(`🎬 Fetching movie ID: ${movieId}`);
    
    const response = await fetch(`${baseUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=images,credits`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract backdrop and poster paths
    const backdropPath = data.backdrop_path || (data.images?.backdrops?.[0]?.file_path);
    const posterPath = data.poster_path || (data.images?.posters?.[0]?.file_path);
    
    // Extract director
    const director = data.credits?.crew?.find(person => person.job === 'Director')?.name || 'N/A';
    
    // Extract main cast (first 6 actors)
    const mainCast = data.credits?.cast?.slice(0, 6).map(actor => actor.name).join(', ') || 'N/A';
    
    // Extract production company
    const production = data.production_companies?.[0]?.name || 'N/A';
    
    // Build movie object matching your config format
    const movie = {
      id: data.id,
      title: data.title,
      description: data.overview || '',
      thumbnail: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : '',
      poster: posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : '',
      quality: "4K",
      duration: data.runtime ? `${Math.floor(data.runtime / 60)}h ${(data.runtime % 60)}m` : "N/A",
      rating: data.vote_average ? data.vote_average.toFixed(1) : "N/A",
      genre: data.genres?.map(g => g.name).join(', ') || "N/A",
      releaseDate: data.release_date ? new Date(data.release_date).getFullYear().toString() : "N/A",
      director: director,
      cast: mainCast,
      production: production,
      vidLink: "vids/Universal.mp4" // Default placeholder
    };
    
    console.log(`   ✓ ${movie.title} (${movie.releaseDate}) - Rating: ${movie.rating}`);
    return movie;
    
  } catch (error) {
    console.error(`   ❌ Error fetching movie ${movieId}:`, error.message);
    return null;
  }
}

// Fetch TV series from TMDB
async function fetchTVSeries(tvId) {
  try {
    console.log(`📺 Fetching TV series ID: ${tvId}`);
    
    const response = await fetch(`${baseUrl}/tv/${tvId}?api_key=${apiKey}&append_to_response=images,credits`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract backdrop and poster paths
    const backdropPath = data.backdrop_path || (data.images?.backdrops?.[0]?.file_path);
    const posterPath = data.poster_path || (data.images?.posters?.[0]?.file_path);
    
    // Extract creator (TV shows usually have creators, not directors)
    const creator = data.created_by?.[0]?.name || 
                   data.credits?.crew?.find(person => person.job === 'Creator')?.name || 
                   'N/A';
    
    // Extract main cast (first 6 actors)
    const mainCast = data.credits?.cast?.slice(0, 6).map(actor => actor.name).join(', ') || 'N/A';
    
    // Extract production company
    const production = data.production_companies?.[0]?.name || 'N/A';
    
    // Build TV series object matching your config format
    const tvSeries = {
      id: data.id,
      title: data.name,
      description: data.overview || '',
      thumbnail: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : '',
      poster: posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : '',
      quality: "HD",
      duration: "N/A",
      rating: data.vote_average ? data.vote_average.toFixed(1) : "N/A",
      genre: data.genres?.map(g => g.name).join(', ') || "N/A",
      releaseDate: data.first_air_date ? new Date(data.first_air_date).getFullYear().toString() : "N/A",
      director: creator,
      cast: mainCast,
      production: production,
      season: "season 1", // Default season
      seasonEpisodesVids: ["vidLink"] // Default placeholder
    };
    
    console.log(`   ✓ ${tvSeries.title} (${tvSeries.releaseDate}) - Rating: ${tvSeries.rating}`);
    return tvSeries;
    
  } catch (error) {
    console.error(`   ❌ Error fetching TV series ${tvId}:`, error.message);
    return null;
  }
}

// Add content to config
async function addContentToConfig(config, moviesToAdd, tvToAdd) {
  let addedMovies = 0;
  let addedTV = 0;
  let skippedMovies = 0;
  let skippedTV = 0;

  // Initialize arrays if they don't exist
  if (!config.Movies) config.Movies = [];
  if (!config.Series) config.Series = [];

  // Add movies
  if (moviesToAdd.length > 0) {
    console.log('\n🎬 Adding Movies:');
    for (const movieId of moviesToAdd) {
      // Check if already exists
      const exists = config.Movies.some(m => m.id === movieId);
      if (exists) {
        console.log(`   ⏭️  Movie ID ${movieId} already exists, skipping...`);
        skippedMovies++;
        continue;
      }

      const movie = await fetchMovie(movieId);
      if (movie) {
        config.Movies.push(movie);
        addedMovies++;
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Add TV series
  if (tvToAdd.length > 0) {
    console.log('\n📺 Adding TV Series:');
    for (const tvId of tvToAdd) {
      // Check if already exists
      const exists = config.Series.some(s => s.id === tvId);
      if (exists) {
        console.log(`   ⏭️  TV series ID ${tvId} already exists, skipping...`);
        skippedTV++;
        continue;
      }

      const tvSeries = await fetchTVSeries(tvId);
      if (tvSeries) {
        config.Series.push(tvSeries);
        addedTV++;
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { addedMovies, addedTV, skippedMovies, skippedTV };
}

// Main function
async function main() {
  const args = parseArgs();

  if (args.movies.length === 0 && args.tv.length === 0) {
    console.log('📖 Usage:');
    console.log('   node add-content.js --movie <ID>');
    console.log('   node add-content.js --tv <ID>');
    console.log('   node add-content.js --movie <ID1>,<ID2> --tv <ID3>');
    console.log('');
    console.log('📝 Examples:');
    console.log('   node add-content.js --movie 575265');
    console.log('   node add-content.js --tv 248852');
    console.log('   node add-content.js --movie 575265,617126 --tv 248852');
    process.exit(0);
  }

  console.log('🚀 Starting content addition...\n');

  // Load existing config
  const config = loadConfig();
  console.log(`📂 Loaded config.json (${config.Movies?.length || 0} movies, ${config.Series?.length || 0} series)\n`);

  // Add content
  const results = await addContentToConfig(config, args.movies, args.tv);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✅ Movies added: ${results.addedMovies}`);
  console.log(`✅ TV series added: ${results.addedTV}`);
  if (results.skippedMovies > 0) {
    console.log(`⏭️  Movies skipped (already exist): ${results.skippedMovies}`);
  }
  if (results.skippedTV > 0) {
    console.log(`⏭️  TV series skipped (already exist): ${results.skippedTV}`);
  }
  console.log('='.repeat(50));

  // Save if anything was added
  if (results.addedMovies > 0 || results.addedTV > 0) {
    console.log('\n💾 Saving config.json...');
    saveConfig(config);
    console.log(`\n📊 Final count: ${config.Movies.length} movies, ${config.Series.length} series`);
  } else {
    console.log('\n⚠️  No new content to add.');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
