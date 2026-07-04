<?php
$css_ver = file_exists(__DIR__ . '/css/style.css') ? filemtime(__DIR__ . '/css/style.css') : time();
$js_ver = file_exists(__DIR__ . '/js/app.js') ? filemtime(__DIR__ . '/js/app.js') : time();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Super Radio Player</title>
  <meta name="description" content="A beautiful premium radio music player with reactive frequency visualizer and dynamic background animations.">
  <!-- Modern Premium Typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css?v=<?php echo $css_ver; ?>">
</head>
<body>
  <!-- Animated Ambient Background - "Тихий эфир" -->
  <div class="quiet-bg">
    <div class="tone slate"></div>
    <div class="tone taupe"></div>
    <div class="tone violet"></div>

    <div class="breath"></div>
    <div class="sheen"></div>
    <div class="grain"></div>
    <div class="vignette"></div>
  </div>

  <!-- Page Header for SEO -->
  <header class="sr-only">
    <h1>Radio Super - Premium Ambient Music Player</h1>
  </header>

  <!-- Main Player Container -->
  <main class="player-wrapper">
    
    <!-- Modern Editorial Header Title -->
    <div class="player-header-title">
      <h1 class="player-main-title">Radio <span class="player-title-accent">Super</span> <span class="player-author">by Tom</span></h1>
    </div>

    <div class="player-card" id="playerCard">
      
      <!-- Left: Rotating Cover Art Panel -->
      <div class="cover-panel" id="coverPanel">
        <img id="coverImg1" class="cover-image active" src="images/cover1.png" alt="Music Cover Art 1">
        <img id="coverImg2" class="cover-image" src="images/cover2.png" alt="Music Cover Art 2">
        
        <!-- Subtle playback indicator overlay on cover -->
        <div class="playback-indicator" id="playbackIndicator">
          <div class="pulse-ring"></div>
          <div class="pulse-dot"></div>
        </div>
      </div>

      <!-- Right: Control and Info Panel -->
      <div class="control-panel">
        
        <!-- Top Row: Artist Meta & Play/Pause/Navigation -->
        <div class="panel-header">
          <span class="track-artist" id="trackArtist">VonnBoyd</span>
          <div class="branding-control-group">
            
            <!-- Previous Track Button -->
            <button id="prevBtn" class="control-circle-btn" title="Previous Track" aria-label="Previous Track">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="15 8 10 12 15 16 15 8" fill="currentColor"></polygon>
                <line x1="9" y1="8" x2="9" y2="16" stroke-linecap="round"></line>
              </svg>
            </button>
            
            <!-- Play/Pause Button -->
            <button id="playPauseBtn" class="control-circle-btn play-pause" title="Play / Pause" aria-label="Play or Pause Track">
              <!-- Play Icon (Circle with Triangle) -->
              <svg id="playIcon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
              </svg>
              <!-- Pause Icon (Circle with two bars, hidden by default) -->
              <svg id="pauseIcon" class="hidden" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="10" y1="15" x2="10" y2="9" stroke-linecap="round"></line>
                <line x1="14" y1="15" x2="14" y2="9" stroke-linecap="round"></line>
              </svg>
            </button>

            <!-- Next Track Button -->
            <button id="nextBtn" class="control-circle-btn" title="Next Track" aria-label="Next Track">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="9 8 14 12 9 16 9 8" fill="currentColor"></polygon>
                <line x1="15" y1="8" x2="15" y2="16" stroke-linecap="round"></line>
              </svg>
            </button>

            <!-- Volume Control Group -->
            <div class="volume-control-group" id="volumeControlGroup">
              <button id="volumeBtn" class="control-circle-btn" title="Mute / Unmute" aria-label="Mute / Unmute">
                <!-- Volume High SVG Icon (default) -->
                <svg id="volumeIcon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"></path>
                </svg>
                <!-- Mute SVG Icon (hidden) -->
                <svg id="muteIcon" class="hidden" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15" stroke-linecap="round"></line>
                  <line x1="17" y1="9" x2="23" y2="15" stroke-linecap="round"></line>
                </svg>
              </button>
              <div class="volume-slider-wrapper">
                <input type="range" id="volumeSlider" min="0" max="1" step="0.05" value="0.8" aria-label="Volume">
              </div>
            </div>
            
          </div>
        </div>

        <!-- Hidden controls to prevent JS reference errors -->
        <div class="hidden-controls" style="display: none;">
          <div id="progressHandle"></div>
        </div>

        <!-- Middle Row: Track Title -->
        <div class="panel-body">
          <h2 class="track-title" id="trackTitle">Overcast</h2>
        </div>

        <!-- Lower Row: Visualizer and Time Display side-by-side -->
        <div class="visualizer-row">
          <div class="visualizer-container">
            <canvas id="visualizerCanvas"></canvas>
          </div>
          <span class="time-display" id="timeDisplay">00:00 / 00:00</span>
        </div>

        <!-- Bottom Row: Progress docked at the very bottom edge of control-panel -->
        <div class="progress-container" id="progressContainer">
          <div class="progress-bar" id="progressBar"></div>
        </div>

      </div>

      </div>
    </div>
    
    <!-- Playlist side drawers or controls can go here in the future -->
  </main>

  <footer class="page-footer">
    <p>
      Radio Super by Tom
      <button id="syncPlaylistBtn" class="sync-btn" title="Обновить плейлист (сканировать файлы)">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
    </p>
  </footer>

  <script src="js/app.js?v=<?php echo $js_ver; ?>"></script>
</body>
</html>
