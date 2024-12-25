// 全局变量
let currentBucket = '';
let currentPrefix = '';
let selectedFiles = new Set(); // 用于存储选中的文件

// 添加排序状态变量
let currentSort = {
    field: null,  // 'name', 'date', 或 'size'
    ascending: true
};

// 添加一个映射来存储 bucketName 和 bucketRealName 的对应关系
const bucketNameMap = new Map();

// 通知系统
const notifications = {
    show(message, type = 'success') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(notification);

        // 5秒后自动消失
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
};

// 添加一个加载状态变量
let isLoading = false;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    const actionsDiv = document.querySelector('.actions');
    const backButton = document.createElement('button');
    backButton.className = 'button';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> 返回上级';
    backButton.onclick = goToParentDirectory;
    
    // 将返回按钮插入到最前面
    actionsDiv.insertBefore(backButton, actionsDiv.firstChild);
    
    initTheme();
    loadBuckets();
    
    // 添加主题切换按钮事件监听
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    initializeSearch();
    
    // 点击其他地方时隐藏搜索结果
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
    
    // 初始化回到顶部按钮
    initBackToTop();
});

// 加载所有 buckets
async function loadBuckets() {
    try {
        const response = await fetch('http://192.168.1.101:7654/file/listBuckets');
        const result = await response.json();
        
        if (result.success) {
            const bucketList = document.getElementById('bucketList');
            bucketList.innerHTML = '';
            
            const buckets = result.data;
            // 清空并重建映射
            bucketNameMap.clear();
            
            buckets.forEach(bucket => {
                // 保存映射关系
                bucketNameMap.set(bucket.bucketName, bucket.bucketRealName || bucket.bucketName);
                
                const bucketItem = document.createElement('div');
                bucketItem.className = 'bucket-item';
                if (bucket.bucketName === currentBucket) {
                    bucketItem.classList.add('active');
                }
                
                // 存储真实名称和内部名称的映射
                bucketItem.setAttribute('data-bucket-name', bucket.bucketName);
                bucketItem.onclick = () => selectBucket(bucket.bucketName);
                
                const nameContainer = document.createElement('div');
                nameContainer.className = 'bucket-name-container';
                nameContainer.innerHTML = `
                    <div class="bucket-icon">
                        <img src="svg/bucket.svg" alt="Bucket" style="width: 16px; height: 16px;">
                    </div>
                    <span class="bucket-name">${bucket.bucketRealName || bucket.bucketName}</span>
                `;
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'bucket-delete-button';
                deleteButton.title = '删除存储桶';
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.onclick = (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    confirmDeleteBucket(bucket.bucketName);
                };
                
                bucketItem.appendChild(nameContainer);
                bucketItem.appendChild(deleteButton);
                
                // 添加右键菜单事件
                bucketItem.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showBucketContextMenu(e, bucket);
                });
                
                bucketList.appendChild(bucketItem);
            });
        }
    } catch (error) {
        console.error('加载存储桶列表失败：', error);
        notifications.show('加载存储桶列表失败', 'error');
    }
}

// 选择 bucket
async function selectBucket(bucketName) {
    document.querySelectorAll('.bucket-item').forEach(item => {
        item.classList.remove('active');
    });

    // 根据内部名称找到对应的存储桶项
    const selectedBucket = Array.from(document.querySelectorAll('.bucket-item')).find(
        item => item.getAttribute('data-bucket-name') === bucketName
    );

    if (selectedBucket) {
        selectedBucket.classList.add('active');
    }

    currentBucket = bucketName;
    currentPrefix = '';
    updatePathDisplay();
    await loadFiles();
}

// 加载文件列表
async function loadFiles() {
    try {
        const fileObj = {
            bucketName: currentBucket,
            prefix: currentPrefix ? `${currentPrefix}/` : '',
            bucket: false,
            file: false,
            archive: false
        };

        const response = await fetch('http://192.168.1.101:7654/file/listFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileObj)
        });

        const result = await response.json();
        
        if (result.success) {
            displayFiles(result.data);
        } else {
            notifications.show('加载文件列表失败', 'error');
        }
    } catch (error) {
        console.error('加载文件列表失败：', error);
        notifications.show('加载文件列表失败', 'error');
    }
}

// 创建文件行
function createFileRow(file) {
    const tr = document.createElement('tr');
    
    const checkboxTd = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedFiles.has(file.name);
    if (checkbox.checked) {
        tr.classList.add('selected');
    }
    
    // 添加复选框点击事件
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            selectedFiles.add(file.name);
            tr.classList.add('selected');
        } else {
            selectedFiles.delete(file.name);
            tr.classList.remove('selected');
        }
        updateSelectAllCheckbox();
        updateActionButtons();
    });
    
    checkboxTd.appendChild(checkbox);
    
    const nameTd = document.createElement('td');
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item clickable';
    
    const icon = file.archive ? 'fa-folder' : getFileIcon(file.name);
    const iconColor = file.archive ? '#ffd700' : '#6c757d';
    
    // 处理特殊图标
    if (icon.startsWith('custom-')) {
        // 从 custom-xxx 格式中提取图标名称
        const iconName = icon.replace('custom-', '');
        fileItem.innerHTML = `
            <div class="file-icon">
                <img src="svg/${iconName}.svg" alt="${iconName}" style="width: 16px; height: 16px;">
            </div>
            <span class="file-name">${file.name}</span>
        `;
    } else {
        fileItem.innerHTML = `
            <div class="file-icon">
                <i class="fas ${icon}" style="color: ${iconColor}"></i>
            </div>
            <span class="file-name">${file.name}</span>
        `;
    }
    
    // 添加点击事件
    if (file.archive) {
        fileItem.onclick = () => enterFolder(file.name);
    } else {
        // 普通文件的点击事件，可以是下载或预览
        fileItem.onclick = () => handleFileClick(file);
    }
    
    nameTd.appendChild(fileItem);
    
    const dateTd = document.createElement('td');
    dateTd.textContent = file.datetime || '-';
    
    const sizeTd = document.createElement('td');
    sizeTd.className = 'file-size';
    sizeTd.textContent = formatFileSize(file.size);

    tr.appendChild(checkboxTd);
    tr.appendChild(nameTd);
    tr.appendChild(dateTd);
    tr.appendChild(sizeTd);
    
    // 添加右键菜单事件
    fileItem.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        showContextMenu(e, file);
    });

    return tr;
}

// 修改 displayFiles 函数，使用 createFileRow
function displayFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    files.forEach(file => {
        const tr = createFileRow(file);
        fileList.appendChild(tr);
    });

    // 更新全选框状态
    updateSelectAllCheckbox();
    updateActionButtons();
}

// 进入文件夹
async function enterFolder(folderName) {
    if (isLoading) return; // 如果正在加载，直接返回
    
    isLoading = true; // 设置加载状态
    
    // 添加加载状态的类
    document.body.classList.add('loading-folder');
    
    try {
        // 更新当前路径前缀
        currentPrefix = currentPrefix 
            ? `${currentPrefix}/${folderName}` 
            : folderName;

        // 更新路径显示
        updatePathDisplay();
        
        // 构建新的请求对象
        const fileObj = {
            bucketName: currentBucket,
            prefix: `${currentPrefix}/`,
            bucket: false,
            file: false,
            archive: false
        };

        // 发送请求获取新目录的内容
        const response = await fetch('http://192.168.1.101:7654/file/listFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileObj)
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayFiles(result.data);
        } else {
            notifications.show('加载文件列表失败', 'error');
        }
    } catch (error) {
        console.error('加载文件列表失败：', error);
        notifications.show('加载文件列表失败', 'error');
    } finally {
        isLoading = false; // 重置加载状态
        document.body.classList.remove('loading-folder'); // 移除加载状态的类
    }
}

// 更新路径显示
function updatePathDisplay() {
    const bucketDisplay = document.getElementById('currentBucketDisplay');
    const pathDisplay = document.getElementById('currentPathDisplay');
    
    if (currentBucket) {
        // 使用映射获取显示名称
        bucketDisplay.textContent = bucketNameMap.get(currentBucket) || currentBucket;
    } else {
        bucketDisplay.textContent = '未选择存储桶';
    }
    
    pathDisplay.textContent = currentPrefix || '/';
}

// 修改创建文件夹函数
function createFolder() {
    document.getElementById('createFolderDialog').style.display = 'block';
    document.getElementById('folderName').focus();
}

// 关闭新建文件夹对话框
function closeCreateFolderDialog() {
    document.getElementById('createFolderDialog').style.display = 'none';
    document.getElementById('folderName').value = '';
}

// 确认创建文件夹
async function confirmCreateFolder() {
    const folderName = document.getElementById('folderName').value.trim();
    
    if (!folderName) {
        notifications.show('请输入文件夹名称', 'error');
        return;
    }

    // 构建请求对象
    const fileObj = {
        bucketName: currentBucket,
        // 如果当前有前缀，则拼接前缀和新文件夹名，否则只用新文件夹名
        prefix: currentPrefix 
            ? `${currentPrefix}/${folderName}/`
            : `${folderName}/`,
        bucket: false,
        file: false,
        archive: false
    };

    try {
        const response = await fetch('http://192.168.1.101:7654/file/createArchive', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileObj)
        });

        const result = await response.json();

        if (result.success) {
            notifications.show('创建文件夹成功');
            closeCreateFolderDialog();
            loadFiles(); // 刷新文件列表
        } else {
            notifications.show(result.message || '创建文件夹失败', 'error');
        }
    } catch (error) {
        console.error('创建文件夹失败：', error);
        notifications.show('创建文件夹失败', 'error');
    }
} 

// function confirmCreateFolder() {
//     const folderName = document.getElementById('folderName').value.trim();
    
//     if (!folderName) {
//         notifications.show('请输入文件夹名称', 'error');
//         return;
//     }

//     // TODO: 实现创建文件夹的后端接口调用
//     notifications.show('创建文件夹功能待实现');
//     closeCreateFolderDialog();
// }

// 添加回车键支持
document.getElementById('folderName').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        confirmCreateFolder();
    } else if (event.key === 'Escape') {
        closeCreateFolderDialog();
    }
});

// 显示上传对话框
function showUploadDialog() {
    document.getElementById('uploadDialog').style.display = 'block';
}

// 关闭上传对话框
function closeUploadDialog() {
    document.getElementById('uploadDialog').style.display = 'none';
    document.getElementById('uploadProgress').innerHTML = '';
    document.getElementById('fileInput').value = '';
}

// 上传文件主函数
async function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    const progressContainer = document.getElementById('uploadProgress');
    
    if (files.length === 0) {
        notifications.show('请选择文件', 'error');
        return;
    }

    progressContainer.innerHTML = '';

    // 构建 FormData
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }

    // 添加参数
    formData.append('bucket', currentBucket);
    // 在根目录下传 "nil"，否则传实际路径
    formData.append('prefix', currentPrefix ? `${currentPrefix}/` : 'nil');

    try {
        const xhr = new XMLHttpRequest();
        
        // 创建体进度条
        const progressItem = document.createElement('div');
        progressItem.className = 'upload-item';
        progressItem.innerHTML = `
            <div class="file-info">
                <span>总体度</span>
                <span class="progress-text">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill"></div>
            </div>
        `;
        progressContainer.appendChild(progressItem);
        const progressBar = progressItem.querySelector('.progress-bar-fill');
        const progressText = progressItem.querySelector('.progress-text');

        // 监听上传进度
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = `${percentComplete}%`;
            }
        };

        // 处理上传完成
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    notifications.show('文件上传成功');
                    closeUploadDialog();
                    loadFiles(); // 刷新文件列表
                } else {
                    notifications.show(response.message || '上传失败', 'error');
                }
            } else {
                notifications.show('上传失败', 'error');
            }
        };

        // 处理上传错误
        xhr.onerror = () => {
            notifications.show('上传失败', 'error');
        };

        // 发送请求
        xhr.open('POST', 'http://192.168.1.101:7654/file/upload');
        xhr.send(formData);

    } catch (error) {
        notifications.show(`上传失败: ${error.message}`, 'error');
    }
}

// 初始化主题
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    
    // 更新主题切换按钮图标
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = `<img src="svg/${theme === 'dark' ? 'moon' : 'sun'}.svg" alt="Theme" style="width: 16px; height: 16px;">`;
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // 更新主题切换按钮图标
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.innerHTML = `<img src="svg/${newTheme === 'dark' ? 'moon' : 'sun'}.svg" alt="Theme" style="width: 16px; height: 16px;">`;
}

// 获文件图标
function getFileIcon(fileName) {
    // 检查文件名是否包含扩展名
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
        // 如果没有扩展名，返回 binary 图标
        return 'custom-binary';
    }
    
    const extension = fileName.slice(lastDotIndex + 1).toLowerCase();
    
    // 音频文件使用自定义 SVG 图标
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)) {
        return 'custom-music';
    }
    
    // Markdown 文件使用自定义 SVG 图标
    if (['md', 'markdown'].includes(extension)) {
        return 'custom-markdown';
    }
    
    // 图片文件使用自定义 SVG 图标
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(extension)) {
        return 'custom-photo';
    }
    
    // 视频文件使用自定义 SVG 图标
    if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(extension)) {
        return 'custom-video';
    }
    
    // PDF 文件使用自定义 SVG 图标
    if (extension === 'pdf') {
        return 'custom-pdf';
    }
    
    // TXT 文件使用自定义 SVG 图标
    if (extension === 'txt') {
        return 'custom-txt';
    }
    
    // Excel 文件使用自定义 SVG 图标
    if (['xlsx', 'xls', 'csv'].includes(extension)) {
        return 'custom-excel';
    }
    
    // 可执行文件使用自定义 SVG 图标
    if (['exe', 'msi', 'app', 'dmg'].includes(extension)) {
        return 'custom-exe';
    }
    
    // 压缩文件使用自定义 SVG 图标
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
        return 'custom-zip';
    }

    // 编程语言和其他文件类型的映射
    const customIcons = {
        java: 'custom-java',
        php: 'custom-php',
        py: 'custom-python',
        js: 'custom-javascript',
        html: 'custom-html',
        css: 'custom-css',
        cpp: 'custom-cpp',
        c: 'custom-c',
        cs: 'custom-csharp',
        go: 'custom-go',
        rs: 'custom-rust',
        rb: 'custom-ruby',
        swift: 'custom-swift',
        kt: 'custom-kotlin',
        ts: 'custom-typescript',
        sql: 'custom-sql',
        json: 'custom-json',
        xml: 'custom-xml',
        yaml: 'custom-yaml',
        yml: 'custom-yaml',
        // 添加其他文件类型映射...
    };

    if (customIcons[extension]) {
        return customIcons[extension];
    }
    
    const iconMap = {
        doc: 'fa-file-word',
        docx: 'fa-file-word',
        xls: 'fa-file-excel',
        xlsx: 'fa-file-excel',
        txt: 'fa-file-alt',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        png: 'fa-file-image',
        gif: 'fa-file-image',
        mp4: 'fa-file-video',
        mkv: 'fa-file-video',
        mp3: 'fa-file-audio',
        zip: 'fa-file-archive',
        rar: 'fa-file-archive'
    };
    
    return iconMap[extension] || 'fa-file';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (!bytes) return '-';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// 添加排序函数
function sortFiles(field) {
    const fileList = document.getElementById('fileList');
    const rows = Array.from(fileList.getElementsByTagName('tr'));
    
    // 更新排序图标
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 如果点击的是当前排序字段，则切换排序方向
    if (currentSort.field === field) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.field = field;
        currentSort.ascending = true;
    }
    
    // 添加排序图标
    const th = document.querySelector(`.sortable[onclick="sortFiles('${field}')"]`);
    th.classList.add(currentSort.ascending ? 'sort-asc' : 'sort-desc');
    
    // 分离文件夹和文件
    const folders = rows.filter(row => row.querySelector('.fa-folder'));
    const files = rows.filter(row => !row.querySelector('.fa-folder'));
    
    // 对文件进行排序
    files.sort((a, b) => {
        let valueA, valueB;
        
        switch (field) {
            case 'name':
                valueA = a.querySelector('.file-name').textContent.toLowerCase();
                valueB = b.querySelector('.file-name').textContent.toLowerCase();
                break;
            case 'date':
                valueA = a.children[2].textContent; // 日期列
                valueB = b.children[2].textContent;
                break;
            case 'size':
                valueA = parseFileSize(a.querySelector('.file-size').textContent);
                valueB = parseFileSize(b.querySelector('.file-size').textContent);
                break;
            default:
                return 0;
        }
        
        // 比较值
        if (valueA < valueB) return currentSort.ascending ? -1 : 1;
        if (valueA > valueB) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    
    // 清空文件列表
    fileList.innerHTML = '';
    
    // 先添加文件夹（文件夹始终在顶部，按名称排序）
    folders.sort((a, b) => {
        const nameA = a.querySelector('.file-name').textContent.toLowerCase();
        const nameB = b.querySelector('.file-name').textContent.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    // 重新添加所有行
    folders.forEach(row => fileList.appendChild(row));
    files.forEach(row => fileList.appendChild(row));
}

// 解析文件大小字符串为数字（用于排序）
function parseFileSize(sizeStr) {
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };
    
    if (sizeStr === '-') return -1; // 处理文件夹的情况
    
    const matches = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
    if (!matches) return 0;
    
    const size = parseFloat(matches[1]);
    const unit = matches[2].toUpperCase();
    
    return size * units[unit];
}

// 获取字段显示名称
function getFieldName(field) {
    const fieldNames = {
        'name': '名称',
        'date': '修改日期',
        'size': '大小'
    };
    return fieldNames[field];
}

// 添加全选/取消全选功能
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#fileList input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const row = checkbox.closest('tr');
        if (selectAllCheckbox.checked) {
            row.classList.add('selected');
            // 获取文件名
            const fileName = row.querySelector('.file-name').textContent;
            selectedFiles.add(fileName);
        } else {
            row.classList.remove('selected');
            const fileName = row.querySelector('.file-name').textContent;
            selectedFiles.delete(fileName);
        }
    });

    updateActionButtons();
}

// 更新全选框状态
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = Array.from(document.querySelectorAll('#fileList input[type="checkbox"]'));
    
    if (checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else {
        const checkedCount = checkboxes.filter(cb => cb.checked).length;
        selectAllCheckbox.checked = checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
}

// 更新操作按钮状态（为后续的批量操作做准备）
function updateActionButtons() {
    // TODO: 这里可以添加批量删除等按钮的启用/禁用逻辑
}

// 在 main.js 中添加返回上级目录的函数
function goToParentDirectory() {
    if (!currentPrefix) {
        return; // 如果已经在根目录，不执行任何操作
    }
    
    // 移除最后一级目录
    const lastSlashIndex = currentPrefix.lastIndexOf('/');
    currentPrefix = lastSlashIndex === -1 ? '' : currentPrefix.substring(0, lastSlashIndex);
    
    // 更新路径显示
    updatePathDisplay();
    
    // 重新加载文件列表
    loadFiles();
}

// 显示创建存储桶对话框
function showCreateBucketDialog() {
    document.getElementById('createBucketDialog').style.display = 'block';
    document.getElementById('bucketName').focus();
}

// 关创建存储桶对话框
function closeCreateBucketDialog() {
    document.getElementById('createBucketDialog').style.display = 'none';
    document.getElementById('bucketName').value = '';
}

// 确认创建存储桶
async function confirmCreateBucket() {
    const bucketName = document.getElementById('bucketName').value.trim();
    
    if (!bucketName) {
        notifications.show('请输入存储桶名称', 'error');
        return;
    }

    try {
        const response = await fetch(`http://192.168.1.101:7654/file/createBucket?bucketName=${encodeURIComponent(bucketName)}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            notifications.show('创建存储桶成功');
            closeCreateBucketDialog();
            loadBuckets(); // 刷新存储桶列表
        } else {
            notifications.show(result.message || '创建存储桶失败', 'error');
        }
    } catch (error) {
        console.error('创建存储桶失败：', error);
        notifications.show('创建存储桶失败', 'error');
    }
}

// 添加回车键支持
document.getElementById('bucketName').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        confirmCreateBucket();
    } else if (event.key === 'Escape') {
        closeCreateBucketDialog();
    }
});

// 刷新当前目录
async function refreshCurrentDirectory() {
    const refreshButton = document.querySelector('.fa-sync-alt');
    refreshButton.classList.add('fa-spin'); // 添加旋转动画
    
    try {
        await loadFiles();
        notifications.show('刷新成功');
    } catch (error) {
        console.error('刷新失败：', error);
        notifications.show('刷新失败', 'error');
    } finally {
        // 停止旋转动画
        setTimeout(() => {
            refreshButton.classList.remove('fa-spin');
        }, 500);
    }
}

// 添加确认删除存储桶的函数
async function confirmDeleteBucket(bucketName) {
    if (confirm(`确定要删除存储桶 "${bucketName}" 吗？操作不可恢复。`)) {
        try {
            const response = await fetch(`http://192.168.1.101:7654/file/removeBucket?bucketName=${encodeURIComponent(bucketName)}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                notifications.show('存储桶删除成功');
                // 如果删除的是当前选中存储桶清空当前状态
                if (bucketName === currentBucket) {
                    currentBucket = '';
                    currentPrefix = '';
                    updatePathDisplay();
                    document.getElementById('fileList').innerHTML = '';
                }
                // 重新加载存储桶列表
                loadBuckets();
            } else {
                notifications.show(result.message || '删除存储桶失败', 'error');
            }
        } catch (error) {
            console.error('删除存储桶失败：', error);
            notifications.show('删除存储桶失败', 'error');
        }
    }
}

// 显示上下文菜单
async function showContextMenu(event, file) {
    event.preventDefault(); // 阻止默认右键菜单
    
    // 移除可能存在的旧菜单
    const oldMenu = document.querySelector('.context-menu');
    if (oldMenu) {
        oldMenu.remove();
    }

    // 创建菜单元素
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    
    menu.innerHTML = `
        <div class="menu-item download-item">
            <i class="fas fa-download"></i>
            <span>下载</span>
        </div>
        <div class="menu-item share-item">
            <i class="fas fa-share-alt"></i>
            <span>分享</span>
        </div>
        <div class="menu-item delete-item">
            <i class="fas fa-trash"></i>
            <span>删除</span>
        </div>
    `;

    // 添加事件监听器
    menu.querySelector('.download-item').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fileUrl = await getFileUrl(file);
        if (fileUrl) {
            downloadMedia(fileUrl, file.name);
        }
        menu.remove();
    });

    menu.querySelector('.share-item').addEventListener('click', async (e) => {
        e.preventDefault();
        const fileUrl = await getFileUrl(file);
        if (fileUrl) {
            shareFile(fileUrl);
        }
        menu.remove();
    });

    menu.querySelector('.delete-item').addEventListener('click', (e) => {
        e.preventDefault();
        showDeleteConfirmForFile(file.name);
        menu.remove();
    });

    // 设置菜单位置
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    // 将菜单添加到页面
    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// 添加获取文件URL的函数
async function getFileUrl(file) {
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
        
        if (!result.success) {
            notifications.show(result.message || '获取文件URL失败', 'error');
            return null;
        }

        return result.data;
    } catch (error) {
        console.error('获取文件URL失败：', error);
        notifications.show('获取文件URL失败', 'error');
        return null;
    }
}

// 修改下载文件函数
function downloadFile(url, fileName) {
    // 创建一个隐藏的 a 标签
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName; // 设置下载的文件名
    document.body.appendChild(a);
    
    // 触发点击事件
    a.click();
    
    // 清理 DOM
    setTimeout(() => {
        document.body.removeChild(a);
    }, 100);
}

// 修改分享文件函数
function shareFile(url) {
    if (!url) {
        notifications.show('获取分享链接失败', 'error');
        return;
    }
    
    navigator.clipboard.writeText(url)
        .then(() => {
            notifications.show('文件链接已复制到剪贴板');
        })
        .catch(err => {
            console.error('复制失败:', err);
            notifications.show('复制链接失败', 'error');
        });
}

// 显示单个文件的删除确认框
function showDeleteConfirmForFile(fileName) {
    const dialog = document.getElementById('deleteConfirmDialog');
    const message = dialog.querySelector('.dialog-message');
    message.textContent = `确定要删除文件 "${fileName}" 吗？此操作不可恢复。`;
    
    // 修改确认按钮的点击事件
    const confirmButton = dialog.querySelector('.button-danger');
    confirmButton.onclick = () => confirmDeleteSingleFile(fileName);
    
    dialog.style.display = 'block';
}

// 确认删除单个文件
async function confirmDeleteSingleFile(fileName) {
    const deleteData = {
        bucketName: currentBucket,
        prefix: currentPrefix ? `${currentPrefix}/` : '',
        files: [fileName]
    };

    try {
        const response = await fetch('http://192.168.1.101:7654/file/removeFilesObjs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deleteData)
        });

        const result = await response.json();

        if (result.success) {
            notifications.show('删除成功');
            await loadFiles(); // 刷新文件列表
            closeDeleteConfirmDialog();
        } else {
            notifications.show(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败：', error);
        notifications.show('删除失败', 'error');
    }
}

// 添加防抖函数
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 初始化搜索功能
function initializeSearch() {
    const searchInput = document.getElementById('fileSearchInput');
    const searchContainer = document.querySelector('.search-container');
    const searchClear = document.getElementById('searchClear');
    
    // 添加加载状态管理
    let isSearching = false;
    
    // 更新搜索状态UI
    function updateSearchingState(searching) {
        isSearching = searching;
        if (searching) {
            searchContainer.classList.add('is-searching');
        } else {
            searchContainer.classList.remove('is-searching');
        }
    }

    // 更新清除按钮显示状态
    function updateClearButton() {
        if (searchInput.value.trim()) {
            searchContainer.classList.add('has-value');
        } else {
            searchContainer.classList.remove('has-value');
        }
    }

    // 清除搜索内容
    function clearSearch() {
        searchInput.value = '';
        searchInput.focus();
        hideSearchResults();
        updateClearButton();
    }

    // 添加清除按钮点击事件
    searchClear.addEventListener('click', clearSearch);

    // 监听输入更新清除按钮状态
    searchInput.addEventListener('input', updateClearButton);

    // 使用防抖处理搜索
    const debouncedSearch = debounce(async (searchTerm) => {
        if (!searchTerm.trim()) {
            hideSearchResults();
            return;
        }
        
        updateSearchingState(true); // 开始搜索，显示加载动画
        
        try {
            const response = await fetch(`http://192.168.1.101:7654/search/file?name=${searchTerm}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSearchResults(result.data);
            } else {
                notifications.show(result.message || '搜索失败', 'error');
            }
        } catch (error) {
            console.error('搜索失败:', error);
            notifications.show('搜索失败', 'error');
        } finally {
            updateSearchingState(false); // 搜索完成，隐藏加载动画
        }
    }, 300);

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        debouncedSearch(searchTerm);
    });

    // 添加焦点事件监听
    searchInput.addEventListener('focus', (e) => {
        const searchTerm = e.target.value.trim();
        if (searchTerm) {
            debouncedSearch(searchTerm);
        }
        updateClearButton();
    });
}

// 修改显示搜索结果的函数
function showSearchResults(results) {
    let resultsContainer = document.getElementById('searchResults');
    
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'searchResults';
        resultsContainer.className = 'search-results';
        document.querySelector('.search-container').appendChild(resultsContainer);
    }
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">没有找到匹配的文件</div>';
        return;
    }

    resultsContainer.innerHTML = results.map(item => {
        // 构建完整的位置路径
        const location = item.bucketRealName + 
                        (item.prefix ? '/' + item.prefix : '');
        
        return `
            <div class="search-result-item" onclick="navigateToFile('${item.bucketName}', '${item.prefix}', '${item.fileName}')">
                <div class="result-name">${item.fileName}</div>
                <div class="result-info">
                    <span class="result-location">位置: ${location}</span>
                    <span class="result-date">${item.datetime}</span>
                    <span class="result-size">${formatFileSize(item.size)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 隐藏搜索结果
function hideSearchResults() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.remove();
    }
}

// 导航到文件
async function navigateToFile(bucketName, prefix, fileName) {
    // 如果不是当前bucket，先切换bucket
    if (bucketName !== currentBucket) {
        await selectBucket(bucketName);
    }
    
    // 设置当前路径
    currentPrefix = prefix;
    updatePathDisplay();
    
    // 加载文件列表并将命中文件置顶
    await loadFilesWithHighlight(fileName);
}

// 加载文件列表并将命中文件置顶
async function loadFilesWithHighlight(highlightFileName) {
    try {
        const fileObj = {
            bucketName: currentBucket,
            prefix: currentPrefix ? `${currentPrefix}/` : '',
            bucket: false,
            file: false,
            archive: false
        };

        const response = await fetch('http://192.168.1.101:7654/file/listFiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileObj)
        });

        const result = await response.json();
        
        if (result.success) {
            // 修改显示文件的逻辑，将命中文件置顶
            displayFilesWithHighlight(result.data, highlightFileName);
        } else {
            notifications.show('加载文件列表失败', 'error');
        }
    } catch (error) {
        console.error('加载文件列表失败：', error);
        notifications.show('加载文件列表失败', 'error');
    }
}

// 显示文件列表并将命中文件置顶
function displayFilesWithHighlight(files, highlightFileName) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    // 将文件分为三类：命中文件、文件夹、其他文件
    // 解码 HTML 实体，因为后端返回的搜索结果中的文件名可能包含 HTML 标签
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = highlightFileName;
    const decodedFileName = tempDiv.textContent;
    
    const highlightFile = files.find(file => file.name === decodedFileName);
    const folders = files.filter(file => file.archive && file.name !== decodedFileName);
    const otherFiles = files.filter(file => !file.archive && file.name !== decodedFileName);

    // 先添加命中的文件（如果存在）
    if (highlightFile) {
        const tr = createFileRow(highlightFile);
        tr.classList.add('highlight', 'highlight-sticky');
        fileList.appendChild(tr);
        // 滚动到顶部
        fileList.scrollTop = 0;
    }

    // 然后添加文件夹
    folders.forEach(file => {
        fileList.appendChild(createFileRow(file));
    });

    // 最后添加其他文件
    otherFiles.forEach(file => {
        fileList.appendChild(createFileRow(file));
    });
}

// 高亮显示文件
function highlightFile(fileName) {
    const fileItems = document.querySelectorAll('.file-item');
    fileItems.forEach(item => {
        const name = item.querySelector('.file-name').textContent;
        if (name === fileName) {
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            item.classList.add('highlight');
            setTimeout(() => item.classList.remove('highlight'), 2000);
        }
    });
}

// 显示 bucket 右键菜单
function showBucketContextMenu(event, bucket) {
    // 移除可能已存在的菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
        <div class="menu-item rename-item">
            <i class="fas fa-edit"></i>
            <span>重命名</span>
        </div>
        <div class="menu-item delete-item">
            <i class="fas fa-trash"></i>
            <span>删除</span>
        </div>
    `;

    // 添加事件监听器
    menu.querySelector('.rename-item').addEventListener('click', (e) => {
        e.preventDefault();
        showRenameBucketDialog(bucket);
        menu.remove();
    });

    menu.querySelector('.delete-item').addEventListener('click', (e) => {
        e.preventDefault();
        confirmDeleteBucket(bucket.bucketName);
        menu.remove();
    });

    // 设置菜单位置
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    // 将菜单添加到页面
    document.body.appendChild(menu);

    // 点击其他地方关闭菜单
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// 显示重命名对话框
function showRenameBucketDialog(bucket) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.id = 'renameBucketDialog';
    dialog.style.display = 'block';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>重命名存储桶</h3>
            <div class="input-group">
                <label for="newBucketName">新名称</label>
                <input type="text" id="newBucketName" value="${bucket.bucketRealName || bucket.bucketName}">
            </div>
            <div class="dialog-buttons">
                <button onclick="confirmRenameBucket('${bucket.bucketName}')" class="button">确认</button>
                <button onclick="closeRenameBucketDialog()" class="button button-secondary">取消</button>
            </div>
        </div>
    `;
    
    // 添加回车键支持
    const input = dialog.querySelector('#newBucketName');
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            confirmRenameBucket(bucket.bucketName);
        } else if (e.key === 'Escape') {
            closeRenameBucketDialog();
        }
    });
    
    // 添加到页面并聚焦输入框
    document.body.appendChild(dialog);
    input.focus();
    input.select(); // 选中当前文本
}

// 关闭重命名对话框
function closeRenameBucketDialog() {
    const dialog = document.getElementById('renameBucketDialog');
    if (dialog) {
        dialog.remove();
    }
}

// 确认重命名
async function confirmRenameBucket(bucketName) {
    const newName = document.getElementById('newBucketName').value.trim();
    
    if (!newName) {
        notifications.show('请输入新名称', 'error');
        return;
    }

    try {
        const response = await fetch(`http://192.168.1.101:7654/file/renameBucket?bucketName=${encodeURIComponent(bucketName)}&newName=${encodeURIComponent(newName)}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            notifications.show('重命名成功');
            closeRenameBucketDialog();
            loadBuckets(); // 刷新存储桶列表
        } else {
            notifications.show(result.message || '重命名失败', 'error');
        }
    } catch (error) {
        console.error('重命名失败：', error);
        notifications.show('重命名失败', 'error');
    }
}

// 添加回到顶部功能
function initBackToTop() {
    const backToTopButton = document.getElementById('backToTop');
    const mainContent = document.querySelector('.file-list-container');
    
    if (!backToTopButton || !mainContent) {
        console.error('Back to top button or main content not found');
        return;
    }
    
    // 监听滚动事件
    mainContent.addEventListener('scroll', () => {
        // 当滚动超过 500px 时显示按钮（可以根据需要调整这个值）
        if (mainContent.scrollTop > 500) {
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
