// نستخدم الـ Backend القانوني الخاص بنا
// Jamendo, Audius, ccMixter, FMA, Internet Archive, Musopen, Openverse, Wikimedia, SoundCloud

const API_BASE = "https://musicbackend-b5z77tho.b4a.run/api";

const playlist = [];
const audioPlayer = document.getElementById('audioPlayer');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingCover = document.getElementById('nowPlayingCover');
const searchResults = document.getElementById('searchResults');
const playlistUI = document.getElementById('playlist');
const playlistEmptyState = document.getElementById('playlistEmptyState');
const playlistCount = document.getElementById('playlistCount');

const DEFAULT_COVER = 'https://cdn-icons-png.flaticon.com/512/461/461238.png';

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
      coverUrl: DEFAULT_COVER
    });
  }

  updatePlaylistUI();
}

// 2. البحث عبر مصادرنا القانونية المتعددة
async function searchMusic(event) {
  event.preventDefault();

  const query =
    document.getElementById('searchInput').value.trim();

  if (!query) return;

  searchResults.innerHTML =
    '<div class="empty-state">جاري البحث في كل المصادر...</div>';

  try {
    const response = await fetch(
      `${API_BASE}/search?artist=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const tracks = data.results || [];

    if (tracks.length === 0) {
      searchResults.innerHTML =
        '<div class="empty-state">لم يتم العثور على نتائج. جرّب اسمًا آخر.</div>';

      return;
    }

    searchResults.innerHTML = '';

    tracks.forEach((track, index) => {
      const li = document.createElement('li');

      li.className = 'song-item';

      li.innerHTML = `
        <div class="song-meta">
          <img src="${DEFAULT_COVER}" alt="Cover">

          <div class="song-details">
            <span class="song-title-text">
              ${escapeHtml(track.title || 'بدون عنوان')}
            </span>

            <span class="song-artist-text">
              ${escapeHtml(track.artist || 'غير معروف')}
              ·
              ${escapeHtml(track.sourceProvider || '')}
            </span>
          </div>
        </div>

        <div class="song-actions">

          <button
            class="action-btn"
            onclick="playPreviewByIndex(${index})"
            title="استماع">
            <i class="fa-solid fa-play"></i>
          </button>

          <button
            class="action-btn"
            onclick="addOnlineToPlaylistByIndex(${index})"
            title="إضافة للقائمة">
            <i class="fa-solid fa-plus"></i>
          </button>

        </div>
      `;

      searchResults.appendChild(li);
    });

    // الاحتفاظ بنتائج البحث الحالية
    window.__lastSearchResults = tracks;

  } catch (error) {
    console.error('[Frontend Search Error]', error);

    searchResults.innerHTML =
      '<div class="empty-state">حدث خطأ في الاتصال بالخادم. تأكد أن الـ Backend يعمل.</div>';
  }
}

// حماية النصوص من HTML
function escapeHtml(str) {
  const div = document.createElement('div');

  div.textContent = str;

  return div.innerHTML;
}

// 3. تشغيل الأغنية
function playPreview(url, title, cover) {
  if (!url) {
    alert("هذه الأغنية لا تحتوي على رابط تشغيل مباشر.");
    return;
  }

  audioPlayer.src = url;

  nowPlayingTitle.textContent = title;

  nowPlayingCover.src =
    cover || DEFAULT_COVER;

  nowPlayingCover.style.display =
    'block';

  audioPlayer.play().catch(error => {
    console.warn(
      '[Audio Playback]',
      error
    );
  });
}

function playPreviewByIndex(index) {
  const track =
    window.__lastSearchResults?.[index];

  if (!track) return;

  const playableUrl =
    track.streamUrl ||
    track.downloadUrl;

  playPreview(
    playableUrl,
    track.title,
    DEFAULT_COVER
  );
}

// 4. إضافة الأغنية للقائمة
function addOnlineToPlaylist(
  url,
  title,
  artist,
  coverUrl
) {
  if (!url) {
    alert(
      "هذه الأغنية لا تحتوي على رابط تنزيل مباشر."
    );

    return;
  }

  playlist.push({
    id:
      Date.now() +
      Math.random(),

    title:
      title,

    artist:
      artist,

    filename:
      `${artist} - ${title}.mp3`,

    type:
      'online',

    audioUrl:
      url,

    coverUrl:
      coverUrl ||
      DEFAULT_COVER
  });

  updatePlaylistUI();
}

function addOnlineToPlaylistByIndex(index) {
  const track =
    window.__lastSearchResults?.[index];

  if (!track) return;

  if (!track.downloadUrl) {
    alert(
      "هذه الأغنية متاحة للاستماع فقط ولا تحتوي على رابط تنزيل."
    );

    return;
  }

  addOnlineToPlaylist(
    track.downloadUrl,
    track.title,
    track.artist,
    DEFAULT_COVER
  );
}

// 5. تحديث القائمة في الواجهة
function updatePlaylistUI() {
  playlistUI.innerHTML = '';

  playlistCount.textContent =
    playlist.length;

  if (playlist.length === 0) {
    playlistUI.appendChild(
      playlistEmptyState
    );

    playlistEmptyState.style.display =
      'block';

    return;
  }

  playlist.forEach(
    (song, index) => {
      const li =
        document.createElement('li');

      li.className =
        'song-item';

      li.innerHTML = `
        <div class="song-meta">

          <img
            src="${song.coverUrl}"
            alt="Cover">

          <div class="song-details">

            <span class="song-title-text">
              ${escapeHtml(song.title)}
            </span>

            <span class="song-artist-text">
              ${escapeHtml(song.artist)}
            </span>

          </div>
        </div>

        <div class="song-actions">

          <button
            class="action-btn delete"
            onclick="removeFromPlaylist(${index})"
            title="إزالة">

            <i class="fa-solid fa-trash"></i>

          </button>

        </div>
      `;

      playlistUI.appendChild(li);
    }
  );
}

function removeFromPlaylist(index) {
  const song =
    playlist[index];

  if (
    song &&
    song.type === 'local' &&
    song.audioUrl
  ) {
    URL.revokeObjectURL(
      song.audioUrl
    );
  }

  playlist.splice(
    index,
    1
  );

  updatePlaylistUI();
}

// 6. تنزيل القائمة كملف ZIP
// الملفات المحلية تُضغط في المتصفح مباشرة
// الملفات الأونلاين تُطلب من الـ Backend
async function downloadZip() {
  if (playlist.length === 0) {
    alert(
      "أضف بعض الأغاني للقائمة أولاً!"
    );

    return;
  }

  const progressContainer =
    document.getElementById(
      'progressContainer'
    );

  const progressBar =
    document.getElementById(
      'progressBar'
    );

  progressContainer.style.display =
    'block';

  progressBar.style.width =
    '10%';

  const localSongs =
    playlist.filter(
      song =>
        song.type === 'local'
    );

  const onlineSongs =
    playlist.filter(
      song =>
        song.type === 'online'
    );

  try {
    const zip =
      new JSZip();

    const folder =
      zip.folder(
        "My_Music_Playlist"
      );

    // الملفات المحلية
    localSongs.forEach(
      song => {
        folder.file(
          song.filename,
          song.data
        );
      }
    );

    progressBar.style.width =
      '30%';

    // الملفات الأونلاين
    if (
      onlineSongs.length > 0
    ) {
      const response =
        await fetch(
          `${API_BASE}/download`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({
                tracks:
                  onlineSongs
              })
          }
        );

      if (!response.ok) {
        const err =
          await response
            .json()
            .catch(
              () => ({})
            );

        throw new Error(
          err.error ||
          'فشل تحميل الأغاني الأونلاين'
        );
      }

      progressBar.style.width =
        '70%';

      // ZIP القادم من السيرفر
      const serverZipBlob =
        await response.blob();

      const serverZip =
        await JSZip.loadAsync(
          serverZipBlob
        );

      const fileEntries =
        Object.values(
          serverZip.files
        );

      for (
        const entry of fileEntries
      ) {
        if (entry.dir) {
          continue;
        }

        const content =
          await entry.async(
            'blob'
          );

        folder.file(
          entry.name,
          content
        );
      }
    }

    progressBar.style.width =
      '90%';

    const finalBlob =
      await zip.generateAsync({
        type:
          'blob'
      });

    saveAs(
      finalBlob,
      'music_playlist.zip'
    );

    progressBar.style.width =
      '100%';

  } catch (err) {
    console.error(
      '[Frontend Download Error]',
      err
    );

    alert(
      `حدث خطأ أثناء تنزيل الملف: ${err.message}`
    );

  } finally {
    setTimeout(
      () => {
        progressContainer.style.display =
          'none';

        progressBar.style.width =
          '0%';
      },
      500
    );
  }
}
