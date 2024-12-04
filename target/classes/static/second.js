// 路径导航相关功能
function initPathNavigation() {
    // 监听路径显示区域的点击事件
    const pathDisplay = document.getElementById('currentPathDisplay');
    pathDisplay.addEventListener('click', handlePathClick);
    
    // 初始化时更新路径显示
    updatePathDisplay();
}

// 处理路径点击事件
function handlePathClick(event) {
    const clickedText = event.target.textContent;
    if (clickedText === '/') {
        // 点击根目录，直接返回到根目录
        navigateToPath('');
        return;
    }

    // 获取当前完整路径
    const fullPath = currentPrefix;
    if (!fullPath) return;

    // 分割当前路径
    const pathParts = fullPath.split('/').filter(Boolean);
    
    // 找到被点击的部分在路径中的位置
    const clickedIndex = pathParts.indexOf(clickedText);
    if (clickedIndex === -1) return;

    // 构建新的路径（包含到被点击部分为止）
    const newPath = pathParts.slice(0, clickedIndex + 1).join('/');
    navigateToPath(newPath);
}

// 导航到指定路径
async function navigateToPath(targetPath) {
    currentPrefix = targetPath;
    updatePathDisplayWithLinks();
    await loadFiles();
}

// 更新路径显示（带可点击链接）
function updatePathDisplayWithLinks() {
    const pathDisplay = document.getElementById('currentPathDisplay');
    pathDisplay.innerHTML = ''; // 清空现有内容

    // 添加根目录链接
    const rootLink = createPathLink('/', () => navigateToPath(''));
    pathDisplay.appendChild(rootLink);

    if (!currentPrefix) return;

    // 分割并处理路径各部分
    const parts = currentPrefix.split('/').filter(Boolean);
    let currentPath = '';

    parts.forEach((part, index) => {
        // 添加分隔符
        const separator = document.createElement('span');
        separator.textContent = ' / ';
        separator.className = 'path-separator';
        pathDisplay.appendChild(separator);

        // 构建此部分的完整路径
        currentPath = parts.slice(0, index + 1).join('/');
        
        // 创建可点击的路径链接
        const link = createPathLink(part, () => navigateToPath(currentPath));
        pathDisplay.appendChild(link);
    });
}

// 创建路径链接元素
function createPathLink(text, onClick) {
    const link = document.createElement('span');
    link.textContent = text;
    link.className = 'path-link';
    link.onclick = onClick;
    return link;
}

// 添加到现有的 CSS
const style = document.createElement('style');
style.textContent = `
    .path-link {
        color: var(--text-primary);
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .path-link:hover {
        color: var(--accent-color);
        background-color: var(--hover-bg);
    }

    .path-separator {
        color: var(--text-secondary);
        margin: 0 2px;
    }
`;
document.head.appendChild(style);

// 在页面加载完成后初始化路径导航
document.addEventListener('DOMContentLoaded', () => {
    initPathNavigation();
});

// 覆盖原有的 updatePathDisplay 函数
function updatePathDisplay() {
    const bucketDisplay = document.getElementById('currentBucketDisplay');
    bucketDisplay.textContent = currentBucket || '未选择存储桶';
    
    // 使用新的路径显示方式
    updatePathDisplayWithLinks();
}

// 更新删除按钮显示状态
function updateDeleteButton() {
    const deleteBtn = document.getElementById('batchDeleteBtn');
    // 获取当前选中的复选框数量
    const checkboxes = document.querySelectorAll('#fileList input[type="checkbox"]:checked');
    deleteBtn.style.display = checkboxes.length > 0 ? 'inline-flex' : 'none';
}

// 添加确认对话框相关函数
function showDeleteConfirmDialog() {
    document.getElementById('deleteConfirmDialog').style.display = 'block';
}

function closeDeleteConfirmDialog() {
    document.getElementById('deleteConfirmDialog').style.display = 'none';
}

// 修改批量删除功能
async function batchDelete() {
    // 获取所有选中的复选框
    const checkedBoxes = document.querySelectorAll('#fileList input[type="checkbox"]:checked');
    if (checkedBoxes.length === 0) {
        notifications.show('请选择要删除的文件或文件夹', 'error');
        return;
    }

    // 显示确认对话框
    showDeleteConfirmDialog();
}

// 确认删除的处理函数
async function confirmDelete() {
    const checkedBoxes = document.querySelectorAll('#fileList input[type="checkbox"]:checked');
    
    // 收集选中的文件和文件夹
    const selectedItems = Array.from(checkedBoxes).map(checkbox => {
        const row = checkbox.closest('tr');
        const nameElement = row.querySelector('.file-name');
        const isDirectory = row.querySelector('.fa-folder');
        const name = nameElement.textContent;
        // 如果是文件夹，确保以 / 结尾
        return isDirectory ? `${name}/` : name;
    });

    // 构建删除请求数据
    const deleteData = {
        bucketName: currentBucket,
        prefix: currentPrefix ? `${currentPrefix}/` : '',
        files: selectedItems
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
            // 清空选中状态
            checkedBoxes.forEach(checkbox => checkbox.checked = false);
            // 更新删除按钮状态
            updateDeleteButton();
            // 刷新文件列表
            await loadFiles();
            // 关闭确认对话框
            closeDeleteConfirmDialog();
        } else {
            notifications.show(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除失败：', error);
        notifications.show('删除失败', 'error');
    }
}

// 判断是否为文件夹
function isFolder(fileName) {
    const fileRow = document.querySelector(`#fileList tr:has(.file-name:contains("${fileName}"))`);
    if (fileRow) {
        const icon = fileRow.querySelector('.fas');
        return icon && icon.classList.contains('fa-folder');
    }
    return false;
}

// 监听复选框变化
function initCheckboxListeners() {
    // 监听单个复选框的变化
    document.addEventListener('change', function(event) {
        if (event.target.type === 'checkbox' && event.target.closest('#fileList')) {
            updateDeleteButton();
        }
    });

    // 监听全选复选框的变化
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', updateDeleteButton);
    }
}
// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initPathNavigation();
    initCheckboxListeners();
    updateDeleteButton();
});

// 添加确认删除存储桶的函数
async function confirmDeleteBucket(bucketName) {
    // 显示确认对话框
    const dialog = document.getElementById('deleteConfirmDialog');
    const message = dialog.querySelector('.dialog-message');
    message.textContent = `确定要删除存储桶 "${bucketName}" 吗？此操作不可恢复。`;
    
    // 修改确认按钮的点击事件
    const confirmButton = dialog.querySelector('.button-danger');
    confirmButton.onclick = async () => {
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
                // 关闭确认对话框
                closeDeleteConfirmDialog();
            } else {
                notifications.show(result.message || '删除存储桶失败', 'error');
            }
        } catch (error) {
            console.error('删除存储桶失败：', error);
            notifications.show('删除存储桶失败', 'error');
        }
    };
    
    // 显示对话框
    dialog.style.display = 'block';
}

