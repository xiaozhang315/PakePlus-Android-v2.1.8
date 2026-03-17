window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});(function(){
    'use strict';

    // ====================== 配置 ======================
    const START_HOUR = 10;
    const CLICK_END_MINUTE = 4;
    const BTN_TEXT = '重新获取任务';
    const FINISH_TEXT = '拉取完毕';

    // ====================== 状态 ======================
    let isWaiting = false;
    let firstClick = true;
    let taskStopped = false;
    let refreshTriggered = false;
    let blankTimer = null;

    // ====================== 本地存储账号密码 ======================
    const AuthStorage = {
        KEY_USER: "saved_username",
        KEY_PWD: "saved_password",
        save(u, p) {
            if (u && p) {
                localStorage.setItem(this.KEY_USER, u);
                localStorage.setItem(this.KEY_PWD, p);
            }
        },
        load() {
            return {
                u: localStorage.getItem(this.KEY_USER) || "",
                p: localStorage.getItem(this.KEY_PWD) || ""
            };
        }
    };

    // ====================== 超强自动填充（照搬你油猴的逻辑） ======================
    function fillLoginInfo() {
        const { u: USERNAME, p: PASSWORD } = AuthStorage.load();
        if (!USERNAME || !PASSWORD) return;

        const userInput = document.querySelector('input[placeholder="输入用户名称"]');
        const pwdInput = document.querySelector('input[placeholder="请输入密码"]');

        if (userInput && !userInput.value.trim()) {
            userInput.value = USERNAME;
            userInput.dispatchEvent(new Event('input', { bubbles: true }));
            userInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (pwdInput && !pwdInput.value.trim()) {
            pwdInput.value = PASSWORD;
            pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // 监听输入，自动保存
    function watchAndSave() {
        const userInput = document.querySelector('input[placeholder="输入用户名称"]');
        const pwdInput = document.querySelector('input[placeholder="请输入密码"]');
        if (!userInput || !pwdInput) return;

        function save() {
            AuthStorage.save(userInput.value.trim(), pwdInput.value.trim());
        }
        userInput.addEventListener('input', save);
        pwdInput.addEventListener('input', save);
    }

    // 持续监听页面变化，保证退出登录也能自动填（你油猴最关键的逻辑）
    function startAutoFill() {
        // 首次执行
        fillLoginInfo();
        watchAndSave();

        // 监听DOM变化（退出登录、重新渲染都能触发）
        const observer = new MutationObserver(fillLoginInfo);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // 页面显示、焦点回来都填
        window.addEventListener('pageshow', fillLoginInfo);
        window.addEventListener('focus', fillLoginInfo);

        // 100ms兜底，绝对不失效
        setInterval(fillLoginInfo, 100);
    }

    // ====================== 抢任务逻辑（你原来的不变） ======================
    function isWorkTime() {
        return new Date().getHours() >= START_HOUR;
    }

    function is10ClickTime() {
        const now = new Date();
        return now.getHours() === 10 && now.getMinutes() >= 0 && now.getMinutes() <= CLICK_END_MINUTE;
    }

    function is11UpClickTime() {
        const now = new Date();
        return now.getHours() >= 11 && now.getMinutes() >= 0 && now.getMinutes() <= CLICK_END_MINUTE;
    }

    function isCodeError() {
        const t = (document.body.innerText + document.title).toLowerCase();
        const keys = ['502','503','504','500','404','网关超时','错误网关','服务不可用','服务器错误'];
        return keys.some(k => t.includes(k));
    }

    function isBlank() {
        const t = (document.body.innerText || '').trim().replace(/\s+/g, '');
        return t.length === 0;
    }

    function getBtn() {
        return Array.from(document.querySelectorAll('*')).find(el =>
            el.textContent?.trim() === BTN_TEXT && el.offsetParent
        );
    }

    function runRefresh() {
        if (!isWorkTime()) return;

        if (isCodeError() && !refreshTriggered) {
            refreshTriggered = true;
            location.reload(true);
            setTimeout(() => { refreshTriggered = false; }, 1000);
            return;
        }

        if (isBlank() && !refreshTriggered && !blankTimer) {
            refreshTriggered = true;
            blankTimer = setTimeout(() => {
                location.reload(true);
                refreshTriggered = false;
                blankTimer = null;
            }, 5000);
        }
    }

    function runTask() {
        if (!isWorkTime()) return;

        const now = new Date();
        const m = now.getMinutes();
        if (m === 0) {
            taskStopped = false;
            firstClick = true;
        }

        if (is10ClickTime()) {
            if (taskStopped) return;
            if (document.body.innerText.includes(FINISH_TEXT)) {
                taskStopped = true;
                return;
            }
        }

        if (!is10ClickTime() && !is11UpClickTime()) return;
        if (isWaiting) return;

        const btn = getBtn();
        if (!btn) return;

        if (firstClick) {
            try { btn.click(); } catch(e) {}
            firstClick = false;
            return;
        }

        isWaiting = true;
        const delay = Math.random() * 2000;
        setTimeout(() => {
            try { getBtn()?.click(); } catch(e) {}
            isWaiting = false;
        }, delay);
    }

    // ====================== 启动 ======================
    function start() {
        startAutoFill();  // 这里就是你油猴那种超强自动填充
        runTask();
        runRefresh();
        setInterval(() => { runTask(); runRefresh(); }, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
