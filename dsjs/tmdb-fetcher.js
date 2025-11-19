// Enhanced TMDB Image Fetcher with File Saving
// Run with: node tmdb-fetcher-enhanced.js

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
// Uncomment next line if using Node.js < 18:
// import fetch from 'node-fetch';

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

// Movie IDs from your list
const movieIds = [
  575265,  // Mission: Impossible - The Final Reckoning
  1072790, // F1: The Movie  
  1184918, // Sinners
  1066262, // Superman
  603692,  // Ballerina
  1034062, // 28 Years Later
  83533,   // Avatar: Fire and Ash
  1117188, // Mickey 17
  1022789, // The Bad Guys 2
  1073512  // Zootopia 2
];

async function fetchMovieWithImages(movieId) {
  try {
    console.log(`🎬 Fetching movie ID: ${movieId}`);
    
    const response = await fetch(`${baseUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=images,credits`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract backdrop and poster paths
    const backdropPath = data.backdrop_path || (data.images.backdrops && data.images.backdrops.length > 0 ? data.images.backdrops[0].file_path : null);
    const posterPath = data.poster_path || (data.images.posters && data.images.posters.length > 0 ? data.images.posters[0].file_path : null);
    
    // Extract director from credits
    const director = data.credits && data.credits.crew 
      ? data.credits.crew.find(person => person.job === 'Director')?.name || 'N/A'
      : 'N/A';
    
    // Extract main cast (first 6 actors)
    const mainCast = data.credits && data.credits.cast 
      ? data.credits.cast.slice(0, 6).map(actor => actor.name).join(', ')
      : 'N/A';
    
    // Extract production company
    const production = data.production_companies && data.production_companies.length > 0 
      ? data.production_companies[0].name 
      : 'N/A';
    
    // Build the complete movie object
    const movie = {
      id: data.id,
      title: data.title,
      description: data.overview,
      thumbnail: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null,
      poster: posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : null,
      quality: "4K",
      duration: data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : "N/A",
      rating: data.vote_average ? data.vote_average.toFixed(1) : "N/A",
      genre: data.genres ? data.genres.map(g => g.name).join(', ') : "N/A",
      releaseDate: data.release_date ? new Date(data.release_date).getFullYear().toString() : "N/A",
      director: director,
      cast: mainCast,
      production: production,
      vidLink: "https://jbdhcbkjbv"
    };
    
    console.log(`✅ ${movie.title} - ${movie.rating}★`);
    console.log(`   🎭 Director: ${movie.director}`);
    console.log(`   🖼️  Poster: ${movie.poster ? 'Available' : 'Missing'}`);
    console.log(`   📷 Backdrop: ${movie.thumbnail ? 'Available' : 'Missing'}`);
    
    return movie;
    
  } catch (error) {
    console.error(`❌ Error fetching movie ${movieId}:`, error.message);
    return null;
  }
}

async function fetchAllMovies() {
  const movies = [];
  
  console.log('🚀 Starting TMDB API fetch...\n');
  
  for (let i = 0; i < movieIds.length; i++) {
    const movieId = movieIds[i];
    const movie = await fetchMovieWithImages(movieId);
    
    if (movie) {
      movies.push(movie);
    }
    
    // Add delay to respect API rate limits
    if (i < movieIds.length - 1) {
      console.log('⏳ Waiting 500ms...\n');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return movies;
}

function saveToFile(data, filename = 'movies_with_images.json') {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filename, jsonString, 'utf8');
    console.log(`💾 Data saved to ${filename}`);
    console.log(`📁 File location: ${path.resolve(filename)}`);
  } catch (error) {
    console.error('❌ Error saving file:', error.message);
  }
}

function displaySummary(movies) {
  console.log('\n📊 FETCH SUMMARY');
  console.log('================');
  console.log(`Total movies fetched: ${movies.length}/10`);
  console.log(`Movies with posters: ${movies.filter(m => m.poster).length}`);
  console.log(`Movies with backdrops: ${movies.filter(m => m.thumbnail).length}`);
  console.log(`Average rating: ${(movies.reduce((sum, m) => sum + parseFloat(m.rating), 0) / movies.length).toFixed(1)}`);
  
  console.log('\n🎬 MOVIE LIST:');
  movies.forEach((movie, index) => {
    console.log(`${index + 1}. ${movie.title} (${movie.releaseDate}) - ${movie.rating}★`);
  });
}

async function main() {
  try {
    const moviesWithImages = await fetchAllMovies();
    
    // Create the final JSON structure
    const finalData = {
      "Movies": moviesWithImages
    };
    
    // Display summary
    displaySummary(moviesWithImages);
    
    // Save to file
    saveToFile(finalData);
    
    // Also save a backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveToFile(finalData, `movies_backup_${timestamp}.json`);
    
    console.log('\n✅ Complete! Your movies with images are ready to use.');
    
    return finalData;
    
  } catch (error) {
    console.error('❌ Main process error:', error);
  }
}

// Run the script
main();