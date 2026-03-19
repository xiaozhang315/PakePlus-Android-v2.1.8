window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         抢任务+异常刷新+自动填充（带0-3秒随机延迟）
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  自动填充账号密码，每小时0-3分抢任务（随机延迟0-3秒），10点后异常刷新
// @author       豆包
// @match        *://*.y03owzrr2dnub.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ====================== 可配置参数 ======================
    const START_HOUR = 10;                  // 异常刷新生效小时（10点开始）
    // 抢任务小时（11点至23点）
    const TASK_HOURS = [11,12,13,14,15,16,17,18,19,20,21,22,23];
    const TASK_MIN_START = 0;                 // 抢任务开始分钟
    const TASK_MIN_END = 3;                    // 抢任务结束分钟
    const BTN_TEXT = "重新获取任务";            // 抢任务按钮文本
    const LOGIN_BTN_TEXT = "登录";               // 登录按钮文本

    // 输入框选择器（根据实际页面修改）
    const USERNAME_SELECTOR = 'input[placeholder*="用户名"]';
    const PASSWORD_SELECTOR = 'input[placeholder*="密码"]';

    // ====================== 自动填充模块 ======================
    const Auth = {
        save(user, pwd) {
            if (user && pwd) {
                localStorage.setItem("my_user", user);
                localStorage.setItem("my_pwd", pwd);
                console.log('[自动填充] ✅ 凭证已保存');
            }
        },
        load() {
            return {
                user: localStorage.getItem("my_user") || "",
                pwd: localStorage.getItem("my_pwd") || ""
            };
        }
    };

    function fillLoginForm() {
        const { user, pwd } = Auth.load();
        if (!user || !pwd) return;

        const usernameInput = document.querySelector(USERNAME_SELECTOR) || document.querySelector('input[type="text"]');
        const passwordInput = document.querySelector(PASSWORD_SELECTOR) || document.querySelector('input[type="password"]');

        if (usernameInput && usernameInput.value !== user) {
            usernameInput.value = user;
            usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
            usernameInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (passwordInput && passwordInput.value !== pwd) {
            passwordInput.value = pwd;
            passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
            passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function listenForLogin() {
        if (window._loginListenerAdded) return;
        const loginBtn = findButtonByText(LOGIN_BTN_TEXT);
        if (!loginBtn) return;

        loginBtn.addEventListener('click', () => {
            setTimeout(() => {
                const usernameInput = document.querySelector(USERNAME_SELECTOR) || document.querySelector('input[type="text"]');
                const passwordInput = document.querySelector(PASSWORD_SELECTOR) || document.querySelector('input[type="password"]');
                if (usernameInput && passwordInput) {
                    Auth.save(usernameInput.value, passwordInput.value);
                }
            }, 500);
        });
        window._loginListenerAdded = true;
    }

    function startAutoLogin() {
        fillLoginForm();
        listenForLogin();
        setInterval(fillLoginForm, 200);
        setInterval(() => {
            const usernameInput = document.querySelector(USERNAME_SELECTOR) || document.querySelector('input[type="text"]');
            const passwordInput = document.querySelector(PASSWORD_SELECTOR) || document.querySelector('input[type="password"]');
            if (usernameInput && passwordInput && usernameInput.value && passwordInput.value) {
                Auth.save(usernameInput.value, passwordInput.value);
            }
        }, 1000);
        new MutationObserver(fillLoginForm).observe(document.body, { childList: true, subtree: true });
        window.addEventListener("pageshow", fillLoginForm);
        window.addEventListener("focus", fillLoginForm);
    }

    // ====================== 通用工具函数 ======================
    function findButtonByText(text) {
        const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        for (let btn of buttons) {
            if (btn.textContent.trim() === text || btn.value === text) return btn;
        }
        return null;
    }

    function getBtn() {
        return Array.from(document.querySelectorAll("*")).find(e => 
            e.textContent?.trim() === BTN_TEXT && e.offsetParent
        );
    }

    // ====================== 异常刷新 ======================
    let refreshTriggered = false;
    let blankTimer = null;

    function hasError() {
        const t = document.body.innerText || "";
        return (
            t.includes("响应码异常") ||
            t.includes("502") || t.includes("503") || t.includes("504") ||
            t.includes("500") || t.includes("404") ||
            t.includes("网关超时") || t.includes("错误网关") ||
            t.includes("服务不可用") || t.includes("服务器错误")
        );
    }

    function isBlankPage() {
        return (document.body.innerText || "").trim().replace(/\s/g, "").length === 0;
    }

    function runRefresh() {
        if (new Date().getHours() < START_HOUR) return;

        if (hasError() && !refreshTriggered) {
            refreshTriggered = true;
            console.log('[异常刷新] 检测到错误，刷新页面');
            location.reload();
            setTimeout(() => { refreshTriggered = false; }, 1000);
            return;
        }

        if (isBlankPage() && !refreshTriggered && !blankTimer) {
            refreshTriggered = true;
            blankTimer = setTimeout(() => {
                console.log('[异常刷新] 白屏5秒，刷新页面');
                location.reload();
                refreshTriggered = false;
                blankTimer = null;
            }, 5000);
        }
    }

    // ====================== 抢任务（带0-3秒随机延迟）======================
    let taskTimer = null; // 用于控制延迟点击的计时器

    function runTask() {
        if (new Date().getHours() < START_HOUR) return;

        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();

        // 不在任务时间窗口内，取消可能等待的点击
        if (!TASK_HOURS.includes(h) || m < TASK_MIN_START || m > TASK_MIN_END) {
            if (taskTimer) {
                clearTimeout(taskTimer);
                taskTimer = null;
            }
            return;
        }

        // 如果已有任务（剩余时间），取消等待并跳过
        if (document.body.innerText.includes('剩余时间')) {
            if (taskTimer) {
                clearTimeout(taskTimer);
                taskTimer = null;
            }
            console.log('[抢任务] 已有任务，跳过');
            return;
        }

        const btn = getBtn();
        if (!btn) return;

        // 如果已经有等待的点击，不再重复设置
        if (taskTimer) return;

        const delay = Math.random() * 3000; // 0-3000毫秒
        console.log(`[抢任务] 将在 ${delay.toFixed(0)}ms 后点击按钮`);
        taskTimer = setTimeout(() => {
            btn.click();
            taskTimer = null;
        }, delay);
    }

    // ====================== 启动主循环 ======================
    function start() {
        console.log('[全能助手] 脚本启动');
        startAutoLogin();
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