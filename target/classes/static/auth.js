document.addEventListener('DOMContentLoaded', () => {
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

    // 登录表单处理
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    rememberMe
                })
            });

            const data = await response.json();

            if (response.ok) {
                // 登录成功，保存token并跳转
                localStorage.setItem('token', data.token);
                window.location.href = '/';
            } else {
                alert(data.message || '登录失败，请检查用户名和密码');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            alert('登录失败，请稍后重试');
        }
    });

    // 注册表单处理
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 表单验证
        if (password !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('注册成功，请登录');
                // 切换到登录表单
                document.querySelector('[data-tab="login"]').click();
                registerForm.reset();
            } else {
                alert(data.message || '注册失败，请稍后重试');
            }
        } catch (error) {
            console.error('注册请求失败:', error);
            alert('注册失败，请稍后重试');
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