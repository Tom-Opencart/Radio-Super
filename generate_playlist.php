<?php
/**
 * Auto-updates playlist.json by scanning the music/ and images/ directories.
 * Preserves manually edited artist/title from existing playlist.json.
 */
$musicDir = __DIR__ . '/music';
$imagesDir = __DIR__ . '/images';
$playlistFile = __DIR__ . '/playlist.json';

// Supported extensions
$allowedAudioExtensions = ['mp3', 'mp4', 'm4a', 'ogg', 'wav', 'flac', 'webm'];
$allowedImageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

// ── 0. Load existing playlist to preserve manual overrides ──────────────────
$existingTracks = [];
$existingImages = [];
if (file_exists($playlistFile)) {
    $existingData = json_decode(file_get_contents($playlistFile), true);
    if (isset($existingData['images']) && is_array($existingData['images'])) {
        $existingImages = $existingData['images'];
    }
    if (isset($existingData['tracks']) && is_array($existingData['tracks'])) {
        foreach ($existingData['tracks'] as $t) {
            if (!empty($t['filename'])) {
                $existingTracks[$t['filename']] = $t;
            }
        }
    }
}

// ── 1. Scan music/ directory ────────────────────────────────────────────────
$tracks = [];
if (is_dir($musicDir)) {
    $files = scandir($musicDir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $pathInfo = pathinfo($file);
        $ext = isset($pathInfo['extension']) ? strtolower($pathInfo['extension']) : '';
        if (!in_array($ext, $allowedAudioExtensions)) {
            continue;
        }

        $rawName = $pathInfo['filename']; // filename without extension

        // Check if we have manual overrides from the previous playlist.json
        $existing = isset($existingTracks[$file]) ? $existingTracks[$file] : null;

        // Parse "Artist - Title" or "Artist — Title" from filename
        $artist = '';
        $title = $rawName;
        if (strpos($rawName, ' - ') !== false) {
            $parts = explode(' - ', $rawName, 2);
            $artist = trim($parts[0]);
            $title = trim($parts[1]);
        } elseif (strpos($rawName, ' — ') !== false) {
            $parts = explode(' — ', $rawName, 2);
            $artist = trim($parts[0]);
            $title = trim($parts[1]);
        }

        // Prefer existing manual values over auto-parsed ones
        if ($existing) {
            if (!empty($existing['artist']) && $existing['artist'] !== 'Local Track') {
                $artist = $existing['artist'];
            }
            if (!empty($existing['title'])) {
                $title = $existing['title'];
            }
        }

        // URL-encode filename for the "file" field
        $fileUrl = 'music/' . rawurlencode($file);

        $tracks[] = [
            'file'     => $fileUrl,
            'filename' => $file,
            'title'    => $title,
            'artist'   => $artist,
            'duration' => $existing ? ($existing['duration'] ?? 0) : 0
        ];
    }
}

// ── 2. Scan images/ directory ───────────────────────────────────────────────
$images = [];
if (is_dir($imagesDir)) {
    $files = scandir($imagesDir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, $allowedImageExtensions)) {
            $images[] = 'images/' . $file;
        }
    }
}
// Fallback: keep existing images if images/ scan found nothing
if (empty($images) && !empty($existingImages)) {
    $images = $existingImages;
}

// ── 3. Write new playlist.json ──────────────────────────────────────────────
$newPlaylist = [
    'tracks' => $tracks,
    'images' => $images
];
$jsonOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
$jsonContent = json_encode($newPlaylist, $jsonOptions);

$writeSuccess = false;
$writeError = '';

if (file_exists($playlistFile) && !is_writable($playlistFile)) {
    $writeError = 'Файл playlist.json заблокирован для записи. Установите права доступа (chmod) 666 или 777 на файл playlist.json на вашем сервере.';
} elseif (!file_exists($playlistFile) && !is_writable(__DIR__)) {
    $writeError = 'Директория audio/ заблокирована для записи. Не удалось создать playlist.json. Установите права (chmod) 777 на папку audio/ на вашем сервере.';
} else {
    $result = file_put_contents($playlistFile, $jsonContent);
    if ($result === false) {
        $writeError = 'Не удалось записать данные в playlist.json. Проверьте права доступа на сервере.';
    } else {
        $writeSuccess = true;
    }
}

// ── 4. Output response ─────────────────────────────────────────────────────
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Обновление плейлиста</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #111517;
            color: #d8dee9;
            padding: 40px 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        .card {
            background: #151a1d;
            border: 1px solid #2e3440;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        h1 {
            color: #ff5a00;
            font-size: 20px;
            margin-top: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .success-pill {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            padding: 6px 12px;
            border-radius: 4px;
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .error-pill {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            padding: 10px 14px;
            border-radius: 4px;
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
            line-height: 1.4;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .stat {
            display: flex;
            gap: 24px;
            margin-bottom: 16px;
        }
        .stat-item {
            font-size: 13px;
            color: #8892b0;
        }
        .stat-item strong {
            color: #d8dee9;
            font-size: 18px;
            display: block;
        }
        ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        li {
            padding: 10px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            font-size: 14px;
        }
        li:last-child {
            border-bottom: none;
        }
        .track-title {
            color: #d8dee9;
            font-weight: 500;
        }
        .track-artist {
            color: #ff5a00;
            font-size: 12px;
        }
        .filename {
            color: #4a5568;
            font-size: 11px;
            margin-top: 2px;
        }
        .section-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #4a5568;
            margin: 20px 0 8px;
        }
        .btn-back {
            display: inline-block;
            margin-top: 24px;
            background: #ff5a00;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            transition: opacity 0.2s;
        }
        .btn-back:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="card">
        <?php if ($writeSuccess): ?>
            <h1>Плейлист обновлен!</h1>
            <div class="success-pill">playlist.json успешно перезаписан</div>
        <?php else: ?>
            <h1 style="color: #ef4444;">Ошибка обновления!</h1>
            <div class="error-pill"><?php echo htmlspecialchars($writeError); ?></div>
        <?php endif; ?>
        
        <div class="stat">
            <div class="stat-item">
                <strong><?php echo count($tracks); ?></strong>
                треков
            </div>
            <div class="stat-item">
                <strong><?php echo count($images); ?></strong>
                обложек
            </div>
        </div>

        <div class="section-label">Треки</div>
        <ul>
            <?php if (count($tracks) === 0): ?>
                <li style="color: #ecc48d;">Папка music/ пуста. Загрузите файлы и запустите скрипт снова.</li>
            <?php else: ?>
                <?php foreach ($tracks as $i => $track): ?>
                    <li>
                        <span class="track-title"><?php echo ($i + 1) . '. ' . htmlspecialchars($track['title']); ?></span>
                        <?php if (!empty($track['artist'])): ?>
                            <span class="track-artist">&mdash; <?php echo htmlspecialchars($track['artist']); ?></span>
                        <?php endif; ?>
                        <div class="filename"><?php echo htmlspecialchars($track['filename']); ?></div>
                    </li>
                <?php endforeach; ?>
            <?php endif; ?>
        </ul>

        <?php if (count($images) > 0): ?>
            <div class=\"section-label\">Обложки</div>
            <ul>
                <?php foreach ($images as $img): ?>
                    <li><span class="filename"><?php echo htmlspecialchars($img); ?></span></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>

        <a href="index.php" class="btn-back">&larr; Вернуться к плееру</a>
    </div>
</body>
</html>
