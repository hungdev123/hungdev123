const tabLinks = document.querySelectorAll('.nav-links a');
const tabPanels = document.querySelectorAll('.tab-panel');
const tabContent = document.querySelector('#tab-content');
const blurToggle = document.querySelector('#blur-toggle');
const musicPlayer = document.querySelector('.music-player');
const musicToggle = document.querySelector('#music-toggle');
const siteMusic = document.querySelector('#site-music');
const musicStatus = document.querySelector('#music-status');
const visualizerCanvas = document.querySelector('#audio-visualizer');
const visualizerContext = visualizerCanvas.getContext('2d');
const blurPreferenceKey = 'hunggg-disable-blur';

siteMusic.volume = 0.45;
let musicWasManuallyControlled = false;
let audioContext;
let analyser;
let frequencyData;
let visualizerFrame = 0;

function resizeVisualizer() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    visualizerCanvas.width = Math.round(window.innerWidth * pixelRatio);
    visualizerCanvas.height = Math.round(window.innerHeight * pixelRatio);
    visualizerContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

resizeVisualizer();
window.addEventListener('resize', resizeVisualizer);

function prepareVisualizer() {
    if (analyser) {
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
        return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        const source = audioContext.createMediaElementSource(siteMusic);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch {
        analyser = null;
    }
}

function drawVisualizer() {
    if (!analyser || siteMusic.paused) {
        visualizerContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        visualizerFrame = 0;
        return;
    }

    analyser.getByteFrequencyData(frequencyData);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const barCount = Math.min(88, Math.max(24, Math.floor(width / 16)));
    const gap = 4;
    const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
    const baseY = height * 1.02;
    const maxBarHeight = height * 0.38;
    const gradient = visualizerContext.createLinearGradient(0, baseY - maxBarHeight, 0, baseY);
    gradient.addColorStop(0, 'rgba(111, 205, 255, 0.75)');
    gradient.addColorStop(1, 'rgba(215, 238, 154, 0.9)');
    visualizerContext.clearRect(0, 0, width, height);
    visualizerContext.fillStyle = gradient;

    for (let index = 0; index < barCount; index += 1) {
        const progress = index / (barCount - 1);
        const sampleIndex = Math.min(frequencyData.length - 1, Math.floor(progress ** 1.7 * frequencyData.length));
        const energy = frequencyData[sampleIndex] / 255;
        const barHeight = Math.max(2, energy * maxBarHeight);
        const x = index * (barWidth + gap);
        const y = baseY - barHeight;

        if (visualizerContext.roundRect) {
            visualizerContext.beginPath();
            visualizerContext.roundRect(x, y, barWidth, barHeight, barWidth / 2);
            visualizerContext.fill();
        } else {
            visualizerContext.fillRect(x, y, barWidth, barHeight);
        }
    }

    visualizerFrame = window.requestAnimationFrame(drawVisualizer);
}

function startVisualizer() {
    if (!visualizerFrame && analyser) visualizerFrame = window.requestAnimationFrame(drawVisualizer);
}

function stopVisualizer() {
    if (visualizerFrame) window.cancelAnimationFrame(visualizerFrame);
    visualizerFrame = 0;
    visualizerContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function updateMusicState(isPlaying) {
    musicPlayer.classList.toggle('is-playing', isPlaying);
    musicToggle.textContent = isPlaying ? 'Ⅱ' : '▶';
    musicToggle.setAttribute('aria-label', isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc');
    musicToggle.title = isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc';
    musicStatus.textContent = isPlaying ? 'Đang phát' : 'Đang tạm dừng';
    if (isPlaying) startVisualizer();
    else stopVisualizer();
}

async function startMusic(autoplay = false) {
    try {
        prepareVisualizer();
        await siteMusic.play();
    } catch {
        updateMusicState(false);
        musicStatus.textContent = autoplay ? 'Bấm để bật nhạc' : 'Không phát được tệp nhạc';
    }
}

musicToggle.addEventListener('click', () => {
    musicWasManuallyControlled = true;
    if (siteMusic.paused) startMusic();
    else siteMusic.pause();
});

siteMusic.addEventListener('play', () => updateMusicState(true));
siteMusic.addEventListener('pause', () => updateMusicState(false));
siteMusic.addEventListener('ended', () => updateMusicState(false));
siteMusic.addEventListener('error', () => {
    updateMusicState(false);
    musicStatus.textContent = 'Không tìm thấy âm thanh';
});

musicStatus.textContent = 'Tự phát sau 5 giây';
window.setTimeout(() => {
    if (!musicWasManuallyControlled && siteMusic.paused) startMusic(true);
}, 5000);

function setBlurDisabled(disabled, savePreference = false) {
    document.documentElement.classList.toggle('no-blur', disabled);
    blurToggle.setAttribute('aria-pressed', String(disabled));
    blurToggle.title = disabled ? 'Hiệu ứng làm mờ đang tắt' : 'Tắt hiệu ứng làm mờ';

    if (savePreference) {
        try {
            localStorage.setItem(blurPreferenceKey, String(disabled));
        } catch {
            // The toggle still works for this page view if storage is unavailable.
        }
    }
}

let savedBlurPreference = false;
try {
    savedBlurPreference = localStorage.getItem(blurPreferenceKey) === 'true';
} catch {
    // Use the default blur setting if storage is unavailable.
}
setBlurDisabled(savedBlurPreference);

blurToggle.addEventListener('click', () => {
    const blurDisabled = !document.documentElement.classList.contains('no-blur');
    setBlurDisabled(blurDisabled, true);
});

function showTab(tabId) {
    tabPanels.forEach((panel) => {
        panel.hidden = panel.id !== tabId;
    });
    tabLinks.forEach((link) => {
        const selected = link.hash === `#${tabId}`;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    history.replaceState(null, '', `#${tabId}`);
}

tabLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const tabId = link.hash.slice(1);
        if (!document.getElementById(tabId) || document.getElementById(tabId).hidden === false) return;
        if (document.startViewTransition) {
            document.startViewTransition(() => showTab(tabId));
        } else {
            showTab(tabId);
            tabContent.classList.remove('tab-changing');
            requestAnimationFrame(() => {
                tabContent.classList.add('tab-changing');
                window.setTimeout(() => tabContent.classList.remove('tab-changing'), 500);
            });
        }
    });
});

const initialTab = location.hash.slice(1);
if (document.getElementById(initialTab)?.classList.contains('tab-panel')) showTab(initialTab);
