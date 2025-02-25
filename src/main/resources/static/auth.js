document.addEventListener('DOMContentLoaded', () => {
    // 添加通知系统
    const notifications = {
        show: function(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            // 添加显示动画
            setTimeout(() => notification.classList.add('show'), 10);

            // 3秒后自动移除
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    };

    // 获取所有密码切换按钮
    const toggleButtons = document.querySelectorAll('.toggle-password');

    // 为每个切换按钮添加点击事件
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');

            // 切换密码显示状态
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // 主题切换逻辑
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('img');

    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        themeIcon.src = isDark ? 'svg/moon.svg' : 'svg/sun.svg';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // 初始化主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme === 'dark');

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setTheme(!isDark);
    });

    // 表单切换逻辑
    const forms = document.querySelectorAll('.auth-form');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    function switchForm(targetFormId) {
        forms.forEach(form => {
            form.classList.remove('active');
            if (form.id === targetFormId) {
                form.classList.add('active');
            }
        });
    }

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('registerForm');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('loginForm');
    });

    // 忘记密码链接处理
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const backToLoginLink = document.getElementById('backToLogin');

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('resetPasswordForm');
    });

    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('loginForm');
    });

    // 重置密码验证码获取
    const getResetVerificationCodeBtn = document.getElementById('getResetVerificationCode');
    getResetVerificationCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('resetEmail').value;
        if (!email) {
            notifications.show('请输入邮箱地址', 'error');
            return;
        }

        // 禁用按钮并显示加载动画
        getResetVerificationCodeBtn.disabled = true;
        getResetVerificationCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';

        try {
            const response = await fetch('http://127.0.0.1:7654/auth/code/resetPass?email=' + encodeURIComponent(email), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                notifications.show('验证码已发送到您的邮箱');
                // 开始倒计时
                let countdown = 60;
                const timer = setInterval(() => {
                    getResetVerificationCodeBtn.textContent = `${countdown}秒后重试`;
                    countdown--;
                    if (countdown < 0) {
                        clearInterval(timer);
                        getResetVerificationCodeBtn.disabled = false;
                        getResetVerificationCodeBtn.textContent = '获取验证码';
                    }
                }, 1000);
            } else {
                // 恢复按钮状态
                getResetVerificationCodeBtn.disabled = false;
                getResetVerificationCodeBtn.textContent = '获取验证码';
                notifications.show(data.message || '验证码发送失败', 'error');
            }
        } catch (error) {
            console.error('验证码请求失败:', error);
            // 恢复按钮状态
            getResetVerificationCodeBtn.disabled = false;
            getResetVerificationCodeBtn.textContent = '获取验证码';
            notifications.show('验证码发送失败，请稍后重试', 'error');
        }
    });

    // 重置密码表单处理
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('resetEmail').value.trim();
        const code = document.getElementById('resetVerificationCode').value.trim();
        const password = document.getElementById('resetNewPassword').value.trim();

        if (!email || !code || !password) {
            notifications.show('请填写所有必填字段', 'error');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:7654/auth/resetPass', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    code: code,
                    password: password
                })
            });

            const data = await response.json();
            if (data.success) {
                notifications.show('密码重置成功，请登录');
                switchForm('loginForm');
                resetPasswordForm.reset();
            } else {
                throw new Error(data.message || '密码重置失败');
            }
        } catch (error) {
            notifications.show(error.message, 'error');
        }
    });

    // 注册验证码获取
    const getVerificationCodeBtn = document.getElementById('getVerificationCode');
    getVerificationCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('registerEmail').value;
        if (!email) {
            notifications.show('请输入邮箱地址', 'error');
            return;
        }

        // 禁用按钮并显示加载动画
        getVerificationCodeBtn.disabled = true;
        getVerificationCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';

        try {
            const response = await fetch('http://127.0.0.1:7654/auth/code/register?email=' + encodeURIComponent(email), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            if (data.success) {
                notifications.show('验证码已发送到您的邮箱');
                // 开始倒计时
                let countdown = 60;
                const timer = setInterval(() => {
                    getVerificationCodeBtn.textContent = `${countdown}秒后重试`;
                    countdown--;
                    if (countdown < 0) {
                        clearInterval(timer);
                        getVerificationCodeBtn.disabled = false;
                        getVerificationCodeBtn.textContent = '获取验证码';
                    }
                }, 1000);
            } else {
                // 恢复按钮状态
                getVerificationCodeBtn.disabled = false;
                getVerificationCodeBtn.textContent = '获取验证码';
                notifications.show(data.message || '验证码发送失败', 'error');
            }
        } catch (error) {
            console.error('验证码请求失败:', error);
            // 恢复按钮状态
            getVerificationCodeBtn.disabled = false;
            getVerificationCodeBtn.textContent = '获取验证码';
            notifications.show('验证码发送失败，请稍后重试', 'error');
        }
    });

    // 登录表单处理
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const response = await fetch('http://127.0.0.1:7654/auth/sighIn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                // 登录成功，保存token并跳转
                localStorage.setItem('token', data.data);
                notifications.show('登录成功，正在跳转...');
                setTimeout(async () => {
                try {
                    const response = await fetch('index.html');
            
                if (response.ok) {
                    const html = await response.text();
                    document.open();
                    document.write(html);
                    document.close();
                } else {
                    throw new Error('页面加载失败');
                }
        } catch (error) {
            notifications.show('页面加载失败，请重试', 'error');
        }
    }, 1000);
            } else {
                notifications.show(data.message || '登录失败，请检查邮箱和密码', 'error');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            notifications.show('登录失败，请稍后重试', 'error');
        }
    });

    // 注册表单处理
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('registerEmail').value;
        const code = document.getElementById('verificationCode').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 表单验证
        if (password !== confirmPassword) {
            notifications.show('两次输入的密码不一致', 'error');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:7654/auth/sighUp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    code,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                notifications.show('注册成功，请登录');
                // 切换到登录表单
                switchForm('loginForm');
                registerForm.reset();
            } else {
                notifications.show(data.message || '注册失败，请稍后重试', 'error');
            }
        } catch (error) {
            console.error('注册请求失败:', error);
            notifications.show('注册失败，请稍后重试', 'error');
        }
    });

    // 表单输入验证
    const inputs = document.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('invalid', (e) => {
            e.preventDefault();
            input.classList.add('invalid');
        });

        input.addEventListener('input', () => {
            input.classList.remove('invalid');
        });
    });
});