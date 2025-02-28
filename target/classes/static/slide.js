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
    
    // 模拟存储空间使用情况（实际应该从API获取）
    function updateStorageInfo() {
        const storageUsed = 6.5; // GB
        const storageTotal = 10; // GB
        const storagePercentage = (storageUsed / storageTotal) * 100;
        
        // 更新进度条
        const progressBar = document.querySelector('.storage-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${storagePercentage}%`;
        }
        
        // 更新文本信息
        const storageDetails = document.querySelector('.storage-details');
        if (storageDetails) {
            storageDetails.innerHTML = `
                <span>已使用: ${storageUsed} GB</span>
                <span>总容量: ${storageTotal} GB</span>
            `;
        }
    }
    
    // 初始化存储信息
    updateStorageInfo();
});