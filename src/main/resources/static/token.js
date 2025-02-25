// 保存原始的fetch方法
const originalFetch = window.fetch;

// 重写fetch方法
window.fetch = function (resource, options = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // 获取URL和方法
        const url = typeof resource === 'string' ? resource : resource.url;
        const method = options.method || 'GET';

        // 获取token
        const token = localStorage.getItem('token');

        // 打开请求
        xhr.open(method, url, true);

        // 设置headers
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
        }

        // 如果有token，添加到header
        if (token) {
            xhr.setRequestHeader('token', token);
        }

        // 设置响应类型
        if (options.responseType) {
            xhr.responseType = options.responseType;
        }

        // 处理加载完成
        xhr.onload = function() {
            const response = new Response(xhr.response, {
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((headers, line) => {
                    const parts = line.split(': ');
                    if (parts[0]) headers[parts[0]] = parts[1];
                    return headers;
                }, {}))
            });
            resolve(response);
        };

        // 处理错误
        xhr.onerror = function() {
            reject(new TypeError('Network request failed'));
        };

        // 发送请求
        xhr.send(options.body);
    });
}

// 保存原始的页面跳转方法
const originalAssign = window.location.assign;
const originalReplace = window.location.replace;

// 重写location.assign
window.location.assign = function(url) {
    const token = localStorage.getItem('token');
    if (token && url) {
        // 为URL添加token参数
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${token}`;
    }
    originalAssign.call(this, url);
};

// 重写location.replace
window.location.replace = function(url) {
    const token = localStorage.getItem('token');
    if (token && url) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${token}`;
    }
    originalReplace.call(this, url);
};

// 监听页面跳转事件
window.addEventListener('beforeunload', function(event) {
    const token = localStorage.getItem('token');
    if (token) {
        const currentUrl = window.location.href;
        const targetUrl = new URL(currentUrl);

        // 如果URL中没有token参数，则添加
        if (!targetUrl.searchParams.has('token')) {
            targetUrl.searchParams.set('token', token);
            window.location.href = targetUrl.toString();
        }
    }
});
const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');

// 重写location.href
// Object.defineProperty(window.location, 'href', {
//     get: function() {
//         return originalHref.get.call(this);
//     },
//     set: function(url) {
//         const token = localStorage.getItem('token');
//         if (token && url) {
//             const separator = url.includes('?') ? '&' : '?';
//             url = `${url}${separator}token=${token}`;
//         }
//         originalHref.set.call(this, url);
//     },
//     configurable: true
// });