window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         抢任务+异常刷新（PakePlus优化版）
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  每小时0-3分抢任务，异常自动刷新，支持WebView环境
// @author       豆包
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ========== 可配置项 ==========
    const CONFIG = {
        matchDomain: 'y03owzrr2dnub.com',   // 替换为你的域名
        startHour: 10,                       // 异常刷新生效小时
        taskHours: [11],                      // 抢任务小时列表
        taskMinuteStart: 0,                    // 抢任务开始分钟
        taskMinuteEnd: 3,                       // 抢任务结束分钟
        debug: true,                             // 是否显示浮动日志
    };

    // ========== 浮动日志面板 ==========
    let logPanel = null;
    function initLogPanel() {
        if (!CONFIG.debug) return;
        if (document.getElementById('auto-task-log')) return;
        const panel = document.createElement('div');
        panel.id = 'auto-task-log';
        panel.style.cssText = `
            position: fixed; top: 10px; right: 10px; width: 280px; max-height: 200px;
            overflow: auto; background: rgba(0,0,0,0.8); color: #0f0; font-size: 12px;
            z-index: 999999; padding: 8px; border-radius: 5px; font-family: monospace;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(panel);
        logPanel = panel;
    }
    function log(...args) {
        if (!CONFIG.debug) return;
        const msg = `[${new Date().toLocaleTimeString()}] ${args.join(' ')}`;
        console.log('[AutoTask]', ...args);
        if (logPanel) {
            const line = document.createElement('div');
            line.textContent = msg;
            logPanel.appendChild(line);
            logPanel.scrollTop = logPanel.scrollHeight;
        }
    }

    // ========== 状态变量 ==========
    let isWaiting = false;
    let firstClickDone = false;      // 每小时首次已点击
    let taskStopped = false;
    let refreshTriggered = false;
    let isClicking = false;
    let lastCheckHour = -1;

    // ========== 通用函数 ==========
    function isDomainMatch() {
        return window.location.hostname.includes(CONFIG.matchDomain);
    }

    function isTaskTime() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        return CONFIG.taskHours.includes(h) && m >= CONFIG.taskMinuteStart && m <= CONFIG.taskMinuteEnd;
    }

    function isWorkTime() {
        return new Date().getHours() >= CONFIG.startHour;
    }

    // 查找按钮（宽松匹配）
    function getBtn() {
        const elements = document.querySelectorAll('*');
        for (let el of elements) {
            // 合并连续空白，忽略大小写
            const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
            if (text.includes('重新获取任务') && el.offsetParent !== null) {
                return el;
            }
        }
        return null;
    }

    // 模拟真实点击
    function safeClick(el) {
        if (!el) return false;
        try {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            log('点击成功');
            return true;
        } catch (e) {
            log('点击失败', e);
            return false;
        }
    }

    // 检测是否已有任务
    function hasTaskRunning() {
        return document.body?.textContent?.includes('剩余时间') || false;
    }

    // 白屏检测（严格）
    function isBlankPage() {
        const html = document.documentElement.innerHTML;
        const textLen = document.body?.innerText?.trim().length || 0;
        return !html.includes('<div') && textLen < 10;
    }

    // 错误关键词检测
    function hasErrorText() {
        const text = (document.body?.innerText || '') + document.title;
        const lowerText = text.toLowerCase();
        const keys = ['504','网关超时','404','页面不存在','502','错误网关','503','服务不可用','500','服务器错误','响应码异常'];
        return keys.some(k => lowerText.includes(k));
    }

    // 是否需要条件点击（重新获取任务 且 未拉取完毕）
    function needConditionClick() {
        const text = document.body?.innerText || '';
        return text.includes('重新获取任务') && !text.includes('拉取完毕');
    }

    // ========== 抢任务轮询 ==========
    function runTask() {
        if (!isDomainMatch()) return;
        const now = new Date();
        const m = now.getMinutes();
        const h = now.getHours();

        // 每小时重置首次点击标志
        if (lastCheckHour !== h) {
            firstClickDone = false;
            lastCheckHour = h;
        }

        if (!isTaskTime()) return;

        // 每分钟0分重置 taskStopped（允许新小时抢任务）
        if (m === CONFIG.taskMinuteStart) {
            taskStopped = false;
        }
        if (taskStopped) return;

        // 如果已有任务，停止本小时
        if (hasTaskRunning()) {
            log('已有任务，本小时停止');
            taskStopped = true;
            return;
        }

        if (isWaiting) return;

        const btn = getBtn();
        if (!btn) {
            log('未找到按钮');
            return;
        }

        // 首次点击立即执行
        if (!firstClickDone) {
            log('首次点击立即执行');
            safeClick(btn);
            firstClickDone = true;
            return;
        }

        // 后续随机延迟
        isWaiting = true;
        const delay = Math.random() * 3000;
        log(`等待 ${delay.toFixed(0)}ms 后点击`);
        setTimeout(() => {
            const currentBtn = getBtn();
            if (currentBtn) {
                safeClick(currentBtn);
            }
            isWaiting = false;
        }, delay);
    }

    // ========== 异常刷新轮询 ==========
    function runRefresh() {
        if (!isDomainMatch()) return;
        if (!isWorkTime()) return;

        // 异常检测
        const isError = hasErrorText() || isBlankPage();

        if (isError && !refreshTriggered) {
            log('检测到异常，刷新页面');
            refreshTriggered = true;
            location.reload();
            setTimeout(() => { refreshTriggered = false; }, 500);
            return;
        }

        // 条件点击（仅在任务时间内允许）
        if (isTaskTime() && needConditionClick() && !isClicking) {
            const btn = getBtn();
            if (btn) {
                log('条件点击触发');
                isClicking = true;
                const delay = Math.random() * 2000;
                setTimeout(() => {
                    safeClick(btn);
                    setTimeout(() => { isClicking = false; }, 500);
                }, delay);
            }
        }
    }

    // ========== 启动 ==========
    function init() {
        if (!isDomainMatch()) return;
        initLogPanel();
        log('脚本启动');

        // 延迟2秒开始轮询，确保页面加载
        setTimeout(() => {
            setInterval(runTask, 300);
            setInterval(runRefresh, 500);
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();