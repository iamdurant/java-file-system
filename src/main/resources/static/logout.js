// 退出登录功能
async function logout() {
    try {
        const response = await fetch('http://127.0.0.1:7654/auth/logout', {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            // 显示退出成功消息
            notifications.show('退出成功，正在跳转...');
            
            // 延迟一秒后跳转到登录页面
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1000);
        } else {
            notifications.show(result.message || '退出失败', 'error');
        }
    } catch (error) {
        console.error('退出登录失败:', error);
        notifications.show('退出失败，请稍后重试', 'error');
    }
}

// 绑定退出登录按钮事件
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});