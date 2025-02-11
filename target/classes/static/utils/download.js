// 下载媒体文件函数
export function downloadMedia(url, fileName) {
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

// 显示下载进度通知
function showProgressNotification(id, progress, fileName) {
    const container = document.getElementById('notificationContainer');
    let notification = document.querySelector(`.notification[data-id="${id}"]`);
    
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
