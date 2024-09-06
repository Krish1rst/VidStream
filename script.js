// Initialize global variables
let mediaRecorder;
let recordedChunks = [];
let db;
let dbVersion = 4; // Default DB version
let startTime;
let timerInterval;
let currentVideoElement;
let currentlyPlayingVideo = null;

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
// Access video and canvas elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const timerDisplay = document.getElementById('timer');
const captureScreenshotButton = document.getElementById('capture-screenshot');
const startRecordButton = document.getElementById('start-record');
const pauseRecordButton = document.getElementById('pause-record');
const continueRecordButton = document.getElementById('continue-record');
const stopRecordButton = document.getElementById('stop-record');
const downloadRecordButton = document.getElementById('download-record');
const dbVersionSelect = document.getElementById('db-version');
const recordedVideosDiv = document.getElementById('recorded-videos');
const historyButton = document.getElementById('history-button');
const videoTitleInput = document.getElementById('videoTitle');
const saveTitleButton = document.getElementById('saveTitleButton');
const qualitySelector = document.getElementById('quality');

let currentTitle = 'Untitled Video'; 
const playbackControls = document.getElementById('playback-controls');
const playbackSpeedSelect = document.getElementById('playback-speed');
const playPauseButton = document.getElementById('play-pause-button');
const backwardButton = document.getElementById('backward-button');
const forwardButton = document.getElementById('forward-button');
// Initialize IndexedDB with manual version selection
const initDB = () => {
    const version = parseInt(dbVersionSelect.value) || dbVersion;
    const request = indexedDB.open('videoRecorderDB', version);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('videos')) {
            db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadRecordedVideos();
    };

    request.onerror = (event) => {
        console.error('Database error:', event.target.errorCode);
    };
}

const togglePlayPause = (videoElem) => {
    if (currentlyPlayingVideo && currentlyPlayingVideo !== videoElem) {
        currentlyPlayingVideo.pause(); // Pause the previously playing video
    }
    
    if (videoElem.paused) {
        videoElem.play();
        currentlyPlayingVideo = videoElem; // Update the currently playing video
    } else {
        videoElem.pause();
        currentlyPlayingVideo = null; // Clear the currently playing video if paused
    }
};
// Load recorded videos from IndexedDB
const createVideoHTML = (videoData) => {
    return `
        <div class="container">
            <div class="video-container">
                <div class="videoDiv">
                    <video src="${URL.createObjectURL(videoData.blob)}" controls class="recorded-video"></video>
                    <button class="play-btn" onclick="togglePlayPause(this.previousElementSibling)">Play/Pause</button>
                    <button class="back-btn" onclick="seekBackward(this.previousElementSibling.previousElementSibling)"><< 10s</button>
                    <button class="forward-btn" onclick="seekForward(this.previousElementSibling.previousElementSibling.previousElementSibling)">10s >></button>
                   <input type="range" min="0" max="1" step="0.1" value="1" oninput="setVolume(video, this.value)">
                    
                    <input type="range" min="0.5" max="2" step="0.1" value="1" oninput="setPlaybackSpeed(video, this.value)">
                </div>
                <p class="title">Title: ${videoData.title} (Recorded on: ${videoData.date})</p>
                <div class="quality-control">
                    <label for="qualitySelect-${videoData.id}">Select Quality:</label>
                    <select id="qualitySelect-${videoData.id}">
                        <option value="360p">360p</option>
                        <option value="480p">480p</option>
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                    </select>
                    <button onclick="downloadVideoQuality(${videoData.id})">Download</button>
                </div>
            </div>
            <div class="controlClass">
                <button onclick="editTitle(${videoData.id})">Edit Title</button>
                <button onclick="deleteVideo(${videoData.id})">Delete</button>
            </div>
        </div>
    `;
};

const loadRecordedVideos = () => {
    const transaction = db.transaction('videos', 'readonly');
    const store = transaction.objectStore('videos');
    const request = store.getAll();

    request.onsuccess = (event) => {
        const videos = event.target.result;
        recordedVideosDiv.innerHTML = videos.map(videoData => createVideoHTML(videoData)).join('');
    };
};
const loadFFmpeg = async () => {
  if (!ffmpeg.isLoaded()) {
    try {
      console.log('Attempting to load ffmpeg.wasm...');
      await ffmpeg.load();
      console.log('ffmpeg.wasm loaded successfully');
    } catch (error) {
      console.error('Error loading ffmpeg.wasm:', error);
      const retry = confirm('Failed to load video processing tools. Would you like to retry?');
      if (retry) {
        try {
          console.log('Retrying to load ffmpeg.wasm...');
          await ffmpeg.load();
          console.log('ffmpeg.wasm loaded successfully on retry');
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          alert('Failed to load video processing tools after retry. Please try again later.');
          return false;
        }
      } else {
        alert('Video processing tools were not loaded. Please refresh the page and try again.');
        return false;
      }
    }
  }
  return true;
};

const downloadVideoQuality = async (videoId) => {
    const transaction = db.transaction('videos', 'readonly');
    const store = transaction.objectStore('videos');
    const request = store.get(videoId);

    request.onsuccess = async (event) => {
        const videoData = event.target.result;
        const qualitySelect = document.getElementById(`qualitySelect-${videoId}`);
        const selectedQuality = qualitySelect.value;

        // Ensure FFmpeg is loaded
        const isLoaded = await loadFFmpeg();
        if (!isLoaded) return;

        try {
            const inputBlob = await fetchFile(videoData.blob);
            ffmpeg.FS('writeFile', 'input.webm', inputBlob);

            // Define quality options with FFmpeg filters
            const qualityOptions = {
                '360p': '-vf scale=640:360',
                '480p': '-vf scale=854:480',
                '720p': '-vf scale=1280:720',
                '1080p': '-vf scale=1920:1080'
            };

            // Validate the selected quality
            if (!qualityOptions[selectedQuality]) {
                throw new Error(`Invalid quality selected: ${selectedQuality}`);
            }

            // Construct FFmpeg command
            const command = ['-i', 'input.webm', ...qualityOptions[selectedQuality].split(' '), 'output.mp4'];
            await ffmpeg.run(...command);

            // Read and download the processed video
            const outputData = ffmpeg.FS('readFile', 'output.mp4');
            const outputBlob = new Blob([outputData.buffer], { type: 'video/mp4' });

            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(outputBlob);
            downloadLink.download = `${videoData.title}_${selectedQuality}.mp4`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Clean up FFmpeg file system
            ffmpeg.FS('unlink', 'input.webm');
            ffmpeg.FS('unlink', 'output.mp4');
        } catch (error) {
            console.error('Error during video processing:', error);
            alert('Failed to process and download the video. Please try again.');
        }
    };

    request.onerror = () => {
        console.error('Failed to retrieve video from IndexedDB');
        alert('Failed to retrieve the video. Please try again.');
    };
};

const seekBackward = (videoElem) => {
    videoElem.currentTime -= 10;
};

const seekForward = (videoElem) => {
    videoElem.currentTime += 10;
};

const setVolume = (videoElem, volume) => {
  if (isNaN(volume) || volume < 0 || volume > 1) {
    console.error("Invalid volume value:", volume);
    return;
  }
  if (videoElem) {
    videoElem.volume = volume;
  } else {
    console.error("videoElem is null or undefined");
  }
};

const setPlaybackSpeed = (videoElem, speed) => {
  if (isNaN(speed) || speed < 0.5 || speed > 2) {
    console.error("Invalid playback speed value:", speed);
    return;
  }
  if (videoElem) {
    videoElem.playbackRate = speed;
  } else {
    console.error("videoElem is null or undefined");
  }
};

// Edit video title
const editTitle = (id) => {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
        const transaction = db.transaction('videos', 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.get(id);
        
        request.onsuccess = (event) => {
          console.log(request);
            const videoData = event.target.result;
            videoData.title = newTitle;

            const updateRequest = store.put(videoData);
            updateRequest.onsuccess = () => {
                console.log('Title updated successfully');
                loadRecordedVideos();
            };
            updateRequest.onerror = (event) => {
                console.error('Error updating title:', event.target.errorCode);
            };
        };
    }
};

// Delete video from IndexedDB
const deleteVideo = (id) => {
    const transaction = db.transaction('videos', 'readwrite');
    const store = transaction.objectStore('videos');
    store.delete(id).onsuccess = () => {
        loadRecordedVideos();
    };
};

// Get selected quality from dropdown
function getVideoConstraints() {
    const selectedQuality = qualitySelector.value;

    switch (selectedQuality) {
      case 'low':
        return {
          width: { ideal: 1280 }, // Keep width fixed
            height: { ideal: 720 }, // Keep height fixed
            facingMode: "environment",
            frameRate: { ideal: 15 } // Lower frame rate for low quality
        };
      case 'medium':
        return {
          width: { ideal: 1280 }, // Keep width fixed
            height: { ideal: 720 }, // Keep height fixed
            facingMode: "user",
            frameRate: { ideal: 30 } // Medium frame rate
        };
      case 'high':
        return {
          width: { ideal: 1280 }, // Keep width fixed
            height: { ideal: 720 }, // Keep height fixed
            facingMode: "user",
            frameRate: { ideal: 60 } // Higher frame rate for high quality
        };
        default:
        return {
          width: { ideal: 1280 }, // Keep width fixed
          height: { ideal: 720 }, // Default dimensions
          facingMode: "user",
          frameRate: { ideal: 30 } // Default frame rate
        };}
}

// Start camera using the front camera only
const startCamera = async () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  };
  timerDisplay.textContent = "00:00:00";
    startTime = null;
    let bitrate = 5000000; // Default bitrate for medium quality
 const selectedQuality = qualitySelector.value;

    if (selectedQuality === 'low') {
        bitrate = 1000000; // Lower bitrate for low quality
    } else if (selectedQuality === 'high') {
        bitrate = 8000000; // Higher bitrate for high quality
    }

    const options = { mimeType: 'video/webm; codecs=vp9' , videoBitsPerSecond: bitrate };
    
    const constraints = { video: getVideoConstraints(), audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    video.srcObject = stream;

    // Adjust canvas size to match video resolution
    video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    };

    const canvasContext = canvas.getContext('2d');
    const canvasStream = canvas.captureStream(60); // Capture canvas content at 60 fps

    // Create a new MediaStream with the canvas stream and the original audio track
    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...stream.getAudioTracks()]);

    mediaRecorder = new MediaRecorder(combinedStream, options);
    mediaRecorder.ondataavailable = event => {
      console.log(event.data);
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        recordedChunks = [];
        saveVideo(blob, currentTitle);
        clearInterval(timerInterval);
        timerDisplay.textContent = "00:00:00";
    };

    video.onplay = () => {
        setInterval(() => {
            canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
        }, 100);
    };
};

// Save video to IndexedDB with title
const saveVideo = (blob, title) => {
    const transaction = db.transaction('videos', 'readwrite');
    const store = transaction.objectStore('videos');
    const request = store.add({ blob, title, date: new Date().toLocaleString() });

    request.onsuccess = () => {
        console.log('Video saved successfully');
        loadRecordedVideos();
    };

    request.onerror = (event) => {
        console.error('Error saving video:', event.target.errorCode);
    };
};

// Save title for the next recording
saveTitleButton.addEventListener('click', () => {
    currentTitle = videoTitleInput.value.trim() || 'Untitled Video';
    videoTitleInput.value = ''; // Clear the input field after saving
    alert('Title saved. You can start recording now.');
});

// Start recording with timer
startRecordButton.addEventListener('click', () => {
    mediaRecorder.start();
    console.log('Recording started');
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
});

const updateTimer = () => {
    const elapsedTime = Date.now() - startTime;
    const hours = Math.floor(elapsedTime / 3600000);
    const minutes = Math.floor((elapsedTime % 3600000) / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);

    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Pause recording
pauseRecordButton.addEventListener('click', () => {
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        clearInterval(timerInterval);
        console.log('Recording paused');
    }
});

// Continue recording
continueRecordButton.addEventListener('click', () => {
    if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        startTime = Date.now() - (parseTime(timerDisplay.textContent) * 1000);
        timerInterval = setInterval(updateTimer, 1000);
        console.log('Recording resumed');
    }
});

const parseTime = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
};

// Stop recording
stopRecordButton.addEventListener('click', () => {
    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('Recording stopped');
    }
});

// Download the recorded video
downloadRecordButton.addEventListener('click', () => {
    if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'recorded-video.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        console.error('No recorded video to download');
    }
});

// Capture screenshot from video
captureScreenshotButton.addEventListener('click', () => {
    const canvasContext = canvas.getContext('2d');
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/png');
    
    const downloadLink = document.createElement('a');
    downloadLink.href = imageDataURL;
    downloadLink.download = `screenshot+${Date.now()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});

// Show history button always displays recorded videos
historyButton.addEventListener('click', () => {
    loadRecordedVideos();
});

qualitySelector.addEventListener('change', startCamera

);

// Initialize camera and database on page load
window.onload = () => {
    initDB();
    startCamera();
    
};

