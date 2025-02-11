// 全局变量
let currentBucket = '';
let currentPrefix = '';
let isLoading = false;
let isBucketsLoading = false;

// 通知系统
const notifications = {
    queue: [], // 通知队列
    maxVisible: 3, // 最大同时显示数量
    duration: 3000, // 通知显示时间
    container: null, // 通知容器

    init() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'success') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="notifications.close(this.parentElement)">
                <i class="fas fa-times"></i>
            </button>
        `;

        // 添加到队列
        this.queue.push(notification);
        this.update();

        // 设置自动关闭
        setTimeout(() => this.close(notification), this.duration);
    },

    update() {
        // 确保容器存在
        if (!this.container) {
            this.init();
        }

        // 移除超出最大显示数量的通知
        while (this.container.children.length >= this.maxVisible) {
            this.container.removeChild(this.container.firstChild);
        }

        // 显示队列中的通知
        while (this.queue.length > 0 && this.container.children.length < this.maxVisible) {
            const notification = this.queue.shift();
            this.container.appendChild(notification);
            // 添加进入动画类
            setTimeout(() => notification.classList.add('show'), 10);
        }
    },

    close(notification) {
        if (!notification) return;
        
        // 添加退出动画类
        notification.classList.add('hide');
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (notification.parentElement === this.container) {
                this.container.removeChild(notification);
                this.update(); // 更新队列
            }
        }, 300); // 与 CSS 动画时间相匹配
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('页面加载完成，开始初始化...'); // 添加调试日志
    try {
        await initializeUI();
        console.log('UI初始化完成，开始加载存储桶...'); // 添加调试日志
        await loadBuckets();
    } catch (error) {
        console.error('初始化失败：', error);
    }
    
    // 初始化回到顶部按钮
    initBackToTop();
});

// UI初始化
async function initializeUI() {
    // 搜索按钮事件
    document.getElementById('searchButton').addEventListener('click', toggleSearch);
    
    // 返回按钮事件
    document.getElementById('backButton').addEventListener('click', goBack);
    
    // 底部按钮事件
    document.getElementById('uploadButton').addEventListener('click', showUploadDialog);
    document.getElementById('newFolderButton').addEventListener('click', showNewFolderDialog);
    document.getElementById('refreshButton').addEventListener('click', refreshFiles);

    // 添加新建存储桶按钮事件
    document.getElementById('addBucketButton').addEventListener('click', showAddBucketDialog);
}

// 切换菜单显示
function toggleMenu() {
    const sideMenu = document.getElementById('sideMenu');
    sideMenu.classList.toggle('active');
}

// 加载存储桶列表
async function loadBuckets() {
    if (isBucketsLoading) return;
    
    isBucketsLoading = true;
    showBucketsLoading();
    
    console.log('开始加载存储桶列表...'); // 添加调试日志
    
    try {
        // 使用完整的URL
        const response = await fetch('http://127.0.0.1:7654/file/listBuckets', {
            method: 'GET',  // 明确指定请求方法
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('收到响应:', response); // 添加调试日志
        
        const result = await response.json();
        console.log('解析结果:', result); // 添加调试日志
        
        if (result.success) {
            const bucketList = document.getElementById('bucketList');
            bucketList.innerHTML = '';
            
            if (result.data && result.data.length > 0) {
                result.data.forEach(bucket => {
                    const bucketItem = createBucketItem(bucket);
                    bucketList.appendChild(bucketItem);
                });
            } else {
                // 如果没有存储桶，显示空状态
                bucketList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-database"></i>
                        <p>暂无存储桶</p>
                        <button onclick="showAddBucketDialog()" class="button">
                            <i class="fas fa-plus"></i> 新建存储桶
                        </button>
                    </div>
                `;
            }
        } else {
            notifications.show('加载存储桶失败', 'error');
        }
    } catch (error) {
        console.error('加载存储桶失败：', error);
        notifications.show('加载存储桶失败', 'error');
    } finally {
        isBucketsLoading = false;
        hideBucketsLoading();
    }
}

// 创建存储桶项目
function createBucketItem(bucket) {
    const div = document.createElement('div');
    div.className = 'bucket-item';
    div.innerHTML = `
        <i class="fas fa-database"></i>
        <span>${bucket.bucketRealName || bucket.bucketName}</span>
    `;
    
    div.addEventListener('click', () => selectBucket(bucket.bucketName));
    
    return div;
}

// 选择存储桶
async function selectBucket(bucketName) {
    if (isLoading) return;
    
    currentBucket = bucketName;
    currentPrefix = '';
    
    // 显示文件列表区域和底部栏
    document.getElementById('fileListContainer').style.display = 'block';
    document.getElementById('bottomBar').style.display = 'flex';
    
    // 隐藏存储桶列表
    document.querySelector('.bucket-container').style.display = 'none';
    
    await loadFiles();
    updatePathDisplay();
}

// 加载文件列表
async function loadFiles() {
    if (!currentBucket) return;
    
    isLoading = true;
    showLoading();
    
    try {
        const response = await fetch('http://127.0.0.1:7654/file/listFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketName: currentBucket,
                prefix: currentPrefix ? `${currentPrefix}/` : '',
                bucket: false,
                file: false,
                archive: false
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayFiles(result.data);
        } else {
            notifications.show('加载文件失败', 'error');
        }
    } catch (error) {
        console.error('加载文件失败：', error);
        notifications.show('加载文件失败', 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// 显示文件列表
function displayFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = createFileItem(file);
        fileList.appendChild(fileItem);
    });
}

// 创建文件项目
function createFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    // 根据接口返回的数据结构判断文件类型
    const icon = file.archive ? 'fa-folder' : 'fa-file';
    const date = file.datetime ? new Date(file.datetime).toLocaleDateString() : '-';
    const size = file.size ? formatFileSize(file.size) : '-';
    
    div.innerHTML = `
        <i class="fas ${icon} file-icon"></i>
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-meta">${date} · ${size}</div>
        </div>
    `;
    
    div.addEventListener('click', () => {
        if (file.archive) {
            // 如果是文件夹，进入文件夹
            enterFolder(file);
        } else {
            // 如果是文件，显示操作菜单
            showFileOptions(file);
        }
    });
    
    return div;
}

// 进入文件夹
async function enterFolder(file) {
    if (isLoading) return;
    
    isLoading = true;
    showLoading();
    
    try {
        // 构建请求对象
        const fileObj = {
            bucketName: currentBucket,
            prefix: currentPrefix ? `${currentPrefix}/${file.name}/` : `${file.name}/`,
            bucket: false,
            file: false,
            archive: false
        };

        // 发送请求获取文件夹内容
        const response = await fetch('http://127.0.0.1:7654/file/listFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileObj)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 更新当前路径
            currentPrefix = currentPrefix ? `${currentPrefix}/${file.name}` : file.name;
            // 更新路径显示
            updatePathDisplay();
            // 显示文件列表
            displayFiles(result.data);
        } else {
            notifications.show('加载文件夹失败', 'error');
        }
    } catch (error) {
        console.error('加载文件夹失败：', error);
        notifications.show('加载文件夹失败', 'error');
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// 更新路径显示
function updatePathDisplay() {
    const pathDisplay = document.getElementById('pathDisplay');
    const parts = currentPrefix ? currentPrefix.split('/') : [];
    
    let html = `<span onclick="goToRoot()">根目录</span>`;
    let currentPath = '';
    
    parts.forEach((part, index) => {
        currentPath += (index === 0 ? '' : '/') + part;
        html += ` / <span onclick="goToPath('${currentPath}')">${part}</span>`;
    });
    
    pathDisplay.innerHTML = html;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示/隐藏加载动画
function showLoading() {
    // TODO: 实现加载动画
}

function hideLoading() {
    // TODO: 实现加载动画隐藏
}

// 返回按钮处理
function goBack() {
    if (currentPrefix) {
        // 如果在子文件夹中，返回上一级
        const parts = currentPrefix.split('/');
        parts.pop();
        currentPrefix = parts.join('/');
        loadFiles();
        updatePathDisplay();
    } else {
        // 如果在根目录，返回存储桶列表
        currentBucket = '';
        document.getElementById('fileListContainer').style.display = 'none';
        document.getElementById('bottomBar').style.display = 'none';
        document.querySelector('.bucket-container').style.display = 'block';
    }
}

// 显示存储桶加载动画
function showBucketsLoading() {
    const bucketList = document.getElementById('bucketList');
    bucketList.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">加载存储桶...</div>
        </div>
    `;
}

// 隐藏存储桶加载动画
function hideBucketsLoading() {
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.remove();
    }
}

// 显示新建存储桶对话框
function showAddBucketDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>新建存储桶</h3>
            <div class="input-group">
                <input type="text" id="bucketName" placeholder="请输入存储桶名称">
            </div>
            <div class="dialog-buttons">
                <button onclick="createBucket()" class="button">确定</button>
                <button onclick="closeDialog()" class="button button-secondary">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 自动聚焦输入框
    setTimeout(() => {
        const input = document.getElementById('bucketName');
        input.focus();
        
        // 添加回车键支持
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                createBucket();
            } else if (e.key === 'Escape') {
                closeDialog();
            }
        });
    }, 100);
}

// 创建存储桶
async function createBucket() {
    const bucketNameInput = document.getElementById('bucketName');
    const bucketName = bucketNameInput.value.trim();
    
    if (!bucketName) {
        notifications.show('请输入存储桶名称', 'error');
        return;
    }
    
    try {
        const response = await fetch(`http://127.0.0.1:7654/file/createBucket?bucketName=${encodeURIComponent(bucketName)}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            notifications.show('创建存储桶成功');
            closeDialog();
            await loadBuckets(); // 刷新存储桶列表
        } else {
            notifications.show(result.message || '创建存储桶失败', 'error');
        }
    } catch (error) {
        console.error('创建存储桶失败：', error);
        notifications.show('创建存储桶失败', 'error');
    }
}

// 关闭对话框
function closeDialog() {
    const dialog = document.querySelector('.dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 搜索相关函数
function toggleSearch() {
    const searchInput = document.createElement('div');
    searchInput.className = 'search-overlay';
    searchInput.innerHTML = `
        <div class="search-header">
            <div class="search-input-container">
                <i class="fas fa-search"></i>
                <input type="text" placeholder="搜索文件..." id="searchInput">
                <button class="close-search" onclick="closeSearch()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="search-results" id="searchResults"></div>
    `;
    document.body.appendChild(searchInput);
    
    // 聚焦到搜索输入框
    setTimeout(() => {
        document.getElementById('searchInput').focus();
    }, 100);
    
    // 添加搜索事件监听
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
}

function closeSearch() {
    const searchOverlay = document.querySelector('.search-overlay');
    if (searchOverlay) {
        searchOverlay.remove();
    }
}

// 搜索文件
async function handleSearch(event) {
    const searchTerm = event.target.value.trim();
    const searchResults = document.getElementById('searchResults');
    
    if (!searchTerm) {
        searchResults.innerHTML = '';
        return;
    }
    
    try {
        // 使用 POST 请求，将搜索词作为表单参数
        const response = await fetch('http://127.0.0.1:7654/search/file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `name=${encodeURIComponent(searchTerm)}`
        });
        
        const result = await response.json();
        
        if (result.success) {
            displaySearchResults(result.data);
        } else {
            searchResults.innerHTML = '<div class="search-error">搜索失败</div>';
        }
    } catch (error) {
        console.error('搜索失败：', error);
        searchResults.innerHTML = '<div class="search-error">搜索失败</div>';
    }
}

// 显示搜索结果
function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    
    if (!results || results.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>未找到相关文件</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = results.map(file => {
        // 只传递必要的属性给事件处理函数
        const fileData = {
            bucketName: file.bucketName,
            prefix: file.prefix,
            name: file.fileName,
            archive: file.archive
        };
        
        // 构建完整的位置路径：bucketRealName/prefix
        const location = file.bucketRealName + 
                        (file.prefix ? '/' + file.prefix : '');
        
        return `
            <div class="search-result-item" onclick='handleSearchResultClick(${JSON.stringify(fileData)})'>
                <div class="search-result-name">${file.fileName}</div>
                <div class="search-result-meta">
                    <div>日期：${formatDate(file.datetime)}</div>
                    <div>大小：${formatFileSize(file.size)}</div>
                    <div>位置：${location}</div>
                </div>
            </div>
        `;
    }).join('');
}

// 格式化日期
function formatDate(datetime) {
    if (!datetime) return '-';
    return new Date(datetime).toLocaleDateString();
}

// 处理搜索结果点击
async function handleSearchResultClick(file) {
    closeSearch(); // 关闭搜索界面
    
    // 如果不是当前bucket，先切换bucket
    if (file.bucketName !== currentBucket) {
        await selectBucket(file.bucketName);
    }
    
    // 设置当前路径
    currentPrefix = file.prefix || '';
    updatePathDisplay();
    
    // 加载文件列表并高亮显示点击的文件
    await loadFilesWithHighlight(file.name);
}

// 加载文件列表并高亮显示指定文件
async function loadFilesWithHighlight(highlightFileName) {
    try {
        const response = await fetch('http://127.0.0.1:7654/file/listFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketName: currentBucket,
                prefix: currentPrefix ? `${currentPrefix}/` : '',
                bucket: false,
                file: false,
                archive: false
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayFilesWithHighlight(result.data, highlightFileName);
        } else {
            notifications.show('加载文件列表失败', 'error');
        }
    } catch (error) {
        console.error('加载文件列表失败：', error);
        notifications.show('加载文件列表失败', 'error');
    }
}

// 显示文件列表并高亮指定文件
function displayFilesWithHighlight(files, highlightFileName) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    // 创建临时元素来去除 em 标签
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = highlightFileName;
    const plainHighlightFileName = tempDiv.textContent;
    
    // 将文件分为三类：高亮文件、文件夹、其他文件
    const highlightFile = files.find(file => {
        // 去除文件名中的 em 标签后再比较
        tempDiv.innerHTML = file.name;
        return tempDiv.textContent === plainHighlightFileName;
    });
    
    const folders = files.filter(file => {
        if (!file.archive) return false;
        tempDiv.innerHTML = file.name;
        return tempDiv.textContent !== plainHighlightFileName;
    });
    
    const otherFiles = files.filter(file => {
        if (file.archive) return false;
        tempDiv.innerHTML = file.name;
        return tempDiv.textContent !== plainHighlightFileName;
    });
    
    // 先添加高亮文件（如果存在）
    if (highlightFile) {
        const fileItem = createFileItem(highlightFile);
        fileItem.classList.add('search-highlight');
        fileList.appendChild(fileItem);
    }
    
    // 然后添加文件夹
    folders.forEach(file => {
        fileList.appendChild(createFileItem(file));
    });
    
    // 最后添加其他文件
    otherFiles.forEach(file => {
        fileList.appendChild(createFileItem(file));
    });
    
    // 滚动到顶部
    fileList.scrollTop = 0;
}

// 上传相关函数
function showUploadDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>上传文件</h3>
            <input type="file" id="fileInput" multiple>
            <div class="dialog-buttons">
                <button onclick="handleFileUpload()" class="button">上传</button>
                <button onclick="closeDialog()" class="button button-secondary">取消</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

// 新建文件夹相关函数
function showNewFolderDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>新建文件夹</h3>
            <div class="input-group">
                <input type="text" id="folderName" placeholder="请输入文件夹名称">
            </div>
            <div class="dialog-buttons">
                <button onclick="createFolder()" class="button">创建</button>
                <button onclick="closeDialog()" class="button button-secondary">取消</button>
            </div>
        </div>
    `;
    
    // 添加点击背景关闭对话框的功能
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeDialog();
        }
    });
    
    document.body.appendChild(dialog);
    
    // 自动聚焦输入框
    setTimeout(() => {
        document.getElementById('folderName').focus();
    }, 100);
}

// 刷新文件列表
async function refreshFiles() {
    try {
        if (currentBucket) {
            await loadFiles();
            notifications.show('刷新成功');
        } else {
            await loadBuckets();
            notifications.show('刷新成功');
        }
    } catch (error) {
        console.error('刷新失败：', error);
        notifications.show('刷新失败', 'error');
    }
}

// 工具函数 - 防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 显示文件操作菜单
function showFileOptions(file) {
    // 特殊文件夹列表
    const specialFolders = ['收藏夹'];
    
    // 如果是特殊文件夹，按照文件夹处理
    if (file.archive && specialFolders.includes(file.name)) {
        enterFolder(file);
        return;
    }
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    
    // 将文件对象存储在全局变量中
    window.currentFile = file;
    
    // 构建菜单HTML，使用函数名直接调用
    dialog.innerHTML = `
        <div class="action-sheet">
            <div class="action-sheet-header">
                <h3 class="file-title">${file.name}</h3>
                <button class="close-button" onclick="closeDialog()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="action-sheet-content">
                <button class="action-sheet-button" onclick="downloadCurrentFile()">
                    <i class="fas fa-download"></i>
                    <span>下载</span>
                </button>
                <button class="action-sheet-button danger" onclick="deleteCurrentFile()">
                    <i class="fas fa-trash-alt"></i>
                    <span>删除</span>
                </button>
            </div>
        </div>
    `;
    
    // 添加点击事件监听器到对话框背景
    dialog.addEventListener('click', (e) => {
        // 如果点击的是对话框背景（而不是内容），则关闭对话框
        if (e.target === dialog) {
            closeDialog();
        }
    });
    
    document.body.appendChild(dialog);
}

// 下载当前文件的包装函数
function downloadCurrentFile() {
    if (window.currentFile) {
        downloadFile(window.currentFile);
    }
}

// 删除当前文件的包装函数
function deleteCurrentFile() {
    if (window.currentFile) {
        deleteFile(window.currentFile);
    }
}

// 处理文件上传
async function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        notifications.show('请选择要上传的文件', 'error');
        return;
    }

    closeDialog();
    
    // 创建进度显示容器
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-container';
    document.body.appendChild(progressContainer);

    try {
        // 创建单个 FormData，包含所有文件
        const formData = new FormData();
        
        // 添加所有文件
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        // 修改这里的参数
        formData.append('bucket', currentBucket);
        formData.append('prefix', currentPrefix ? `${currentPrefix}/` : '');  // 这里需要修改

        // 创建进度显示
        const progressItem = document.createElement('div');
        progressItem.className = 'upload-progress-item';
        progressItem.innerHTML = `
            <div class="upload-info">
                <span class="filename">正在上传 ${files.length} 个文件</span>
                <span class="progress-text">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;
        progressContainer.appendChild(progressItem);
        
        const progressFill = progressItem.querySelector('.progress-fill');
        const progressText = progressItem.querySelector('.progress-text');

        // 发送请求
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://127.0.0.1:7654/file/upload');

        // 监听上传进度
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentCompleted = Math.round((event.loaded * 100) / event.total);
                progressFill.style.width = `${percentCompleted}%`;
                progressText.textContent = `${percentCompleted}%`;
            }
        };

        // 处理上传完成
        xhr.onload = async () => {
            if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                    progressItem.classList.add('success');
                    notifications.show(`${files.length} 个文件上传成功`);
                    await loadFiles(); // 刷新文件列表
                } else {
                    progressItem.classList.add('error');
                    notifications.show(`上传失败: ${result.message}`, 'error');
                }
            } else {
                progressItem.classList.add('error');
                notifications.show('上传失败', 'error');
            }
        };

        // 处理上传错误
        xhr.onerror = () => {
            progressItem.classList.add('error');
            notifications.show('上传失败', 'error');
        };

        // 发送请求
        xhr.send(formData);
    } catch (error) {
        console.error('上传失败：', error);
        notifications.show('上传失败', 'error');
    } finally {
        // 延迟移除进度显示
        setTimeout(() => {
            progressContainer.remove();
        }, 2000);
    }
}

// 修改下载文件函数
async function downloadFile(file) {
    try {
        const response = await fetch('http://127.0.0.1:7654/file/fileUrl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketName: currentBucket,
                name: file.name,
                prefix: currentPrefix ? `${currentPrefix}/` : ''
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // 导入并使用 downloadMedia
            const { downloadMedia } = await import('./utils/download.js');
            downloadMedia(result.data, file.name);
            closeDialog();
        } else {
            notifications.show('获取下载链接失败', 'error');
        }
    } catch (error) {
        console.error('下载失败：', error);
        notifications.show('下载失败', 'error');
    }
}

// 显示确认对话框
function showConfirmDialog(message, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = `
        <div class="dialog-content confirm-dialog">
            <div class="confirm-message">${message}</div>
            <div class="dialog-buttons">
                <button onclick="handleConfirm(true)" class="button button-danger">确定</button>
                <button onclick="handleConfirm(false)" class="button button-secondary">取消</button>
            </div>
        </div>
    `;
    
    // 保存确认回调
    window.confirmCallback = onConfirm;
    
    // 添加点击背景关闭的功能
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            handleConfirm(false);
        }
    });
    
    document.body.appendChild(dialog);
}

// 处理确认对话框的选择
function handleConfirm(confirmed) {
    if (confirmed && window.confirmCallback) {
        window.confirmCallback();
    }
    // 关闭所有对话框
    closeAllDialogs();
}

// 关闭所有对话框
function closeAllDialogs() {
    // 关闭确认对话框
    const dialogs = document.querySelectorAll('.dialog');
    dialogs.forEach(dialog => dialog.remove());
    
    // 关闭文件操作菜单
    const actionSheet = document.querySelector('.action-sheet');
    if (actionSheet) {
        actionSheet.remove();
    }
    
    // 清除确认回调
    window.confirmCallback = null;
}

// 修改删除文件函数
async function deleteFile(file) {
    showConfirmDialog(`确定要删除 ${file.name} 吗？`, async () => {
        try {
            const response = await fetch('http://127.0.0.1:7654/file/removeFilesObjs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketName: currentBucket,
                    prefix: currentPrefix ? `${currentPrefix}/` : '',
                    files: [file.name]
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                notifications.show('删除成功');
                await loadFiles(); // 重新加载文件列表
            } else {
                notifications.show('删除失败', 'error');
            }
        } catch (error) {
            console.error('删除失败：', error);
            notifications.show('删除失败', 'error');
        }
    });
}

// 创建文件夹
async function createFolder() {
    const folderNameInput = document.getElementById('folderName');
    const folderName = folderNameInput.value.trim();
    
    if (!folderName) {
        notifications.show('请输入文件夹名称', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:7654/file/createArchive', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketName: currentBucket,
                prefix: currentPrefix ? `${currentPrefix}/${folderName}/` : `${folderName}/`,  // 在当前路径下创建文件夹
                bucket: false,
                file: false,
                archive: false
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            notifications.show('创建文件夹成功');
            closeDialog();
            await loadFiles(); // 刷新文件列表
        } else {
            notifications.show('创建文件夹失败', 'error');
        }
    } catch (error) {
        console.error('创建文件夹失败：', error);
        notifications.show('创建文件夹失败', 'error');
    }
}

// 添加回到顶部功能
function initBackToTop() {
    const backToTopButton = document.getElementById('backToTop');
    const mainContent = document.querySelector('.main-content');
    
    // 监听滚动事件
    mainContent.addEventListener('scroll', () => {
        // 当滚动超过一屏高度时显示按钮
        if (mainContent.scrollTop > window.innerHeight) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });
    
    // 点击按钮回到顶部
    backToTopButton.addEventListener('click', () => {
        mainContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}
