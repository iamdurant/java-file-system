// 侧边栏功能实现
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const slideSidebar = document.getElementById('slideSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const requestStorageBtn = document.getElementById('requestStorageBtn');
    
    // 确保侧边栏在初始状态下是隐藏的
    slideSidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    
    // 打开侧边栏
    sidebarToggleBtn.addEventListener('click', function() {
        slideSidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
        // 打开侧边栏时获取存储空间信息
        updateStorageInfo();
    });
    
    // 关闭侧边栏的函数
    function closeSidebar() {
        slideSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = ''; // 恢复背景滚动
    }
    
    // 点击关闭按钮
    closeSidebarBtn.addEventListener('click', closeSidebar);
    
    // 点击遮罩层关闭
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // 退出登录功能
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // 这里可以添加退出登录的逻辑，例如清除本地存储的token
            localStorage.removeItem('token');
            // 跳转到登录页面
            window.location.href = 'auth.html';
        });
    }
    
    // 申请扩展存储空间功能
    if (requestStorageBtn) {
        requestStorageBtn.addEventListener('click', function() {
            // 这里可以添加申请扩展存储空间的逻辑，例如显示一个对话框
            alert('申请扩展存储空间功能即将上线，敬请期待！');
        });
    }
    
    // 将字节转换为用户友好的格式（GB/MB）
    function formatBytes(bytes) {
        const GB = 1024 * 1024 * 1024;
        const MB = 1024 * 1024;
        
        if (bytes >= GB) {
            return (bytes / GB).toFixed(2) + ' GB';
        } else {
            return (bytes / MB).toFixed(2) + ' MB';
        }
    }
    
    // 获取并更新存储空间使用情况
    async function updateStorageInfo() {
        try {
            const response = await fetch('http://127.0.0.1:7654/file/storageInfo');
            const result = await response.json();
            
            if (result.success && result.data) {
                const usedSize = result.data.usedSize;
                const maxStoreSize = result.data.maxStoreSize;
                
                // 计算使用百分比
                const storagePercentage = (usedSize / maxStoreSize) * 100;
                
                // 更新进度条
                const progressBar = document.querySelector('.storage-progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${storagePercentage}%`;
                }
                
                // 更新文本信息
                const storageDetails = document.querySelector('.storage-details');
                if (storageDetails) {
                    storageDetails.innerHTML = `
                        <span>已使用: ${formatBytes(usedSize)}</span>
                        <span>总容量: ${formatBytes(maxStoreSize)}</span>
                    `;
                }
            } else {
                console.error('获取存储空间信息失败:', result.message);
            }
        } catch (error) {
            console.error('获取存储空间信息出错:', error);
        }
    }
    
    // 初始化存储信息
    updateStorageInfo();
});