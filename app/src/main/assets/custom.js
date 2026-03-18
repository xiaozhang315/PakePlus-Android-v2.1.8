window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});(function(){
    'use strict';

    const START_HOUR = 10;
    const CLICK_END_MINUTE = 4;
    const BTN_TEXT = "重新获取任务";
    const FINISH_TEXT = "拉取完毕";

    let isWaiting = false;
    let firstClick = true;
    let taskStopped = false;
    let blankTimer = null;

    // ====================== 自动填充 ======================
    function tryFillLogin() {
        const username = localStorage.getItem("auto_user");
        const password = localStorage.getItem("auto_pwd");
        if (!username || !password) return;

        const inputUser = document.querySelector('input[placeholder="输入用户名称"]');
        const inputPwd  = document.querySelector('input[placeholder="请输入密码"]');

        if (inputUser) {
            inputUser.value = username;
            inputUser.dispatchEvent(new Event("input", { bubbles: true }));
            inputUser.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (inputPwd) {
            inputPwd.value = password;
            inputPwd.dispatchEvent(new Event("input", { bubbles: true }));
            inputPwd.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function saveLoginInfo() {
        const u = document.querySelector('input[placeholder="输入用户名称"]');
        const p = document.querySelector('input[placeholder="请输入密码"]');
        if (u && p && u.value && p.value) {
            localStorage.setItem("auto_user", u.value);
            localStorage.setItem("auto_pwd", p.value);
        }
    }

    setInterval(() => {
        tryFillLogin();
        saveLoginInfo();
    }, 200);

    const observer = new MutationObserver(() => {
        tryFillLogin();
        saveLoginInfo();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("pageshow", tryFillLogin);
    window.addEventListener("focus", tryFillLogin);

    // ====================== 异常判断 ======================
    function hasError() {
        const t = document.body.innerText || "";
        return (
            t.includes("响应码异常") ||
            t.includes("502") ||
            t.includes("503") ||
            t.includes("504") ||
            t.includes("500") ||
            t.includes("404") ||
            t.includes("网关超时") ||
            t.includes("错误网关") ||
            t.includes("服务不可用") ||
            t.includes("服务器错误")
        );
    }

    function isBlankPage() {
        const html = document.documentElement.outerHTML || '';
        const hasRealContent = 
            html.includes('<div') || 
            html.includes('<input') || 
            html.includes('<button') || 
            html.includes('<a ');
        return !hasRealContent;
    }

    function getBtn() {
        return Array.from(document.querySelectorAll("*")).find(e => 
            e.textContent?.trim() === BTN_TEXT && e.offsetParent
        );
    }

    // ====================== 自动刷新：无延迟秒刷新 ======================
    function runRefresh() {
        const now = new Date();
        if (now.getHours() < START_HOUR) return;

        // ========== 只要报错，立刻刷新，无延迟 ==========
        if (hasError()) {
            location.reload();
            return;
        }

        if (isBlankPage() && !blankTimer) {
            blankTimer = setTimeout(() => {
                location.reload();
                blankTimer = null;
            }, 3000);
        }
    }

    // ====================== 抢任务 ======================
    function runTask() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();

        if (h < START_HOUR) return;

        if (m === 0) {
            taskStopped = false;
            firstClick = true;
        }

        const isInClickWindow = (
            (h === 10 && m >= 0 && m <= CLICK_END_MINUTE) ||
            (h >= 11 && m >= 0 && m <= CLICK_END_MINUTE)
        );

        if (!isInClickWindow) return;

        if (h === 10 && taskStopped) return;
        if (h === 10 && document.body.innerText.includes(FINISH_TEXT)) {
            taskStopped = true;
            return;
        }

        if (isWaiting) return;

        const btn = getBtn();
        if (!btn) return;

        isWaiting = true;

        if (firstClick) {
            try { btn.click(); } catch(e) {}
            firstClick = false;
            isWaiting = false;
        } else {
            const delay = Math.random() * 3000;
            setTimeout(() => {
                try { getBtn()?.click(); } catch(e) {}
                isWaiting = false;
            }, delay);
        }
    }

    // ====================== 启动 ======================
    function start() {
        runTask();
        runRefresh();
        setInterval(() => {
            runTask();
            runRefresh();
        }, 33); // 更高频率检测
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();