window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
  const origin = e.target.closest('a')
  const isBaseTargetBlank = document.querySelector(
    'head base[target="_blank"]'
  )
  console.log("origin", origin, isBaseTargetBlank)
  if (
    (origin && origin.href && origin.target === '_blank') ||
    (origin && origin.href && isBaseTargetBlank)
  ) {
    e.preventDefault()
    console.log("handle origin", origin)
    location.href = origin.href
  } else {
    console.log("not handle origin", origin)
  }
}
document.addEventListener('click', hookClick)

// ====================== 记住密码+自动填充模块 ======================
const AuthStorage = {
  KEY_USER: 'saved_username',
  KEY_PWD: 'saved_password',
  
  save(username, password) {
    localStorage.setItem(this.KEY_USER, username);
    localStorage.setItem(this.KEY_PWD, password);
  },
  
  load() {
    return {
      username: localStorage.getItem(this.KEY_USER) || '',
      password: localStorage.getItem(this.KEY_PWD) || ''
    };
  },
  
  clear() {
    localStorage.removeItem(this.KEY_USER);
    localStorage.removeItem(this.KEY_PWD);
  }
};

function autoFillAuth() {
  const { username, password } = AuthStorage.load();
  if (!username || !password) return;

  const userInput = document.querySelector('input[placeholder*="用户名称"], input[type="text"]');
  const pwdInput = document.querySelector('input[placeholder*="密码"], input[type="password"]');

  if (userInput && pwdInput) {
    userInput.value = username;
    pwdInput.value = password;
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
    pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ 自动填充账号密码完成');
  }
}
window.addEventListener('load', autoFillAuth);

// ====================== 你的抢任务+白屏刷新脚本 ======================
(function() {
    'use strict';

    const CONFIG = {
        START_HOUR: 10,
        TASK_START_HOUR: 11,
        TASK_END_MINUTE: 4,
        WHITE_SCREEN_DELAY: 3000, // 3秒刷新
        CHECK_INTERVAL: 300,
        BTN_TEXT: '重新获取任务',
        FINISHED_TEXT: '拉取完毕'
    };

    let isWaiting = false;
    let firstClick = true;
    let taskStopped = false;
    let refreshTriggered = false;
    let whiteScreenTimer = null; // 控制白屏定时器，避免重复

    function isWorkTime() {
        return new Date().getHours() >= CONFIG.START_HOUR;
    }

    function isTaskTime() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        return h >= CONFIG.TASK_START_HOUR && m >= 0 && m <= CONFIG.TASK_END_MINUTE;
    }

    function getTaskButton() {
        return Array.from(document.querySelectorAll('*')).find(el => 
            el.textContent?.trim() === CONFIG.BTN_TEXT && el.offsetParent !== null
        );
    }

    function hasRunningTask() {
        return document.body.textContent.includes('剩余时间');
    }

    // ✅ 修复后的白屏检测：3秒刷新一次，不会循环
    function checkWhiteScreen() {
        if (!isWorkTime()) return;
        
        const text = (document.body.innerText || '').trim().replace(/\s+/g, '');
        // 只有页面文字极少（判定为白屏）时才执行
        if (text.length < 15) {
            // 没有定时器时才新建，避免重复
            if (!whiteScreenTimer) {
                whiteScreenTimer = setTimeout(() => {
                    location.reload(); // 3秒后刷新
                    whiteScreenTimer = null; // 刷新后重置，避免循环
                }, CONFIG.WHITE_SCREEN_DELAY);
            }
        } else {
            // 页面正常，清除定时器，不刷新
            if (whiteScreenTimer) {
                clearTimeout(whiteScreenTimer);
                whiteScreenTimer = null;
            }
        }
    }

    function checkPageError() {
        if (!isWorkTime()) return;
        const text = (document.body.innerText + document.title).toLowerCase();
        const errorKeywords = [
            '504', '网关超时', '404', '页面不存在',
            '502', '错误网关', '503', '服务不可用',
            '500', '服务器错误', '响应码异常'
        ];
        return errorKeywords.some(key => text.includes(key));
    }

    function runTask() {
        if (!isTaskTime() || taskStopped || isWaiting) return;

        if (hasRunningTask()) {
            taskStopped = true;
            return;
        }

        const btn = getTaskButton();
        if (!btn) return;

        if (firstClick) {
            try { btn.click(); } catch (e) {}
            firstClick = false;
            return;
        }

        isWaiting = true;
        const delay = Math.random() * 3000;
        setTimeout(() => {
            try { getTaskButton()?.click(); } catch (e) {}
            isWaiting = false;
        }, delay);
    }

    setInterval(() => {
        try {
            checkWhiteScreen(); // 白屏才3秒刷新，正常页面不刷新

            if (checkPageError() && !refreshTriggered) {
                refreshTriggered = true;
                location.reload(true);
                setTimeout(() => { refreshTriggered = false; }, 500);
                return;
            }

            if (isTaskTime()) {
                const text = document.body.innerText;
                if (text.includes(CONFIG.BTN_TEXT) && !text.includes(CONFIG.FINISHED_TEXT)) {
                    runTask();
                }
            }
        } catch (e) {
            console.error('脚本执行异常:', e);
        }
    }, CONFIG.CHECK_INTERVAL);

    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            firstClick = true;
            taskStopped = false;
        }
    }, 60000);
})();