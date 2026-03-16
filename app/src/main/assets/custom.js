window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});(function(){
    'use strict';

    // ====================== 你最终确定的配置 ======================
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

    // ====================== 强制禁止缓存 ======================
    (function disableCache() {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Cache-Control';
        meta.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(meta);

        const m2 = document.createElement('meta');
        m2.httpEquiv = 'Pragma';
        m2.content = 'no-cache';
        document.head.appendChild(m2);

        const m3 = document.createElement('meta');
        m3.httpEquiv = 'Expires';
        m3.content = '0';
        document.head.appendChild(m3);
    })();

    // ====================== 记住密码 + 自动填充 ======================
    const AuthStorage = {
        KEY_USER: "saved_username",
        KEY_PWD: "saved_password",
        save(u,p) { if(u&&p) localStorage.setItem(this.KEY_USER,u); localStorage.setItem(this.KEY_PWD,p); },
        load() { return { u:localStorage.getItem(this.KEY_USER)||"", p:localStorage.getItem(this.KEY_PWD)||"" }; }
    };

    function autoFillAuth() {
        const { u,p } = AuthStorage.load();
        if(!u||!p) return;
        const userInput = document.querySelector('input[type="text"],input[placeholder*="账号"],input[placeholder*="用户名"]');
        const pwdInput = document.querySelector('input[type="password"],input[placeholder*="密码"]');
        if(userInput&&pwdInput&&!userInput.value&&!pwdInput.value){
            userInput.value = u;
            pwdInput.value = p;
            userInput.dispatchEvent(new Event('input',{bubbles:true}));
            pwdInput.dispatchEvent(new Event('input',{bubbles:true}));
        }
    }

    function watchSaveAuth() {
        const userInput = document.querySelector('input[type="text"],input[placeholder*="账号"],input[placeholder*="用户名"]');
        const pwdInput = document.querySelector('input[type="password"],input[placeholder*="密码"]');
        if(userInput&&pwdInput){
            function save(){ AuthStorage.save(userInput.value.trim(),pwdInput.value.trim()); }
            userInput.addEventListener('input',save);
            pwdInput.addEventListener('input',save);
        }
    }

    // ====================== 时间判断 ======================
    function isWorkTime(){
        return new Date().getHours() >= START_HOUR;
    }

    function is10ClickTime(){
        const now = new Date();
        return now.getHours()===10 && now.getMinutes()>=0 && now.getMinutes()<=CLICK_END_MINUTE;
    }

    function is11UpClickTime(){
        const now = new Date();
        return now.getHours()>=11 && now.getMinutes()>=0 && now.getMinutes()<=CLICK_END_MINUTE;
    }

    // ====================== 异常判断 ======================
    function isCodeError(){
        const t = (document.body.innerText+document.title).toLowerCase();
        const keys = ['502','503','504','500','404','网关超时','错误网关','服务不可用','服务器错误','响应码异常','页面不存在'];
        return keys.some(k=>t.includes(k));
    }

    function isBlank(){
        const t = (document.body.innerText||'').trim().replace(/\s+/g,'');
        return t.length === 0;
    }

    // ====================== 按钮 ======================
    function getBtn(){
        return Array.from(document.querySelectorAll('*')).find(el=>
            el.textContent?.trim()===BTN_TEXT && el.offsetParent
        );
    }

    // ====================== 异常刷新（防狂刷） ======================
    function runRefresh(){
        if(!isWorkTime()) return;

        // 响应码异常 → 秒刷新，只刷1次
        if(isCodeError() && !refreshTriggered){
            refreshTriggered = true;
            location.reload(true);
            setTimeout(()=>{ refreshTriggered = false; }, 1000);
            return;
        }

        // 白屏 → 5秒刷新
        if(isBlank() && !refreshTriggered && !blankTimer){
            refreshTriggered = true;
            blankTimer = setTimeout(()=>{
                location.reload(true);
                refreshTriggered = false;
                blankTimer = null;
            },5000);
        }
    }

    // ====================== 抢任务核心 ======================
    function runTask(){
        if(!isWorkTime()) return;

        const now = new Date();
        const m = now.getMinutes();
        if(m === 0){
            taskStopped = false;
            firstClick = true;
        }

        // ---------- 10点场：出现拉取完毕就停 ----------
        if(is10ClickTime()){
            if(taskStopped) return;
            if(document.body.innerText.includes(FINISH_TEXT)){
                taskStopped = true;
                return;
            }
        }

        // 不在可点击时间直接退出
        if(!is10ClickTime() && !is11UpClickTime()) return;
        if(isWaiting) return;

        const btn = getBtn();
        if(!btn) return;

        // 首次秒点
        if(firstClick){
            try{ btn.click(); }catch(e){}
            firstClick = false;
            return;
        }

        // 随机 0~2秒
        isWaiting = true;
        const delay = Math.random()*2000;
        setTimeout(()=>{
            try{ getBtn()?.click(); }catch(e){}
            isWaiting = false;
        },delay);
    }

    // ====================== 启动（适配封装APP） ======================
    function start(){
        autoFillAuth();
        watchSaveAuth();
        runTask();
        runRefresh();
        setInterval(()=>{ runTask(); runRefresh(); }, 300);
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', start);
    }else{
        start();
    }
})();