window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});(function(){
    'use strict';

    // ====================== 配置（你固定的） ======================
    const START_HOUR = 10;
    const CLICK_END_MINUTE = 4;
    const BTN_TEXT = "重新获取任务";
    const FINISH_TEXT = "拉取完毕";

    // ====================== 状态 ======================
    let isWaiting = false;
    let firstClick = true;
    let taskStopped = false;
    let refreshTriggered = false;
    let blankTimer = null;

    // ====================== 账号密码自动保存填充 ======================
    const Auth = {
        save(user, pwd) {
            if(user && pwd) {
                localStorage.setItem("my_user", user);
                localStorage.setItem("my_pwd", pwd);
            }
        },
        load() {
            return {
                user: localStorage.getItem("my_user") || "",
                pwd: localStorage.getItem("my_pwd") || ""
            };
        }
    };

    function fillAllTime() {
        const { user, pwd } = Auth.load();
        if (!user || !pwd) return;

        const u = document.querySelector('input[placeholder="输入用户名称"]') || document.querySelector('input[type="text"]');
        const p = document.querySelector('input[placeholder="请输入密码"]') || document.querySelector('input[type="password"]');

        if(u) {
            u.value = user;
            u.dispatchEvent(new Event("input",{bubbles:true}));
            u.dispatchEvent(new Event("change",{bubbles:true}));
        }
        if(p) {
            p.value = pwd;
            p.dispatchEvent(new Event("input",{bubbles:true}));
            p.dispatchEvent(new Event("change",{bubbles:true}));
        }
    }

    function saveNow() {
        const u = document.querySelector('input[placeholder="输入用户名称"]') || document.querySelector('input[type="text"]');
        const p = document.querySelector('input[placeholder="请输入密码"]') || document.querySelector('input[type="password"]');
        if(u && p && u.value && p.value) Auth.save(u.value, p.value);
    }

    function startAutoLogin() {
        fillAllTime();
        saveNow();
        setInterval(fillAllTime, 100);
        setInterval(saveNow, 500);
        new MutationObserver(fillAllTime).observe(document.body, { childList:true, subtree:true });
        window.addEventListener("pageshow", fillAllTime);
        window.addEventListener("focus", fillAllTime);
    }

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

    // ====================== 自动刷新（10点以后才生效！） ======================
    function runRefresh() {
        // 👇 这里严格按你要求：
        // 只有 >= 10点 才检测异常并刷新
        if (new Date().getHours() < START_HOUR) {
            return;
        }

        // 10点后：出现任何错误 → 立刻刷新
        if (hasError() && !refreshTriggered) {
            refreshTriggered = true;
            location.reload();
            setTimeout(() => { refreshTriggered = false; }, 1000);
            return;
        }

        // 10点后：白屏 → 5秒刷新
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
    function isWorkTime() {
        return new Date().getHours() >= START_HOUR;
    }

    function is10ClickTime() {
        const d = new Date();
        return d.getHours() == 10 && d.getMinutes() >= 0 && d.getMinutes() <= CLICK_END_MINUTE;
    }

    function is11UpClickTime() {
        const d = new Date();
        return d.getHours() >= 11 && d.getMinutes() >= 0 && d.getMinutes() <= CLICK_END_MINUTE;
    }

    function runTask() {
        if (!isWorkTime()) return;

        const m = new Date().getMinutes();
        if (m === 0) {
            taskStopped = false;
            firstClick = true;
        }

        // 10点场：看到拉取完毕就停
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
        const delay = Math.random() * 1500 + 200;
        setTimeout(() => {
            try { getBtn()?.click(); } catch(e) {}
            isWaiting = false;
        }, delay);
    }

    // ====================== 启动 ======================
    function start() {
        startAutoLogin();
        runTask();
        runRefresh();
        setInterval(() => { runTask(); runRefresh(); }, 300);
    }

    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", start)
        : start();
})();
