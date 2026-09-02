const playlist = [];
const audioPlayer = document.getElementById('audioPlayer');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingCover = document.getElementById('nowPlayingCover');
const searchResults = document.getElementById('searchResults');
const playlistUI = document.getElementById('playlist');
const playlistEmptyState = document.getElementById('playlistEmptyState');
const playlistCount = document.getElementById('playlistCount');

// 1. معالجة رفع الملفات المحلية
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

// 2. البحث عن الأغاني عبر الإنترنت
async function searchMusic(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  searchResults.innerHTML = '<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...</div>';

  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`);
    const data = await response.json();

    if (data.results.length === 0) {
      searchResults.innerHTML = '<div class="empty-state">لم يتم العثور على نتائج.</div>';
      return;
    }

    searchResults.innerHTML = '';
    data.results.forEach(track => {
      const li = document.createElement('li');
      li.className = 'song-item';
      const coverUrl = track.artworkUrl100.replace('100x100bb', '300x300bb');

      li.innerHTML = `
        <div class="song-meta">
          <img src="${coverUrl}" alt="Cover">
          <div class="song-details">
            <span class="song-title-text">${track.trackName}</span>
            <span class="song-artist-text">${track.artistName}</span>
          </div>
        </div>
        <div class="song-actions">
          <button class="action-btn" onclick="playPreview('${track.previewUrl}', '${escapeQuotes(track.trackName)} - ${escapeQuotes(track.artistName)}', '${coverUrl}')" title="استماع">
            <i class="fa-solid fa-play"></i>
          </button>
          <button class="action-btn" style="color: var(--success);" onclick="addOnlineToPlaylist('${escapeQuotes(track.trackName)}', '${escapeQuotes(track.artistName)}', '${track.previewUrl}', '${coverUrl}')" title="إضافة">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      `;
      searchResults.appendChild(li);
    });

  } catch (error) {
    console.error(error);
    searchResults.innerHTML = '<div class="empty-state">حدث خطأ أثناء الاتصال بالخادم.</div>';
  }
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// 3. تشغيل العينة الصوتية
function playPreview(url, title, cover) {
  audioPlayer.src = url;
  nowPlayingTitle.textContent = title;
  nowPlayingCover.src = cover;
  nowPlayingCover.style.display = 'block';
  audioPlayer.play();
}

// 4. إضافة أغنية من النت لقائمة التحميل
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

// 5. تحديث واجهة قائمة التجميع
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

// 6. حذف عنصر من القائمة
function removeFromPlaylist(index) {
  playlist.splice(index, 1);
  updatePlaylistUI();
}

// 7. دالة جلب الملف مع مهلة زمنية 3 ثوانٍ
async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error('Network response failure');
    return await response.arrayBuffer();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// 8. ضغط الأعداد الكبيرة (100+ ملف) باستخدام المعالجة المتتابعة على دفعات (Batches)
async function downloadZip() {
  if (playlist.length === 0) {
    alert("قم بإضافة بعض الأغاني إلى القائمة أولاً!");
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder("My_Music_Playlist");
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  progressContainer.style.display = 'block';
  progressBar.style.width = '5%';

  const BATCH_SIZE = 5; // معالجة 5 ملفات فقط في كل دفعة لتفادي استهلاك الذاكرة
  let processedCount = 0;

  for (let i = 0; i < playlist.length; i += BATCH_SIZE) {
    const batch = playlist.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (song) => {
      if (song.type === 'local') {
        folder.file(song.filename, song.data);
      } else {
        try {
          const data = await fetchWithTimeout(song.audioUrl, 3000);
          folder.file(song.filename, data);
        } catch (e1) {
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(song.audioUrl)}`;
            const data = await fetchWithTimeout(proxyUrl, 3000);
            folder.file(song.filename, data);
          } catch (e2) {
            console.warn(`تجاوز الملف لتأخر الاستجابة: ${song.filename}`);
          }
        }
      }
      processedCount++;
    });

    await Promise.all(batchPromises);

    // تحديث الواجهة للسماح للمتصفح بالتقاط الأنفاس وتنظيف الذاكرة
    progressBar.style.width = `${Math.floor((processedCount / playlist.length) * 70)}%`;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  progressBar.style.width = '75%';

  // الضغط النهائي وتنزيل الملف
  zip.generateAsync({ type: "blob", compression: "STORE" }, (metadata) => {
    progressBar.style.width = `${75 + Math.floor(metadata.percent * 0.25)}%`;
  }).then((content) => {
    saveAs(content, "music_playlist.zip");
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
    }, 1000);
  }).catch((err) => {
    alert("حدث خطأ أثناء إنشاء ملف ZIP.");
    console.error(err);
    progressContainer.style.display = 'none';
  });
}
