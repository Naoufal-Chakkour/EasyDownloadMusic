const playlist = [];
const audioPlayer = document.getElementById('audioPlayer');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingCover = document.getElementById('nowPlayingCover');
const searchResults = document.getElementById('searchResults');
const playlistUI = document.getElementById('playlist');
const playlistEmptyState = document.getElementById('playlistEmptyState');
const playlistCount = document.getElementById('playlistCount');

// 1. رفع ملفات محلياً من الهاتف
function handleLocalFiles(event) {
  const files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const songObj = {
      id: Date.now() + Math.random(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "ملف محلي",
      filename: file.name,
      type: 'local',
      data: file,
      audioUrl: URL.createObjectURL(file),
      coverUrl: 'https://cdn-icons-png.flaticon.com/512/461/461238.png'
    };
    playlist.push(songObj);
  }
  updatePlaylistUI();
}

// 2. دالة البحث المباشرة والمتوافقة مع الهاتف
async function searchMusic(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  searchResults.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...</div>';

  // رابط مصدر الأغاني الكاملة المباشرة
  const targetApi = `https://api.jamendo.com/v3.0/tracks/?client_id=56631b3d&format=json&limit=15&fuzzytags=${encodeURIComponent(query)}&namesearch=${encodeURIComponent(query)}`;
  
  // استخدام وسيط متوافق مع متصفحات الهاتف لتفادي الحظر
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetApi)}`;

  try {
    const response = await fetch(proxyUrl);
    const result = await response.json();
    const data = JSON.parse(result.contents);

    if (!data.results || data.results.length === 0) {
      searchResults.innerHTML = '<div class="empty-state">لم يتم العثور على نتائج. جرب البحث بلغة أو كلمة أخرى (مثال: Pop, Relax, Acoustic, Piano).</div>';
      return;
    }

    searchResults.innerHTML = '';
    data.results.forEach(track => {
      const li = document.createElement('li');
      li.className = 'song-item';

      const trackTitle = track.name || 'بدون عنوان';
      const artistName = track.artist_name || 'فنان مستقل';
      const cover = track.image || 'https://cdn-icons-png.flaticon.com/512/461/461238.png';
      const audio = track.audio;

      li.innerHTML = `
        <div class="song-meta">
          <img src="${cover}" alt="Cover">
          <div class="song-details">
            <span class="song-title-text">${trackTitle}</span>
            <span class="song-artist-text">${artistName}</span>
          </div>
        </div>
        <div class="song-actions">
          <button class="action-btn" onclick="playPreview('${audio}', '${escapeQuotes(trackTitle)} - ${escapeQuotes(artistName)}', '${cover}')" title="استماع">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="action-btn" style="color: var(--success);" onclick="addOnlineToPlaylist('${escapeQuotes(trackTitle)}', '${escapeQuotes(artistName)}', '${audio}', '${cover}')" title="إضافة">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      `;
      searchResults.appendChild(li);
    });

  } catch (error) {
    console.error(error);
    searchResults.innerHTML = '<div class="empty-state">تعذر الاتصال بالشبكة. تأكد من الاتصال بالإنترنت وأعد المحاولة.</div>';
  }
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// 3. تشغيل الصوت
function playPreview(url, title, cover) {
  audioPlayer.src = url;
  nowPlayingTitle.textContent = title;
  nowPlayingCover.src = cover;
  nowPlayingCover.style.display = 'block';
  audioPlayer.play();
}

// 4. إضافة أغنية لقائمة التحميل
function addOnlineToPlaylist(title, artist, audioUrl, coverUrl) {
  const songObj = {
    id: Date.now() + Math.random(),
    title: title,
    artist: artist,
    filename: `${artist} - ${title}.mp3`,
    type: 'online',
    audioUrl: audioUrl,
    coverUrl: coverUrl
  };

  playlist.push(songObj);
  updatePlaylistUI();
}

// 5. تحديث الواجهة
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
        <button class="action-btn" onclick="playPreview('${song.audioUrl}', '${escapeQuotes(song.title)} - ${escapeQuotes(song.artist)}', '${song.coverUrl}')" title="استماع">
          <i class="fa-solid fa-play"></i>
        </button>
        <button class="action-btn delete" onclick="removeFromPlaylist(${index})" title="إزالة">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    playlistUI.appendChild(li);
  });
}

// 6. حذف عنصر
function removeFromPlaylist(index) {
  playlist.splice(index, 1);
  updatePlaylistUI();
}

// 7. التجميع والضغط في ZIP
async function downloadZip() {
  if (playlist.length === 0) {
    alert("أضف بعض الأغاني أولاً!");
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
        if (response.ok) {
          const blob = await response.blob();
          folder.file(song.filename, blob);
        }
      } catch (err) {
        console.error(`خطأ في تنزيل: ${song.filename}`, err);
      }
    }

    processed++;
    progressBar.style.width = `${Math.floor((processed / playlist.length) * 80)}%`;
  }

  zip.generateAsync({ type: "blob", compression: "STORE" }).then((content) => {
    saveAs(content, "music_playlist.zip");
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
  }).catch((err) => {
    alert("حدث خطأ أثناء التجميع");
    progressContainer.style.display = 'none';
  });
}
