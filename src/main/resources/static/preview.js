// 文件类型判断函数
function getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    // 文本文件类型扩展
    const textExtensions = ['txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'java', 'py', 'c', 'cpp', 'sql', 'ini', 'conf'];
    
    if (textExtensions.includes(extension)) {
        return 'text';
    } else if (extension === 'md' || extension === 'markdown') {
        return 'markdown';
    } else if (extension === 'pdf') {
        return 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
        return 'image';
    } else if (['mp4', 'webm', 'ogg', 'mkv'].includes(extension)) {
        return 'video';
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
        return 'audio';
    }
    
    return 'unsupported';
}

// 添加文件点击处理函数
async function handleFileClick(file) {
    const fileType = getFileType(file.name);
    
    // 如果是不支持的类型,提示下载
    if (fileType === 'unsupported') {
        notifications.show('该文件类型暂不支持预览，请下载后查看', 'error');
        return;
    }

    try {
        // 构造获取文件URL的请求参数
        const urlDto = {
            bucketName: currentBucket,
            prefix: currentPrefix ? `${currentPrefix}/` : '',
            name: file.name
        };

        // 调用后端接口获取文件URL
        const response = await fetch('http://192.168.1.101:7654/file/fileUrl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(urlDto)
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '获取文件URL失败');
        }

        const fileUrl = result.data;

        // 根据文件类型处理预览
        switch (fileType) {
            case 'markdown':
                showMarkdownPreview(fileUrl, file.name);
                break;
            case 'text':
                showTextPreview(fileUrl, file.name);
                break;
            case 'pdf':
                // 在新标签页打开PDF
                window.open(fileUrl, '_blank');
                break;
            case 'video':
                showVideoPreview(fileUrl, file.name);
                break;
            case 'image':
                showImagePreview(fileUrl, file.name);
                break;
            case 'audio':
                showAudioPreview(fileUrl, file.name);
                break;
            // 后续会添加其他类型的处理...
            default:
                notifications.show('该文件类型暂不支持预览', 'error');
        }

    } catch (error) {
        console.error('文件预览失败:', error);
        notifications.show('文件预览失败: ' + error.message, 'error');
    }
}

// 显示Markdown预览
async function showMarkdownPreview(fileUrl, fileName) {
    try {
        // 获取markdown内容
        const response = await fetch(fileUrl);
        const markdownContent = await response.text();

        // 创建预览对话框
        const previewDialog = document.createElement('div');
        previewDialog.className = 'dialog markdown-preview-dialog';
        
        previewDialog.innerHTML = `
            <div class="dialog-content">
                <div class="preview-header">
                    <h3>${fileName}</h3>
                    <button class="close-button" onclick="this.closest('.dialog').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="preview-body">
                    <div class="markdown-content"></div>
                </div>
            </div>
        `;

        document.body.appendChild(previewDialog);
        
        // 使用marked库渲染markdown内容
        // 需要先加载marked库
        await loadMarkedLibrary();
        
        const markdownDiv = previewDialog.querySelector('.markdown-content');
        markdownDiv.innerHTML = marked.parse(markdownContent);
        
        // 显示对话框
        previewDialog.style.display = 'block';

    } catch (error) {
        console.error('Markdown预览失败:', error);
        notifications.show('Markdown预览失败: ' + error.message, 'error');
    }
}

// 动态加载marked库
async function loadMarkedLibrary() {
    if (window.marked) {
        return; // 如果已经加载过,直接返回
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load marked library'));
        document.head.appendChild(script);
    });
}

// 显示视频预览
function showVideoPreview(fileUrl, fileName) {
    // 创建预览对话框
    const previewDialog = document.createElement('div');
    previewDialog.className = 'dialog video-preview-dialog';
    
    previewDialog.innerHTML = `
        <div class="dialog-content">
            <div class="preview-header">
                <h3>${fileName}</h3>
                <div class="preview-actions">
                    <button class="button button-secondary" onclick="downloadMedia('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> 下载
                    </button>
                    <button class="close-button" onclick="this.closest('.dialog').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="preview-body">
                <video controls autoplay src="${fileUrl}">
                    您的浏览器不支持该视频格式，请尝试下载后观看。
                </video>
            </div>
        </div>
    `;

    document.body.appendChild(previewDialog);
    previewDialog.style.display = 'block';
}

// 显示图片预览
function showImagePreview(fileUrl, fileName) {
    // 创建预览对话框
    const previewDialog = document.createElement('div');
    previewDialog.className = 'dialog image-preview-dialog';
    
    previewDialog.innerHTML = `
        <div class="dialog-content">
            <div class="preview-header">
                <h3>${fileName}</h3>
                <div class="preview-actions">
                    <a href="${fileUrl}" download class="button button-secondary">
                        <i class="fas fa-download"></i> 下载
                    </a>
                    <button class="close-button" onclick="this.closest('.dialog').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="preview-body">
                <div class="image-container">
                    <img src="${fileUrl}" alt="${fileName}" />
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(previewDialog);
    previewDialog.style.display = 'block';

    // 获取图片元素
    const img = previewDialog.querySelector('img');

    // 添加图片加载错误处理
    img.onerror = () => {
        notifications.show('图片加载失败', 'error');
        previewDialog.remove();
    };
}

// 音乐播放器状态
const musicPlayer = {
    playlist: [],         // 当前目录下的所有音频文件
    currentIndex: -1,     // 当前播放的音频索引
    isRandom: false,      // 是否随机播放
    audio: null,          // 音频元素
    dialog: null,         // 对话框元素
    isMinimized: false,   // 是否最小化
    playedHistory: [],    // 记录已播放歌曲的历史
};

// 获取当前目录下的所有音频文件
function getCurrentDirectoryAudios() {
    const fileList = document.querySelectorAll('#fileList tr');
    const audioFiles = [];
    
    fileList.forEach(row => {
        const fileName = row.querySelector('.file-name')?.textContent;
        if (fileName && getFileType(fileName) === 'audio') {
            audioFiles.push({
                name: fileName,
                url: null  // URL will be fetched when needed
            });
        }
    });
    
    return audioFiles;
}

// 工具函数：移除文件扩展名
function removeFileExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, '');
}

// 修改音频预览函数
function showAudioPreview(fileUrl, fileName) {
    // 初始化播放列表
    musicPlayer.playlist = getCurrentDirectoryAudios();
    musicPlayer.currentIndex = musicPlayer.playlist.findIndex(file => file.name === fileName);
    musicPlayer.playlist[musicPlayer.currentIndex].url = fileUrl;
    
    // 获取音频扩展名和对应的MIME类型
    const extension = fileName.split('.').pop().toLowerCase();
    const audioMimeTypes = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'flac': 'audio/flac'
    };
    const mimeType = audioMimeTypes[extension] || `audio/${extension}`;
    
    // 创建预览对话框
    const previewDialog = document.createElement('div');
    previewDialog.className = 'dialog audio-preview-dialog';
    musicPlayer.dialog = previewDialog;
    
    previewDialog.innerHTML = `
        <div class="dialog-content">
            <div class="preview-header">
                <h3 class="now-playing-title">${removeFileExtension(fileName)}</h3>
                <div class="preview-actions">
                    <button class="button-icon toggle-playlist" title="播放列表">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="button-icon toggle-random" title="随机播放">
                        <i class="fas fa-random"></i>
                    </button>
                    <button class="button-icon toggle-minimize" title="最小化">
                        <i class="fas fa-window-minimize"></i>
                    </button>
                    <button class="button button-secondary" onclick="downloadMedia('${fileUrl}', '${fileName}')">
                        <i class="fas fa-download"></i> 下载
                    </button>
                    <button class="close-button" onclick="closeAudioPlayer()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="preview-body">
                <div class="audio-container">
                    <div class="album-art">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="player-controls">
                        <button class="control-button" onclick="playPrevious()">
                            <i class="fas fa-step-backward"></i>
                        </button>
                        <button class="control-button play-pause">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="control-button" onclick="playNext()">
                            <i class="fas fa-step-forward"></i>
                        </button>
                    </div>
                    <audio controls autoplay src="${fileUrl}">
                        您的浏览器不支持音频播放。
                    </audio>
                </div>
                <div class="playlist-container">
                    <div class="playlist-header">
                        <h4>播放列表</h4>
                        <span>${musicPlayer.playlist.length} 首歌曲</span>
                    </div>
                    <div class="playlist-items">
                        ${generatePlaylist()}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(previewDialog);
    previewDialog.style.display = 'block';

    // 获取音频元素
    const audio = previewDialog.querySelector('audio');
    musicPlayer.audio = audio;

    // 添加事件监听
    initializePlayerEvents();
}

// 生成播放列表HTML
function generatePlaylist() {
    return musicPlayer.playlist.map((file, index) => `
        <div class="playlist-item ${index === musicPlayer.currentIndex ? 'active' : ''}" 
             onclick="playFromPlaylist(${index})">
            <span class="playlist-item-name">${removeFileExtension(file.name)}</span>
            ${index === musicPlayer.currentIndex ? '<i class="fas fa-volume-up"></i>' : ''}
        </div>
    `).join('');
}

// 初始化播放器事件
function initializePlayerEvents() {
    const audio = musicPlayer.audio;
    const dialog = musicPlayer.dialog;
    
    // 播放/暂停按钮事件
    const playPauseBtn = dialog.querySelector('.play-pause');
    playPauseBtn.onclick = togglePlayPause;
    
    // 音频结束事件
    audio.onended = () => {
        playNext();
    };
    
    // 切换播放列表显示
    dialog.querySelector('.toggle-playlist').onclick = togglePlaylist;
    
    // 切换随机播放
    dialog.querySelector('.toggle-random').onclick = toggleRandom;
    
    // 切换最小化
    dialog.querySelector('.toggle-minimize').onclick = toggleMinimize;
    
    // 更新播放状态图标
    audio.onplay = () => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        startAlbumRotation();
    };
    
    audio.onpause = () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        stopAlbumRotation();
    };
}

// 播放/暂停切换
function togglePlayPause() {
    if (musicPlayer.audio.paused) {
        musicPlayer.audio.play();
    } else {
        musicPlayer.audio.pause();
    }
}

// 播放下一首
async function playNext() {
    let nextIndex;
    if (musicPlayer.isRandom) {
        // 获取还没有播放过的歌曲
        const unplayedIndexes = Array.from(musicPlayer.playlist.keys())
            .filter(i => !musicPlayer.playedHistory.includes(i));
        
        if (unplayedIndexes.length === 0) {
            // 如果所有歌曲都播放过了，清空历史记录重新开始
            musicPlayer.playedHistory = [];
            nextIndex = Math.floor(Math.random() * musicPlayer.playlist.length);
        } else {
            // 从未播放的歌曲中随机选择一首
            const randomIndex = Math.floor(Math.random() * unplayedIndexes.length);
            nextIndex = unplayedIndexes[randomIndex];
        }
    } else {
        nextIndex = (musicPlayer.currentIndex + 1) % musicPlayer.playlist.length;
    }
    
    // 将即将播放的歌曲添加到历史记录中
    if (musicPlayer.isRandom) {
        musicPlayer.playedHistory.push(nextIndex);
    }
    
    await playFromPlaylist(nextIndex);
}

// 播放上一首
async function playPrevious() {
    let prevIndex;
    if (musicPlayer.isRandom) {
        prevIndex = Math.floor(Math.random() * musicPlayer.playlist.length);
    } else {
        prevIndex = (musicPlayer.currentIndex - 1 + musicPlayer.playlist.length) % musicPlayer.playlist.length;
    }
    await playFromPlaylist(prevIndex);
}

// 从播放列表播放
async function playFromPlaylist(index) {
    if (index === musicPlayer.currentIndex) return;
    
    const file = musicPlayer.playlist[index];
    if (!file.url) {
        // 获取文件URL
        try {
            const urlDto = {
                bucketName: currentBucket,
                prefix: currentPrefix ? `${currentPrefix}/` : '',
                name: file.name
            };
            
            const response = await fetch('http://192.168.1.101:7654/file/fileUrl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(urlDto)
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            
            file.url = result.data;
        } catch (error) {
            notifications.show('获取音频URL失败', 'error');
            return;
        }
    }
    
    musicPlayer.currentIndex = index;
    musicPlayer.audio.src = file.url;
    musicPlayer.audio.play();
    
    // 更新UI
    updatePlayerUI();
}

// 更新播放器UI
function updatePlayerUI() {
    const currentFile = musicPlayer.playlist[musicPlayer.currentIndex];
    musicPlayer.dialog.querySelector('.now-playing-title').textContent = removeFileExtension(currentFile.name);
    
    // 更新播放列表
    const playlistContainer = musicPlayer.dialog.querySelector('.playlist-items');
    playlistContainer.innerHTML = generatePlaylist();
}

// 切换播放列表显示
function togglePlaylist() {
    const playlistContainer = musicPlayer.dialog.querySelector('.playlist-container');
    const isHidden = !playlistContainer.classList.contains('show');
    
    playlistContainer.classList.toggle('show', isHidden);
    
    // 更新按钮状态
    const button = musicPlayer.dialog.querySelector('.toggle-playlist');
    button.classList.toggle('active', isHidden);
}

// 切换随机播
function toggleRandom() {
    musicPlayer.isRandom = !musicPlayer.isRandom;
    // 切换到随机播放时，清空播放历史
    if (musicPlayer.isRandom) {
        musicPlayer.playedHistory = [musicPlayer.currentIndex];
    }
    const button = musicPlayer.dialog.querySelector('.toggle-random');
    button.classList.toggle('active', musicPlayer.isRandom);
}

// 切换最小化状态
function toggleMinimize() {
    const dialog = musicPlayer.dialog;
    musicPlayer.isMinimized = !musicPlayer.isMinimized;
    
    if (musicPlayer.isMinimized) {
        dialog.classList.add('minimized');
        // 更新最小化按钮图标
        dialog.querySelector('.toggle-minimize i').className = 'fas fa-window-maximize';
    } else {
        dialog.classList.remove('minimized');
        // 更新最小化按钮图标
        dialog.querySelector('.toggle-minimize i').className = 'fas fa-window-minimize';
    }
}

// 关闭音频播放器
function closeAudioPlayer() {
    if (musicPlayer.dialog) {
        // 添加淡出动画
        musicPlayer.dialog.classList.add('fade-out');
        setTimeout(() => {
            musicPlayer.dialog.remove();
            musicPlayer.audio = null;
            musicPlayer.dialog = null;
            musicPlayer.playlist = [];
            musicPlayer.currentIndex = -1;
        }, 300); // 等待动画完成
    }
}

// 开始专辑封面旋转动画
function startAlbumRotation() {
    const albumArt = musicPlayer.dialog.querySelector('.album-art');
    albumArt.style.animationPlayState = 'running';
}

// 停止专辑封面旋转动画
function stopAlbumRotation() {
    const albumArt = musicPlayer.dialog.querySelector('.album-art');
    albumArt.style.animationPlayState = 'paused';
}

// 添加新的下载媒体文件函数
function downloadMedia(url, fileName) {
    // 创建一个通知 ID，用于更新同一个通知
    const notificationId = Date.now().toString();
    
    // 创建一个 blob URL 来强制下载
    fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/octet-stream'
        },
        mode: 'cors'
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
            throw new Error('无法获取文件大小信息');
        }

        const totalSize = parseInt(contentLength);
        let loadedSize = 0;
        
        // 创建进度通知
        showProgressNotification(notificationId, 0, fileName);
        
        // 创建一个新的 ReadableStream
        const reader = response.body.getReader();
        return new Response(
            new ReadableStream({
                async start(controller) {
                    while (true) {
                        const {done, value} = await reader.read();
                        if (done) break;
                        
                        loadedSize += value.length;
                        const progress = (loadedSize / totalSize) * 100;
                        
                        // 更新下载进度通知
                        showProgressNotification(notificationId, progress, fileName);
                        
                        controller.enqueue(value);
                    }
                    controller.close();
                }
            })
        ).blob();
    })
    .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            // 移除进度通知，显示完成通知
            removeNotification(notificationId);
            notifications.show(`${fileName} 下载完成！`, 'success');
        }, 100);
    })
    .catch(error => {
        console.error('下载失败:', error);
        // 移除进度通知，显示错误通知
        removeNotification(notificationId);
        notifications.show('下载失败: ' + error.message, 'error');
    });
}

// 显示进度通知
function showProgressNotification(id, progress, fileName) {
    let notification = document.querySelector(`.notification[data-id="${id}"]`);
    const container = document.getElementById('notificationContainer');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification info';
        notification.setAttribute('data-id', id);
        container.appendChild(notification);
    }
    
    // 格式化进度为两位小数
    const formattedProgress = progress.toFixed(1);
    
    notification.innerHTML = `
        <div class="download-progress">
            <span>${fileName} 下载中: ${formattedProgress}%</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
    `;
}

// 移除特定通知
function removeNotification(id) {
    const notification = document.querySelector(`.notification[data-id="${id}"]`);
    if (notification) {
        notification.remove();
    }
}

// 添加文本文件预览函数
async function showTextPreview(fileUrl, fileName) {
    try {
        const response = await fetch(fileUrl);
        const text = await response.text();
        
        // 创建预览对话框
        const dialog = document.createElement('div');
        dialog.className = 'preview-dialog';
        dialog.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <h3>${fileName}</h3>
                    <button class="close-button" onclick="this.closest('.preview-dialog').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="preview-body">
                    <pre class="text-content">${escapeHtml(text)}</pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 添加ESC键关闭功能
        dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
            }
        });
        
    } catch (error) {
        console.error('预览文件失败:', error);
        notifications.show('预览文件失败', 'error');
    }
}

// 添加HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}