window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});(function(){
    'use strict';

    const START_HOUR = 10;
    const CLICK_END_MINUTE = 4;
    const BTN_TEXT = "重新获取任务";
    const FINISH_TEXT = "拉取完毕";

    let isWaiting = false;
    let firstClick = true;
    let taskStopped = false;
    let refreshTriggered = false;
    let blankTimer = null;

    // ====================== 自动填充（精准匹配你这个登录页） ======================
    function tryFillLogin() {
        const username = localStorage.getItem("auto_user");
        const password = localStorage.getItem("auto_pwd");

        if (!username || !password) return;

        // 精准匹配你这个登录页
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

    // 高频检测 + 页面变化必触发
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
        return (document.body.innerText || "").trim().replace(/\s/g,"").length === 0;
    }

    function getBtn() {
        return Array.from(document.querySelectorAll("*")).find(e => 
            e.textContent?.trim() === BTN_TEXT && e.offsetParent
        );
    }

    // ====================== 自动刷新（10点后生效） ======================
    function runRefresh() {
        const now = new Date();
        if (now.getHours() < START_HOUR) return;

        if (hasError() && !refreshTriggered) {
            refreshTriggered = true;
            location.reload();
            setTimeout(() => { refreshTriggered = false; }, 1000);
            return;
        }

        if (isBlankPage() && !refreshTriggered && !blankTimer) {
            refreshTriggered = true;
            blankTimer = setTimeout(() => {
                location.reload();
                refreshTriggered = false;
                blankTimer = null;
            }, 5000);
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

        const is10 = (h === 10 && m >= 0 && m <= CLICK_END_MINUTE);
        const is11Up = (h >= 11 && m >= 0 && m <= CLICK_END_MINUTE);

        if (!is10 && !is11Up) return;

        if (is10) {
            if (taskStopped) return;
            if (document.body.innerText.includes(FINISH_TEXT)) {
                taskStopped = true;
                return;
            }
        }

        if (isWaiting) return;

        const btn = getBtn();
        if (!btn) return;

        isWaiting = true;

        // 10点第一场：第一次秒点
        if (is10 && firstClick) {
            try { btn.click(); } catch(e) {}
            firstClick = false;
            isWaiting = false;
        } else {
            // 10点后几次 + 11点后全部：0~3秒随机
            const delay = Math.random() * 3000;
            setTimeout(() => {
                try { getBtn()?.click(); } catch(e) {}
                isWaiting = false;
                firstClick = false;
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
        }, 300);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();