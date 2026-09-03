const BACKEND_URL = 'https://music-backend-4imz7bh8w-myself-395e.vercel.app';
const playlist = [];
const audioPlayer = document.getElementById('audioPlayer');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingCover = document.getElementById('nowPlayingCover');
const searchResults = document.getElementById('searchResults');
const playlistUI = document.getElementById('playlist');
const playlistEmptyState = document.getElementById('playlistEmptyState');
const playlistCount = document.getElementById('playlistCount');

// 1. رفع ملفات محلياً من الجهاز
function handleLocalFiles(event) {
  const files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    playlist.push({
      id: Date.now() + Math.random(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "ملف محلي",
      filename: file.name,
      type: 'local',
      data: file,
      audioUrl: URL.createObjectURL(file),
      coverUrl: 'https://cdn-icons-png.flaticon.com/512/461/461238.png'
    });
  }
  updatePlaylistUI();
}

// 2. البحث عن الأغاني مباشرة باستخدام محرك مجاني
async function searchMusic(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  searchResults.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...</div>';

  try {
    // استخدام API مفتوح للبحث المباشر
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      searchResults.innerHTML = '<div class="empty-state">لم يتم العثور على نتائج.</div>';
      return;
    }

    searchResults.innerHTML = '';
    data.results.forEach(track => {
      const li = document.createElement('li');
      li.className = 'song-item';

      // استخدام غلاف بدقة أعلى
      const artwork = track.artworkUrl100.replace('100x100bb', '300x300bb');
      const audioUrl = track.previewUrl;

      li.innerHTML = `
        <div class="song-meta">
          <img src="${artwork}" alt="Cover">
          <div class="song-details">
            <span class="song-title-text">${track.trackName}</span>
            <span class="song-artist-text">${track.artistName}</span>
          </div>
        </div>
        <div class="song-actions">
          <button class="action-btn" onclick="playPreview('${audioUrl}', '${escapeQuotes(track.trackName)} - ${escapeQuotes(track.artistName)}', '${artwork}')" title="تشغيل">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="action-btn" style="color: var(--success);" onclick="addOnlineToPlaylist('${audioUrl}', '${escapeQuotes(track.trackName)}', '${escapeQuotes(track.artistName)}', '${artwork}')" title="إضافة للقائمة">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      `;
      searchResults.appendChild(li);
    });

  } catch (error) {
    console.error(error);
    searchResults.innerHTML = '<div class="empty-state">حدث خطأ أثناء البحث، يرجى المحاولة لاحقاً.</div>';
  }
}

function escapeQuotes(str) {
  return str ? str.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
}

// 3. تشغيل الأغنية
function playPreview(url, title, cover) {
  audioPlayer.src = url;
  nowPlayingTitle.textContent = title;
  nowPlayingCover.src = cover;
  nowPlayingCover.style.display = 'block';
  audioPlayer.play();
}

// 4. إضافة الأغنية للقائمة
function addOnlineToPlaylist(url, title, artist, coverUrl) {
  playlist.push({
    id: Date.now() + Math.random(),
    title: title,
    artist: artist,
    filename: `${artist} - ${title}.mp3`,
    type: 'online',
    audioUrl: url,
    coverUrl: coverUrl
  });
  updatePlaylistUI();
}

// 5. تحديث القائمة في الواجهة
function updatePlaylistUI() {
  playlistUI.innerHTML = '';
  playlistCount.textContent = playlist.length;

  if (playlist.length === 0) {
    playlistUI.appendChild(playlistEmptyState);
    playlistEmptyState.style.display = 'block';
    return;
  }

  playlist.forEach((song, index) => {
    const li = document.createElement('li');
    li.className = 'song-item';
    li.innerHTML = `
      <div class="song-meta">
        <img src="${song.coverUrl}" alt="Cover">
        <div class="song-details">
          <span class="song-title-text">${song.title}</span>
          <span class="song-artist-text">${song.artist}</span>
        </div>
      </div>
      <div class="song-actions">
        <button class="action-btn delete" onclick="removeFromPlaylist(${index})" title="إزالة">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    playlistUI.appendChild(li);
  });
}

function removeFromPlaylist(index) {
  playlist.splice(index, 1);
  updatePlaylistUI();
}

// 6. ضغط الأغاني وتنزيلها في ملف ZIP
async function downloadZip() {
  if (playlist.length === 0) {
    alert("أضف بعض الأغاني للقائمة أولاً!");
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder("My_Music_Playlist");
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  progressContainer.style.display = 'block';
  progressBar.style.width = '10%';

  let processed = 0;

  for (let i = 0; i < playlist.length; i++) {
    const song = playlist[i];

    if (song.type === 'local') {
      folder.file(song.filename, song.data);
    } else {
      try {
        const response = await fetch(song.audioUrl);
        const blob = await response.blob();
        folder.file(song.filename, blob);
      } catch (err) {
        console.error(`خطأ في تحميل: ${song.filename}`, err);
      }
    }

    processed++;
    progressBar.style.width = `${Math.floor((processed / playlist.length) * 85)}%`;
  }

  zip.generateAsync({ type: "blob" }).then((content) => {
    saveAs(content, "music_playlist.zip");
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
  }).catch((err) => {
    alert("حدث خطأ أثناء تنزيل الملف");
    progressContainer.style.display = 'none';
  });
}
