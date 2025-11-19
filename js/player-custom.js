// Modern Video Player Implementation
class VideoPlayer {
    constructor(container) {
        this.container = container;
        this.video = container.querySelector('video');
        this.controls = container.querySelector('.custom-controls');
        this.progressBar = container.querySelector('.progress-bar');
        this.progressFilled = container.querySelector('.progress-filled');
        this.progressHandle = container.querySelector('.progress-handle');
        this.playPauseBtn = container.querySelector('.play-pause-btn');
        this.playIcon = container.querySelector('.play-icon');
        this.pauseIcon = container.querySelector('.pause-icon');
        this.volumeBtn = container.querySelector('.volume-btn');
        this.volumeRange = container.querySelector('.volume-range');
        this.fullscreenBtn = container.querySelector('.fullscreen-btn');
        this.currentTime = container.querySelector('.current-time');
        this.duration = container.querySelector('.duration');
        this.loadingOverlay = container.querySelector('.loading-overlay');
        
        this.dragging = false;
        this.wasPlaying = false;
        this.lastCPABuildTime = 0; // Track last CPABuildLock call
        
        this.initializePlayer();
        this.setupEventListeners();
    }
    
    initializePlayer() {
        // Initialize volume
        this.video.volume = localStorage.getItem('playerVolume') || 1;
        this.volumeRange.value = this.video.volume;
        
        // Initialize HLS if needed
        if (this.video.src.includes('.m3u8') && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            hls.loadSource(this.video.src);
            hls.attachMedia(this.video);
            this.hls = hls;
        }
    }
    
    setupEventListeners() {
        // Play/Pause
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.video.addEventListener('click', () => this.togglePlay());
        
        // Progress bar
        this.progressBar.addEventListener('mousedown', (e) => this.startDragging(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDragging());
        this.progressBar.addEventListener('click', (e) => this.skipTo(e));
        
        // Volume
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeRange.addEventListener('input', (e) => this.updateVolume(e));
        
        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Video events
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('loadedmetadata', () => this.updateDuration());
        this.video.addEventListener('play', () => this.updatePlayButton(true));
        this.video.addEventListener('pause', () => this.updatePlayButton(false));
        this.video.addEventListener('waiting', () => this.showLoading(true));
        this.video.addEventListener('playing', () => this.showLoading(false));
        this.video.addEventListener('ended', () => this.onVideoEnded());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }
    
    updatePlayButton(isPlaying) {
        this.playIcon.style.display = isPlaying ? 'none' : 'block';
        this.pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    
    updateProgress() {
        if (!this.dragging) {
            const percent = (this.video.currentTime / this.video.duration) * 100;
            this.progressFilled.style.width = `${percent}%`;
            this.progressHandle.style.left = `${percent}%`;
            this.currentTime.textContent = this.formatTime(this.video.currentTime);
        }
    }
    
    updateDuration() {
        this.duration.textContent = this.formatTime(this.video.duration);
    }
    
    startDragging(e) {
        this.dragging = true;
        this.wasPlaying = !this.video.paused;
        if (this.wasPlaying) this.video.pause();
        this.skipTo(e);
    }
    
    drag(e) {
        if (this.dragging) {
            this.skipTo(e);
        }
    }
    
    stopDragging() {
        if (this.dragging) {
            this.dragging = false;
            if (this.wasPlaying) this.video.play();
        }
    }
    
    skipTo(e) {
        // Call CPABuildLock when timeline is clicked (with 3-second delay)
        const currentTime = Date.now();
        if (typeof CPABuildLock === 'function' && (currentTime - this.lastCPABuildTime) > 3000) {
            CPABuildLock();
            this.lastCPABuildTime = currentTime;
        }
        
        const rect = this.progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.video.currentTime = pos * this.video.duration;
        
        // Exit fullscreen when timeline is clicked to show locker
        this.exitFullscreenIfActive();
    }
    
    exitFullscreenIfActive() {
        // Check if we're in fullscreen mode
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement);
        
        if (isFullscreen) {
            console.log('Exiting fullscreen...');
            // Exit fullscreen with cross-browser support
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.log('Exit fullscreen error:', err));
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
    
    toggleMute() {
        this.video.muted = !this.video.muted;
        this.volumeBtn.querySelector('svg').style.opacity = this.video.muted ? 0.5 : 1;
    }
    
    updateVolume(e) {
        const volume = e.target.value;
        this.video.volume = volume;
        localStorage.setItem('playerVolume', volume);
        this.volumeBtn.querySelector('svg').style.opacity = volume === 0 ? 0.5 : 1;
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.toggle('show', show);
        }
    }
    
    onVideoEnded() {
        this.updatePlayButton(false);
        this.video.currentTime = 0;
    }
    
    handleKeyboard(e) {
        if (document.activeElement.tagName === 'INPUT') return;
        
        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'arrowleft':
                e.preventDefault();
                this.video.currentTime -= 5;
                break;
            case 'arrowright':
                e.preventDefault();
                this.video.currentTime += 5;
                break;
            case 'arrowup':
                e.preventDefault();
                this.video.volume = Math.min(1, this.video.volume + 0.1);
                this.volumeRange.value = this.video.volume;
                break;
            case 'arrowdown':
                e.preventDefault();
                this.video.volume = Math.max(0, this.video.volume - 0.1);
                this.volumeRange.value = this.video.volume;
                break;
        }
    }
}

// Initialize the player when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const playerContainer = document.querySelector('.video-container');
    if (playerContainer) {
        const player = new VideoPlayer(playerContainer);
    }
});
