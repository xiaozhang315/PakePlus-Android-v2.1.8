window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         抢任务+异常刷新+自动登录（针对business_city优化版）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  每小时0-3分抢任务，异常自动刷新，记住密码自动登录，白屏检测优化（适配登录页）
// @author       豆包
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * ===================== 可配置项（请根据实际网页调整）=====================
     */
    const CONFIG = {
        // 目标网站域名（留空则不限制）
        matchDomain: 'y03owzrr2dnub.com',

        // 异常刷新开始小时（10点至24点）
        startHour: 10,

        // 抢任务的小时列表（例如 [11,12,13] 表示11-13点）
        taskHours: [11],

        // 抢任务分钟区间（默认每小时0~3分）
        taskMinuteStart: 0,
        taskMinuteEnd: 3,

        // ===== 自动登录相关（必须正确填写选择器）=====
        enableAutoLogin: true,                     // 是否启用自动登录

        // 用户名输入框选择器（根据页面实际情况修改）
        // 当前页面可能是 <input type="text">，如果页面有更具体的 id 或 name，请替换
        usernameSelector: 'input[type="text"]',

        // 密码输入框选择器（通常就是 type="password"）
        passwordSelector: 'input[type="password"]',

        // 登录按钮选择器（可能是 button 或 input，根据实际修改）
        loginButtonSelector: 'button[type="submit"], input[type="submit"]',

        // 填充后是否自动点击登录按钮
        autoSubmitAfterFill: true,

        // 登录后出现的元素选择器（用于避免重复填充，例如用户头像、欢迎语等）
        // 如果不知道，可以先留空，脚本会通过检测登录表单是否存在来自动判断
        loggedInSelector: '',

        // ===== 白屏检测核心容器（默认 body，配合登录表单检测使用）=====
        mainContainerSelector: 'body',

        // 是否在控制台输出日志（调试用，上线后可改为 false）
        debug: true
    };

    // ===================== 核心逻辑 =====================
    class AutoTaskManager {
        constructor(options) {
            this.options = Object.assign({
                matchDomain: '',
                startHour: 10,
                taskHours: [11],
                taskMinuteStart: 0,
                taskMinuteEnd: 3,
                enableAutoLogin: false,
                usernameSelector: '',
                passwordSelector: '',
                loginButtonSelector: '',
                autoSubmitAfterFill: false,
                loggedInSelector: '',
                mainContainerSelector: 'body',
                debug: false
            }, options);

            // 状态变量
            this.isWaiting = false;
            this.firstClickDone = false;
            this.taskStopped = false;
            this.refreshTriggered = false;
            this.isClicking = false;
            this.lastCheckHour = -1;
            this.loginFilled = false;
            this._loginListenerAttached = false;

            // 错误关键词（包含“响应码异常”）
            this.errorKeywords = [
                '504', 'gateway timeout', '网关超时',
                '404', 'not found', '页面不存在',
                '502', 'bad gateway', '错误网关',
                '503', 'service unavailable', '服务不可用',
                '500', 'internal server error', '服务器错误',
                '响应码异常'
            ];

            this.start();
        }

        log(...args) {
            if (this.options.debug) {
                console.log('[AutoTask]', ...args);
            }
        }

        // 域名匹配检查
        isDomainMatch() {
            if (!this.options.matchDomain) return true;
            return window.location.hostname.includes(this.options.matchDomain);
        }

        // 异常刷新生效时间（10点至24点）
        isWorkTime() {
            const h = new Date().getHours();
            return h >= this.options.startHour;
        }

        // 抢任务时间（每小时指定分钟区间）
        isTaskTime() {
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            if (!this.options.taskHours.includes(h)) return false;
            return m >= this.options.taskMinuteStart && m <= this.options.taskMinuteEnd;
        }

        // 检测是否已有任务（包含“剩余时间”）
        hasTaskRunning() {
            return document.body?.textContent?.includes('剩余时间') || false;
        }

        // 获取“重新获取任务”按钮（可见的）
        getTaskButton() {
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
                if (el.textContent?.trim() === '重新获取任务' && el.offsetParent !== null) {
                    return el;
                }
            }
            return null;
        }

        // ========== 优化后的白屏检测（针对登录页） ==========
        isBlankPage() {
            // 等待页面完全加载
            if (document.readyState !== 'complete') return false;

            // 检查登录表单的关键元素是否存在（用户名或密码输入框）
            const hasLoginInput = document.querySelector('input[type="text"], input[type="password"], input[name="username"]') !== null;

            // 如果存在登录输入框，说明页面正常，不是白屏
            if (hasLoginInput) return false;

            // 如果连登录输入框都没有，再检查 body 是否真的没有内容
            const bodyText = document.body?.innerText?.trim() || '';
            const bodyChildren = document.body?.children.length || 0;

            // body 既没有文本也没有子元素，极可能是白屏
            return bodyText.length === 0 && bodyChildren === 0;
        }

        // 错误文本检测
        hasErrorText() {
            const text = (document.body?.innerText || '') + document.title;
            const lowerText = text.toLowerCase();
            return this.errorKeywords.some(keyword => 
                lowerText.includes(keyword.toLowerCase())
            );
        }

        // 是否需要点击（有“重新获取任务”且无“拉取完毕”）
        needClick() {
            const text = document.body?.innerText || '';
            return text.includes('重新获取任务') && !text.includes('拉取完毕');
        }

        // 执行点击（带随机延迟）
        performClick() {
            if (!this.isTaskTime()) {
                this.log('不在任务时间，不点击');
                return;
            }
            if (this.isClicking) return;
            const btn = this.getTaskButton();
            if (!btn) return;

            this.isClicking = true;
            const delay = Math.random() * 2000; // 0-2秒随机
            this.log(`将在 ${delay.toFixed(0)}ms 后点击按钮`);
            setTimeout(() => {
                try {
                    btn.click();
                    this.log('按钮点击成功');
                } catch (e) {
                    this.log('按钮点击失败', e);
                }
                setTimeout(() => { this.isClicking = false; }, 500);
            }, delay);
        }

        // 刷新页面（防抖）
        refreshPage() {
            if (this.refreshTriggered) return;
            this.refreshTriggered = true;
            this.log('触发页面刷新');
            location.reload();
            setTimeout(() => { this.refreshTriggered = false; }, 500);
        }

        // ========== 自动登录相关 ==========
        saveCredentials(username, password) {
            try {
                localStorage.setItem('auto_task_credentials', JSON.stringify({ username, password }));
                this.log('凭据已保存');
            } catch (e) {
                this.log('保存凭据失败', e);
            }
        }

        loadCredentials() {
            try {
                const data = localStorage.getItem('auto_task_credentials');
                return data ? JSON.parse(data) : null;
            } catch (e) {
                this.log('读取凭据失败', e);
                return null;
            }
        }

        // 判断是否已登录（优先使用用户指定的选择器，否则通过登录表单是否存在反向判断）
        isLoggedIn() {
            if (this.options.loggedInSelector) {
                return document.querySelector(this.options.loggedInSelector) !== null;
            }
            // 如果没有指定 loggedInSelector，则检查登录表单是否存在
            // 如果登录表单不存在，可能已登录（进入了其他页面）
            const hasLoginForm = document.querySelector(this.options.usernameSelector) !== null &&
                                 document.querySelector(this.options.passwordSelector) !== null;
            return !hasLoginForm;
        }

        fillLoginForm() {
            if (!this.options.enableAutoLogin) return;
            if (this.loginFilled) return;
            if (this.isLoggedIn()) {
                this.log('已检测到登录状态，跳过填充');
                return;
            }

            const usernameInput = this.options.usernameSelector ? document.querySelector(this.options.usernameSelector) : null;
            const passwordInput = this.options.passwordSelector ? document.querySelector(this.options.passwordSelector) : null;

            if (!usernameInput || !passwordInput) return;

            const creds = this.loadCredentials();
            if (!creds) {
                this.log('无保存的凭据，请手动登录一次以保存');
                return;
            }

            usernameInput.value = creds.username;
            passwordInput.value = creds.password;
            // 触发输入事件，让框架感知变化
            ['input', 'change'].forEach(eventType => {
                usernameInput.dispatchEvent(new Event(eventType, { bubbles: true }));
                passwordInput.dispatchEvent(new Event(eventType, { bubbles: true }));
            });

            this.loginFilled = true;
            this.log('已填充登录表单');

            if (this.options.autoSubmitAfterFill && this.options.loginButtonSelector) {
                const loginBtn = document.querySelector(this.options.loginButtonSelector);
                if (loginBtn) {
                    setTimeout(() => {
                        loginBtn.click();
                        this.log('自动点击登录按钮');
                    }, 500);
                }
            }
        }

        listenForLogin() {
            if (!this.options.enableAutoLogin) return;

            // 监听表单提交
            const form = document.querySelector('form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    const usernameInput = document.querySelector(this.options.usernameSelector);
                    const passwordInput = document.querySelector(this.options.passwordSelector);
                    if (usernameInput && passwordInput) {
                        const username = usernameInput.value;
                        const password = passwordInput.value;
                        if (username && password) {
                            this.saveCredentials(username, password);
                        }
                    }
                });
            }

            // 同时监听登录按钮点击（某些网站不是通过表单提交）
            if (this.options.loginButtonSelector) {
                const btn = document.querySelector(this.options.loginButtonSelector);
                if (btn) {
                    btn.addEventListener('click', () => {
                        const usernameInput = document.querySelector(this.options.usernameSelector);
                        const passwordInput = document.querySelector(this.options.passwordSelector);
                        if (usernameInput && passwordInput) {
                            const username = usernameInput.value;
                            const password = passwordInput.value;
                            if (username && password) {
                                this.saveCredentials(username, password);
                            }
                        }
                    });
                }
            }
        }

        initAutoLogin() {
            if (!this.options.enableAutoLogin) return;
            this.fillLoginForm();
            if (!this._loginListenerAttached) {
                this.listenForLogin();
                this._loginListenerAttached = true;
            }
        }

        // ========== 任务轮询 ==========
        runTask() {
            if (!this.isDomainMatch()) return;
            if (!this.isTaskTime()) {
                const currentHour = new Date().getHours();
                if (this.lastCheckHour !== currentHour) {
                    this.firstClickDone = false;
                    this.lastCheckHour = currentHour;
                }
                return;
            }

            const currentMinute = new Date().getMinutes();
            if (currentMinute === this.options.taskMinuteStart) {
                this.taskStopped = false;
            }
            if (this.taskStopped) return;
            if (this.hasTaskRunning()) {
                this.log('检测到已有任务，本小时停止抢任务');
                this.taskStopped = true;
                return;
            }
            if (this.isWaiting) return;

            const btn = this.getTaskButton();
            if (!btn) return;

            if (!this.firstClickDone) {
                this.log('首次点击立即执行');
                try { btn.click(); } catch (e) {}
                this.firstClickDone = true;
                return;
            }

            this.isWaiting = true;
            const delay = Math.random() * 3000;
            setTimeout(() => {
                try {
                    const currentBtn = this.getTaskButton();
                    if (currentBtn) currentBtn.click();
                } catch (e) {}
                this.isWaiting = false;
            }, delay);
        }

        runRefresh() {
            if (!this.isDomainMatch()) return;
            if (!this.isWorkTime()) return;

            const isError = this.hasErrorText() || this.isBlankPage();
            if (isError) {
                this.log('检测到异常，准备刷新');
                this.refreshPage();
                return;
            }

            if (this.needClick()) {
                this.log('检测到可点击按钮，准备执行');
                this.performClick();
            }
        }

        start() {
            // 延迟自动登录，等待DOM渲染
            setTimeout(() => this.initAutoLogin(), 1000);

            // 启动轮询
            setInterval(() => this.runTask(), 300);
            setInterval(() => this.runRefresh(), 300);
            this.log('自动任务管理器已启动');
        }
    }

    // 实例化（等待DOM加载完成，避免操作过早）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new AutoTaskManager(CONFIG));
    } else {
        new AutoTaskManager(CONFIG);
    }
})();