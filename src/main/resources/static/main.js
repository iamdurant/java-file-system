// 全局变量
let currentBucket = '';
let currentPrefix = '';
let selectedFiles = new Set(); // 用于存储选中的文件

// 添加排序状态变量
let currentSort = {
    field: null,  // 'name', 'date', 或 'size'
    ascending: true
};

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
            buckets.forEach(bucket => {
                const bucketItem = document.createElement('div');
                bucketItem.className = 'bucket-item';
                if (bucket.bucketName === currentBucket) {
                    bucketItem.classList.add('active');
                }
                
                bucketItem.onclick = () => selectBucket(bucket.bucketName);
                
                const nameContainer = document.createElement('div');
                nameContainer.className = 'bucket-name-container';
                nameContainer.innerHTML = `
                    <i class="fas fa-database"></i>
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

    const selectedBucket = Array.from(document.querySelectorAll('.bucket-item')).find(
        item => item.textContent.trim() === bucketName
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

// 显示文件列表
function displayFiles(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    files.forEach(file => {
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
        
        fileItem.innerHTML = `
            <div class="file-icon">
                <i class="fas ${icon}" style="color: ${iconColor}"></i>
            </div>
            <span class="file-name">${file.name}</span>
        `;
        
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
        
        fileList.appendChild(tr);

        // 添加右键菜单事件
        fileItem.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // 阻止默认右键菜单
            showContextMenu(e, file);
        });
    });

    // 更新全选框状态
    updateSelectAllCheckbox();
    updateActionButtons();
}

// 进入文件夹
function enterFolder(folderName) {
    // 更新当前路径前缀
    currentPrefix = currentPrefix 
        ? `${currentPrefix}/${folderName}` 
        : folderName;

    // 更新路径显示
    updatePathDisplay();
    
    // 构建新的请求对象
    const fileObj = {
        bucketName: currentBucket,
        prefix: `${currentPrefix}/`,  // 添加末尾的斜杠
        bucket: false,
        file: false,
        archive: false
    };

    // 发送请求获取新目录的内容
    fetch('http://192.168.1.101:7654/file/listFiles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fileObj)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            displayFiles(result.data);
        } else {
            notifications.show('加载文表失败', 'error');
        }
    })
    .catch(error => {
        console.error('加载文件列表失败：', error);
        notifications.show('加载文件列表失败', 'error');
    });
}

// 更新路径显示
function updatePathDisplay() {
    const bucketDisplay = document.getElementById('currentBucketDisplay');
    const pathDisplay = document.getElementById('currentPathDisplay');
    
    // 获取当前存储桶的真实名称
    if (currentBucket) {
        fetch('http://192.168.1.101:7654/file/listBuckets')
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    const currentBucketInfo = result.data.find(b => b.bucketName === currentBucket);
                    bucketDisplay.textContent = currentBucketInfo ? 
                        (currentBucketInfo.bucketRealName || currentBucketInfo.bucketName) : 
                        currentBucket;
                }
            })
            .catch(error => {
                console.error('获取存储桶信息失败：', error);
                bucketDisplay.textContent = currentBucket;
            });
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
        
        // 创建总体进度条
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

// 添加题切换功能
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// 获取文件图标
function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        pdf: 'fa-file-pdf',
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

// 排序函数
function sortFiles(field) {
    const headers = document.querySelectorAll('.sortable');
    headers.forEach(header => {
        const icon = header.querySelector('i');
        if (header.textContent.trim().includes(getFieldName(field))) {
            if (currentSort.field === field) {
                currentSort.ascending = !currentSort.ascending;
                icon.className = `fas fa-sort-${currentSort.ascending ? 'up' : 'down'}`;
                header.className = `sortable sort-${currentSort.ascending ? 'asc' : 'desc'}`;
            } else {
                currentSort.field = field;
                currentSort.ascending = true;
                icon.className = 'fas fa-sort-up';
                header.className = 'sortable sort-asc';
            }
        } else {
            icon.className = 'fas fa-sort';
            header.className = 'sortable';
        }
    });

    // 获取当前显示的文件列表
    const fileList = document.getElementById('fileList');
    const rows = Array.from(fileList.getElementsByTagName('tr'));
    
    // 分离文件夹和文件
    const folders = rows.filter(row => {
        const icon = row.querySelector('.fas');
        return icon && icon.classList.contains('fa-folder');
    });
    
    const files = rows.filter(row => {
        const icon = row.querySelector('.fas');
        return icon && !icon.classList.contains('fa-folder');
    });

    // 排序文件夹（只按名称排序）
    folders.sort((a, b) => {
        const nameA = a.querySelector('.file-name').textContent;
        const nameB = b.querySelector('.file-name').textContent;
        return currentSort.ascending ? 
            nameA.localeCompare(nameB) : 
            nameB.localeCompare(nameA);
    });

    // 排序文件
    files.sort((a, b) => {
        let valueA, valueB;
        
        switch (field) {
            case 'name':
                valueA = a.querySelector('.file-name').textContent;
                valueB = b.querySelector('.file-name').textContent;
                return currentSort.ascending ? 
                    valueA.localeCompare(valueB) : 
                    valueB.localeCompare(valueA);
            
            case 'date':
                valueA = new Date(a.children[2].textContent);
                valueB = new Date(b.children[2].textContent);
                return currentSort.ascending ? 
                    valueA - valueB : 
                    valueB - valueA;
            
            case 'size':
                valueA = parseSizeToBytes(a.children[3].textContent);
                valueB = parseSizeToBytes(b.children[3].textContent);
                return currentSort.ascending ? 
                    valueA - valueB : 
                    valueB - valueA;
        }
    });

    // 重新合文件夹和文件（文件夹始终在前）
    const sortedRows = [...folders, ...files];
    
    // 更新显示
    fileList.innerHTML = '';
    sortedRows.forEach(row => fileList.appendChild(row));
}

// 辅助函数：将大小字符串转换为字节数
function parseSizeToBytes(sizeStr) {
    if (sizeStr === '-') return 0;
    
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };
    
    const [size, unit] = sizeStr.split(' ');
    return parseFloat(size) * units[unit];
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
    if (confirm(`确定要删除存储桶 "${bucketName}" 吗？此操作不可恢复。`)) {
        try {
            const response = await fetch(`http://192.168.1.101:7654/file/removeBucket?bucketName=${encodeURIComponent(bucketName)}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                notifications.show('存储桶删除成功');
                // 如果删除的是当前选中的存储桶，清空当前状态
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
    
    // 获取文件URL
    let fileUrl = '';
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
        if (result.success) {
            fileUrl = result.data;
        }
    } catch (error) {
        console.error('获取文件URL失败:', error);
    }

    // 设置菜单内容
    menu.innerHTML = `
        <div class="menu-item download-item">
            <i class="fas fa-download"></i>
            <span>下载</span>
        </div>
        <div class="menu-item share-item">
            <i class="fas fa-share-alt"></i>
            <span>分享</span>
        </div>
        <div class="menu-item delete delete-item">
            <i class="fas fa-trash"></i>
            <span>删除</span>
        </div>
    `;

    // 添加事件监听器
    menu.querySelector('.download-item').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();    
        
        // 使用 downloadMedia 函数来处理下载
        downloadMedia(fileUrl, file.name);
        
        menu.remove();  
    });

    menu.querySelector('.share-item').addEventListener('click', (e) => {
        e.preventDefault();
        shareFile(fileUrl);
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

