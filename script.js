const playlist = [];
const audioPlayer = document.getElementById('audioPlayer');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingCover = document.getElementById('nowPlayingCover');
const searchResults = document.getElementById('searchResults');
const playlistUI = document.getElementById('playlist');
const playlistEmptyState = document.getElementById('playlistEmptyState');
const playlistCount = document.getElementById('playlistCount');

// 1. رفع الملفات المحلية من الهاتف
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

// 2. البحث المباشر السريع والخفيف بدون بروكسي
async function searchMusic(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  searchResults.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...</div>';

  // قائمة بخوادم عامة وريعية سريعة تعمل مباشرة على شبكات الهاتف
  const instances = [
    'https://invidious.nerdvpn.de',
    'https://invidious.flokinet.to',
    'https://inv.riverside.rocks'
  ];

  let success = false;

  for (let baseUrl of instances) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        signal: AbortSignal.timeout(4000) // قطع الاتصال بعد 4 ثواني إذا كان الخادم بطيئاً
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (!data || data.length === 0) {
        searchResults.innerHTML = '<div class="empty-state">لم يتم العثور على نتائج.</div>';
        return;
      }

      searchResults.innerHTML = '';
      data.slice(0, 10).forEach(video => {
        const title = video.title || 'بدون عنوان';
        const artist = video.author || 'فنان';
        const cover = video.videoThumbnails ? video.videoThumbnails[0].url : 'https://cdn-icons-png.flaticon.com/512/461/461238.png';
        const videoId = video.videoId;

        const li = document.createElement('li');
        li.className = 'song-item';

        li.innerHTML = `
          <div class="song-meta">
            <img src="${cover}" alt="Cover">
            <div class="song-details">
              <span class="song-title-text">${title}</span>
              <span class="song-artist-text">${artist}</span>
            </div>
          </div>
          <div class="song-actions">
            <button class="action-btn" onclick="fetchAndPlay('${videoId}', '${baseUrl}', '${escapeQuotes(title)}', '${cover}')" title="استماع">
              <i class="fa-solid fa-play"></i>
            </button>
            <button class="action-btn" style="color: var(--success);" onclick="addOnlineToPlaylist('${videoId}', '${baseUrl}', '${escapeQuotes(title)}', '${escapeQuotes(artist)}', '${cover}')" title="إضافة">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        `;
        searchResults.appendChild(li);
      });

      success = true;
      break; // الخروج عند نجاح أول خادم
    } catch (e) {
      console.warn(`فشل الاتصال بالخادم: ${baseUrl}`);
    }
  }

  if (!success) {
    searchResults.innerHTML = '<div class="empty-state">تأكد من فتح الصفحة في المتصفح المباشر وليس داخل تطبيق محدد. أعد المحاولة.</div>';
  }
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// 3. جلب وتجميع روابط الصوت للتشغيل
async function fetchAndPlay(videoId, baseUrl, title, cover) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/videos/${videoId}`);
    const data = await res.json();
    const audioFormats = data.adaptiveFormats.filter(f => f.type.includes('audio'));
    
    if (audioFormats.length > 0) {
      audioPlayer.src = audioFormats[0].url;
      nowPlayingTitle.textContent = title;
      nowPlayingCover.src = cover;
      nowPlayingCover.style.display = 'block';
      audioPlayer.play();
    }
  } catch (e) {
    alert("تعذر تشغيل هذا المقطع حالياً.");
  }
}

// 4. إضافة أغنية لقائمة التجميع
function addOnlineToPlaylist(videoId, baseUrl, title, artist, cover) {
  const songObj = {
    id: Date.now() + Math.random(),
    title: title,
    artist: artist,
    filename: `${artist} - ${title}.mp3`,
    type: 'online',
    videoId: videoId,
    baseUrl: baseUrl,
    coverUrl: cover
  };

  playlist.push(songObj);
  updatePlaylistUI();
}

// 5. تحديث واجهة القائمة
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

// 6. حذف عنصر
function removeFromPlaylist(index) {
  playlist.splice(index, 1);
  updatePlaylistUI();
}

// 7. ضغط وتنزيل الأغاني داخل ZIP بالهاتف
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
        const res = await fetch(`${song.baseUrl}/api/v1/videos/${song.videoId}`);
        const data = await res.json();
        const audioFormats = data.adaptiveFormats.filter(f => f.type.includes('audio'));

        if (audioFormats.length > 0) {
          const audioRes = await fetch(audioFormats[0].url);
          const blob = await audioRes.blob();
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
    alert("حدث خطأ أثناء الضغط");
    progressContainer.style.display = 'none';
  });
}
