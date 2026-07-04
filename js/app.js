// State Management
let playlist = [];

// Detect if running from local file and define API base fallback
const API_BASE = (window.location.protocol === 'file:' || window.location.hostname === '')
  ? 'http://localhost:3000'
  : '';
let coverImages = [];
let currentTrackIndex = 0;
let isPlaying = false;
let rotationTimer = null;
const IMAGE_ROTATION_INTERVAL = 12000; // 12 seconds

// DOM Elements
const playerCard = document.getElementById('playerCard');
const trackArtist = document.getElementById('trackArtist');
const trackTitle = document.getElementById('trackTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const coverImg1 = document.getElementById('coverImg1');
const coverImg2 = document.getElementById('coverImg2');
const timeDisplay = document.getElementById('timeDisplay');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressHandle = document.getElementById('progressHandle');
const canvas = document.getElementById('visualizerCanvas');
const canvasCtx = canvas.getContext('2d');
const syncPlaylistBtn = document.getElementById('syncPlaylistBtn');

// Volume Elements & State
const volumeControlGroup = document.getElementById('volumeControlGroup');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');
const muteIcon = document.getElementById('muteIcon');
let currentVolume = 0.8;
let isMuted = false;

// Audio Element
const audio = new Audio();
audio.crossOrigin = 'anonymous'; // Critical for Web Audio API visualizer CORS
audio.volume = currentVolume;

// Web Audio API Variables
let audioCtx = null;
let analyser = null;
let source = null;
let visualizerAnimationFrame = null;

// Initial Setup & Resize
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  // Set internal resolution based on CSS sizing
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Fetch Playlist & Init
async function initPlayer() {
  try {
    // Try loading static playlist.json (perfect for static production hosting)
    const response = await fetch('playlist.json?v=' + Date.now());
    const data = await response.json();
    
    playlist = data.tracks || [];
    coverImages = data.images || [];
    
    if (playlist.length > 0) {
      loadTrack(0);
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.log('Static playlist.json not found, falling back to local developer API...');
    try {
      const response = await fetch(`${API_BASE}/api/playlist`);
      const data = await response.json();
      
      playlist = data.tracks || [];
      coverImages = data.images || [];
      
      if (playlist.length > 0) {
        loadTrack(0);
      } else {
        showEmptyState();
      }
    } catch (apiError) {
      console.error('Failed to load playlist:', apiError);
      showEmptyState('Error loading playlist. Ensure playlist.json is generated or server is running.');
    }
  }
  
  // Initialize Media Session handlers & system controls
  initMediaSessionHandlers();
  
  // Start the visualizer loop immediately on load to draw standby waves/dots
  drawVisualizer();
}

function showEmptyState(msg = 'No tracks found in the "music" folder. Drop some MP3s there!') {
  trackArtist.textContent = 'MUSIC LAB';
  trackTitle.textContent = 'Ready to play';
  timeDisplay.textContent = '00:00 / 00:00';
  console.log(msg);
}

// Load a track from the playlist
function loadTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  currentTrackIndex = index;
  const track = playlist[index];
  
  // Set sources
  const fileUrl = track.file.startsWith('/') ? track.file.substring(1) : track.file;
  const prefix = API_BASE ? `${API_BASE}/` : '';
  audio.src = track.file.startsWith('http') ? track.file : `${prefix}${fileUrl}`;
  // Dynamic parsing of artist and title from filename if not explicitly provided in metadata
  let artist = track.artist || '';
  let title = track.title || '';
  
  // Extract filename without path and extension
  const filenameWithExt = track.filename || fileUrl.split('/').pop();
  const cleanName = decodeURIComponent(filenameWithExt).replace(/\.[^/.]+$/, ""); // Remove extension (.mp3/.mp4)
  
  if (!artist || artist.toLowerCase() === 'unknown artist') {
    // Check for "Artist - Title" or "Artist — Title" patterns
    if (cleanName.includes(' - ')) {
      const parts = cleanName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    } else if (cleanName.includes(' — ')) {
      const parts = cleanName.split(' — ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' — ').trim();
    } else {
      artist = 'Unknown Artist';
      title = cleanName;
    }
  }
  
  if (!title) {
    title = cleanName;
  }
  
  trackArtist.textContent = artist;
  trackTitle.textContent = title;
  
  // Calculate hover scroll parameters for long title
  updateScrollParams();
  
  // Set initial timeline and time indicator
  progressBar.style.width = '0%';
  progressHandle.style.left = '0%';
  timeDisplay.textContent = `00:00 / ${formatTime(track.duration || 0)}`;
  
  // Choose cover art
  updateCoverImage(true); // Forced instant/first cover image

  // Sync Media Session Metadata
  updateMediaSession(artist, title);

  // If already playing, trigger auto-play
  if (isPlaying) {
    playAudio();
  }
}

// Play/Pause controls
function togglePlay() {
  if (playlist.length === 0) return;
  
  // Initialize AudioContext on first user interaction
  initAudio();
  
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function playAudio() {
  audio.play()
    .then(() => {
      isPlaying = true;
      playerCard.classList.add('playing');
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
      
      // Start cover image rotation
      startCoverRotation();
      
      // Resume AudioContext if suspended
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Sync Media Session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    })
    .catch(error => {
      console.error('Autoplay/playback blocked or failed:', error);
      // Revert UI to paused state safely on autoplay blocking
      pauseAudio();
    });
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  playerCard.classList.remove('playing');
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  
  // Stop cover image rotation
  stopCoverRotation();

  // Sync Media Session state
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
}

function nextTrack() {
  if (playlist.length === 0) return;
  let nextIndex = currentTrackIndex + 1;
  if (nextIndex >= playlist.length) {
    nextIndex = 0; // Wrap around
  }
  loadTrack(nextIndex);
}

function prevTrack() {
  if (playlist.length === 0) return;
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) {
    prevIndex = playlist.length - 1; // Wrap around
  }
  loadTrack(prevIndex);
}

// Web Audio API Setup
function initAudio() {
  if (audioCtx) return; // Already initialized
  
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256; // Defines number of bars (128 bins)
  
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

// Dynamic Canvas Visualizer Rendering
function drawVisualizer() {
  visualizerAnimationFrame = requestAnimationFrame(drawVisualizer);
  
  const width = canvas.width;
  const height = canvas.height;
  
  canvasCtx.clearRect(0, 0, width, height);
  
  const bufferLength = analyser ? analyser.frequencyBinCount : 128;
  const dataArray = new Uint8Array(bufferLength);
  
  if (isPlaying && analyser) {
    analyser.getByteFrequencyData(dataArray);
  } else {
    // If paused, decay frequency levels back to zero smoothly
    for (let i = 0; i < bufferLength; i++) {
      dataArray[i] = 0;
    }
  }

  // Define drawing properties
  const numBars = 90; // 5 sections of 18 bars each
  const sectionWidth = width / numBars;
  // Exactly 1px width for ultra-thin visualizer bars
  const drawWidth = 1 * window.devicePixelRatio;
  const centerY = height * 0.65; // Baseline at 65% height
  
  // Height profile defining the skyscraper city skyline:
  // Cottages (5% - 30%), Mid-rise (60% - 70%), Skyscrapers (95% - 100%)
  const heightProfile = [
    0.05, 0.15, 0.65, 0.20, 0.70, 0.10, 0.60, 0.30, 1.00, 
    0.95, 0.25, 0.65, 0.15, 0.70, 0.30, 0.60, 0.10, 0.05
  ];
  
  // Render bars
  for (let i = 0; i < numBars; i++) {
    const sectionIndex = Math.floor(i / 18); // 5 sections (0, 1, 2, 3, 4)
    const localIndex = i % 18; // Index within section (0 to 17)
    
    // Multiplier from the skyscraper profile
    const multiplier = heightProfile[localIndex];
    
    // Choose frequency bin based on the section
    let bin = 0;
    let factor = 1.0;
    
    if (sectionIndex === 0) {
      // 1. Bass / Kick (bins 1-8)
      bin = 1 + (localIndex % 8);
      factor = 1.25;
    } else if (sectionIndex === 1) {
      // 2. Low-mids (bins 8-18)
      bin = 8 + (localIndex % 10);
      factor = 1.45;
    } else if (sectionIndex === 2) {
      // 3. Central Mids / Vocals (bins 18-32) - Tallest section
      bin = 18 + (localIndex % 14);
      factor = 1.9;
    } else if (sectionIndex === 3) {
      // 4. Upper-mids / Instruments (bins 32-48)
      bin = 32 + (localIndex % 16);
      factor = 2.1;
    } else {
      // 5. Treble / Highs (bins 48-80)
      bin = 48 + (localIndex % 32);
      factor = 2.9;
    }
    
    let val = dataArray[bin] * factor;
    // Jitter helper using adjacent bin
    val = val * 0.8 + dataArray[(bin + 1) % bufferLength] * factor * 0.2;
    if (val > 255) val = 255;
    
    let barHeight;
    if (isPlaying) {
      // Contrast scaling to pull quiet values to zero
      const norm = val / 255;
      const contrastVal = Math.pow(norm, 2.0);
      
      // Calculate height using the skyline multiplier (starts/ends low, peaks in middle with skyscraper contrasts)
      barHeight = contrastVal * (height * 0.58) * multiplier;
      if (barHeight < 0.5) barHeight = 0;
    } else {
      // Standby state: a breathing city skyline
      const angle = (Date.now() * 0.0035) + (i * 0.15);
      barHeight = (Math.sin(angle) + 1) * 3 * multiplier;
      if (barHeight < 0.5) barHeight = 0;
    }
    
    const x = sectionWidth * i + (sectionWidth - drawWidth) / 2;
    
    // 1. Draw top bar (extending UPWARDS) - Solid White
    if (barHeight > 0) {
      canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, centerY - barHeight, drawWidth, barHeight, drawWidth / 3);
      canvasCtx.fill();
      
      // 2. Draw reflected bottom bar (extending DOWNWARDS) - Semi-transparent White
      const bottomHeight = barHeight * 0.25;
      canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, centerY, drawWidth, bottomHeight, drawWidth / 3);
      canvasCtx.fill();
    }
    
    // 3. Draw baseline dot (always visible as a guide)
    canvasCtx.beginPath();
    canvasCtx.arc(x + drawWidth / 2, centerY, 0.6 * window.devicePixelRatio, 0, Math.PI * 2);
    canvasCtx.fillStyle = barHeight > 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.25)';
    canvasCtx.fill();
  }
}

// Cover Image Rotation with smooth crossfade
function updateCoverImage(force = false) {
  let imageSrc = 'https://picsum.photos/seed/radio-default/300/300';
  
  if (coverImages.length > 0) {
    // Pick a random image from user folder
    const randomIndex = Math.floor(Math.random() * coverImages.length);
    const selectedImage = coverImages[randomIndex];
    const imageUrl = selectedImage.startsWith('/') ? selectedImage.substring(1) : selectedImage;
    const prefix = API_BASE ? `${API_BASE}/` : '';
    // Append timestamp cache-buster to prevent browser caching of old images
    imageSrc = selectedImage.startsWith('http') 
      ? selectedImage 
      : `${prefix}${imageUrl}?t=${Date.now()}`;
  } else {
    // Generate a beautiful generic cover if no images are uploaded
    const seed = Date.now() + Math.random().toString(36).substring(2, 5);
    imageSrc = `https://picsum.photos/seed/${seed}/300/300`;
  }
  
  const activeImg = coverImg1.classList.contains('active') ? coverImg1 : coverImg2;
  const inactiveImg = activeImg === coverImg1 ? coverImg2 : coverImg1;
  
  if (force) {
    activeImg.src = imageSrc;
    return;
  }
  
  // Set new source on inactive element
  inactiveImg.src = imageSrc;
  
  // Wait for image to load to ensure seamless transition
  inactiveImg.onload = () => {
    activeImg.classList.remove('active');
    inactiveImg.classList.add('active');
    updateMediaSession(trackArtist.textContent, trackTitle.textContent, imageSrc);
  };
}

function startCoverRotation() {
  stopCoverRotation();
  rotationTimer = setInterval(() => {
    updateCoverImage();
  }, IMAGE_ROTATION_INTERVAL);
}

function stopCoverRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
}

// Time tracking and seek bar updates
audio.addEventListener('timeupdate', () => {
  if (audio.duration) {
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    progressHandle.style.left = `${progressPercent}%`;
    
    timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }
});

// Auto-advance sequentially when track ends
audio.addEventListener('ended', () => {
  nextTrack();
});

// Formatting duration utility
function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Interactive scrubbing
function setProgress(e) {
  if (playlist.length === 0 || !audio.duration) return;
  const rect = progressContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const percentage = Math.max(0, Math.min(1, clickX / width));
  
  audio.currentTime = percentage * audio.duration;
  progressBar.style.width = `${percentage * 100}%`;
  progressHandle.style.left = `${percentage * 100}%`;
}

// Scrubbing drag behavior
let isDragging = false;

progressContainer.addEventListener('mousedown', (e) => {
  isDragging = true;
  setProgress(e);
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    setProgress(e);
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Event Listeners
playPauseBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowRight') {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
  } else if (e.code === 'ArrowLeft') {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  }
});

// Volume Control Logic
function handleVolumeInput(e) {
  currentVolume = parseFloat(e.target.value);
  if (currentVolume > 0) {
    isMuted = false;
    audio.muted = false;
    volumeIcon.classList.remove('hidden');
    muteIcon.classList.add('hidden');
  } else {
    isMuted = true;
    audio.muted = true;
    volumeIcon.classList.add('hidden');
    muteIcon.classList.remove('hidden');
  }
  audio.volume = currentVolume;
}

function toggleMute() {
  isMuted = !isMuted;
  audio.muted = isMuted;
  if (isMuted) {
    volumeIcon.classList.add('hidden');
    muteIcon.classList.remove('hidden');
    volumeSlider.value = 0;
  } else {
    volumeIcon.classList.remove('hidden');
    muteIcon.classList.add('hidden');
    volumeSlider.value = currentVolume;
  }
}

// Media Session API helper
function updateMediaSession(artist, title, coverUrl = '') {
  if ('mediaSession' in navigator) {
    let src = coverUrl;
    if (!src) {
      const activeImg = coverImg1.classList.contains('active') ? coverImg1 : coverImg2;
      src = activeImg.src || '';
    }
    src = src.split('?')[0]; // Remove cache bust parameter for system notification

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: 'Radio Super by Tom',
      artwork: [
        { src: src, sizes: '300x300', type: 'image/png' },
        { src: src, sizes: '512x512', type: 'image/png' }
      ]
    });
  }
}

function initMediaSessionHandlers() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', playAudio);
    navigator.mediaSession.setActionHandler('pause', pauseAudio);
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  }
}

// Volume Event Listeners
volumeSlider.addEventListener('input', handleVolumeInput);
volumeBtn.addEventListener('click', (e) => {
  // Mobile check to expand/collapse slider instead of immediate mute
  if (window.innerWidth <= 768) {
    if (!volumeControlGroup.classList.contains('expanded')) {
      e.stopPropagation();
      volumeControlGroup.classList.add('expanded');
      return;
    }
  }
  toggleMute();
});

// Hide volume slider on mobile when tapping outside
document.addEventListener('click', (e) => {
  if (volumeControlGroup && !volumeControlGroup.contains(e.target)) {
    volumeControlGroup.classList.remove('expanded');
  }
});

// Sync/Scan Playlist via AJAX
async function syncPlaylist() {
  if (syncPlaylistBtn.classList.contains('spinning')) return;
  
  syncPlaylistBtn.classList.add('spinning');
  syncPlaylistBtn.title = 'Сканирование...';
  
  try {
    const prefix = API_BASE ? `${API_BASE}/` : '';
    // Call the PHP generator script in the background
    const response = await fetch(`${prefix}generate_playlist.php?t=${Date.now()}`);
    const text = await response.text();
    
    // Check if the HTML response indicates success or error
    if (response.ok && !text.includes('Ошибка обновления!') && !text.includes('заблокирован для записи')) {
      // Re-initialize player to reload playlist.json dynamically
      await initPlayer();
    } else {
      // Try to extract the error message from the response if any
      const match = text.match(/<div class="error-pill">([\s\S]*?)<\/div>/);
      const errMsg = match ? match[1].replace(/<[^>]*>/g, '').trim() : 'Не удалось обновить плейлист. Проверьте права на запись.';
      alert('Ошибка: ' + errMsg);
    }
  } catch (error) {
    console.error('Failed to sync playlist:', error);
    alert('Не удалось связаться с сервером обновлений.');
  } finally {
    syncPlaylistBtn.classList.remove('spinning');
    syncPlaylistBtn.title = 'Обновить плейлист (сканировать файлы)';
  }
}

// Sync Event Listener
if (syncPlaylistBtn) {
  syncPlaylistBtn.addEventListener('click', syncPlaylist);
}

// Calculate scroll distance for long titles
function updateScrollParams() {
  const panelBody = document.querySelector('.panel-body');
  if (!panelBody || !trackTitle) return;
  
  // Reset custom properties first
  trackTitle.style.removeProperty('--scroll-dist');
  trackTitle.style.removeProperty('--scroll-duration');
  panelBody.classList.remove('can-scroll');
  
  // Temporarily force max-width and overflow to calculate real scroll width
  const prevMaxWidth = trackTitle.style.maxWidth;
  const prevOverflow = trackTitle.style.overflow;
  trackTitle.style.maxWidth = 'none';
  trackTitle.style.overflow = 'visible';
  
  const scrollWidth = trackTitle.scrollWidth;
  const clientWidth = panelBody.clientWidth;
  
  // Restore original styles
  trackTitle.style.maxWidth = prevMaxWidth;
  trackTitle.style.overflow = prevOverflow;
  
  const scrollDistance = scrollWidth - clientWidth;
  
  if (scrollDistance > 0) {
    panelBody.classList.add('can-scroll');
    // Add 15px extra padding at the end of the scroll for aesthetic spacing
    trackTitle.style.setProperty('--scroll-dist', `-${scrollDistance + 15}px`);
    // Speed: 35 pixels per second (constant scrolling speed)
    const duration = (scrollDistance + 15) / 35;
    trackTitle.style.setProperty('--scroll-duration', `${duration}s`);
  }
}

// Recalculate on window resize
window.addEventListener('resize', updateScrollParams);

// Initialize player on page load
window.addEventListener('DOMContentLoaded', initPlayer);
