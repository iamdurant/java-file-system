/**
 * 设备检测和页面重定向模块
 */

// 设备检测工具类
class DeviceDetector {
    // 检测是否为移动设备
    static isMobileDevice() {
        // 1. 检测触摸屏支持
        const hasTouchScreen = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );

        // 2. 检测屏幕宽度
        const isNarrowScreen = window.innerWidth <= 768;

        // 3. 检测移动设备 User Agent
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(navigator.userAgent);

        // 4. 检测移动设备特定特征
        const hasMobileFeatures = 'orientation' in window;

        // 综合判断：满足以下条件之一即认为是移动设备
        // - 有触摸屏且屏幕窄
        // - 移动设备UA且有触摸屏
        // - 有移动设备特征且屏幕窄
        return (hasTouchScreen && isNarrowScreen) ||
               (isMobileUA && hasTouchScreen) ||
               (hasMobileFeatures && isNarrowScreen);
    }

    // 获取当前页面文件名
    static getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop();
        return page || 'index.html';
    }
}

// 页面重定向控制器
class PageRedirector {
    static redirectToAppropriateVersion() {
        const currentPage = DeviceDetector.getCurrentPage();
        const isMobile = DeviceDetector.isMobileDevice();

        // 如果是移动设备但不在移动版页面，重定向到移动版
        if (isMobile && currentPage !== 'mobile.html') {
            window.location.href = 'mobile.html';
            return;
        }

        // 如果是PC设备但不在PC版页面，重定向到PC版
        if (!isMobile && currentPage !== 'index.html') {
            window.location.href = 'index.html';
            return;
        }
    }
}

// 监听窗口大小变化，实时检测设备类型
let resizeTimeout;
window.addEventListener('resize', () => {
    // 使用防抖处理，避免频繁重定向
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        PageRedirector.redirectToAppropriateVersion();
    }, 250);
});

// 页面加载完成后执行设备检测和重定向
document.addEventListener('DOMContentLoaded', () => {
    PageRedirector.redirectToAppropriateVersion();
});

// 导出工具类供其他模块使用
export { DeviceDetector, PageRedirector };
