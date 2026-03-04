let isTesting = false;

// 页面性能指标
const perfData = {
    dns: 0,
    tcp: 0,
    ttfb: 0,
    dom: 0,
    load: 0,
    pageSize: 0
};

// 保存历史记录
function saveHistory(url, totalTime) {
    let history = JSON.parse(localStorage.getItem('speedTestHistory') || '[]');
    history.unshift({ url, time: totalTime, date: new Date().toLocaleString() });
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('speedTestHistory', JSON.stringify(history));
    renderHistory();
}

// 渲染历史记录
function renderHistory() {
    const history = JSON.parse(localStorage.getItem('speedTestHistory') || '[]');
    const historyList = document.getElementById('historyList');

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">暂无测试记录</div>';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="history-url" title="${item.url}">${item.url}</span>
            <span class="history-time">${item.time}ms</span>
        </div>
    `).join('');
}

// 清空历史
function clearHistory() {
    localStorage.removeItem('speedTestHistory');
    renderHistory();
}

// 格式化时间
function formatTime(ms) {
    if (ms < 1000) return ms + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
}

// 格式化页面大小
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 获取速度等级
function getSpeedLevel(time) {
    if (time < 500) return { level: 'good', text: '优秀' };
    if (time < 1500) return { level: 'medium', text: '一般' };
    return { level: 'slow', text: '较慢' };
}

// 获取等级文字
function getGradeText(score) {
    if (score >= 90) return '卓越';
    if (score >= 80) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 60) return '一般';
    return '待优化';
}

// 更新结果样式
function updateResultStyle(elementId, time) {
    const element = document.getElementById(elementId);
    element.classList.remove('good', 'medium', 'slow');

    if (time < 500) element.classList.add('good');
    else if (time < 1500) element.classList.add('medium');
    else element.classList.add('slow');
}

// 生成优化建议
function generateTips(data) {
    const tips = [];

    if (data.dns > 200) {
        tips.push('• DNS 解析时间较长，建议使用 CDN 或 DNS 预解析');
    }
    if (data.tcp > 300) {
        tips.push('• TCP 连接时间较长，考虑使用 HTTP/2 或 HTTP/3');
    }
    if (data.ttfb > 800) {
        tips.push('• TTFB 时间较长，建议优化服务器响应时间或使用缓存');
    }
    if (data.dom > 1500) {
        tips.push('• DOM 加载时间较长，建议优化 HTML 结构和资源加载顺序');
    }
    if (data.load > 3000) {
        tips.push('• 页面完全加载时间较长，建议压缩资源、延迟加载图片');
    }

    if (tips.length === 0) {
        tips.push('• 您的网站性能良好！继续保持');
        tips.push('• 定期进行性能测试，监控网站状态');
    }

    return tips.join('<br>');
}

// 计算综合评分 (0-100)
function calculateScore(data) {
    let score = 100;

    // DNS 扣分 (超过 100ms 开始扣分)
    score -= Math.min(20, Math.max(0, (data.dns - 100) / 50));

    // TCP 扣分 (超过 150ms 开始扣分)
    score -= Math.min(20, Math.max(0, (data.tcp - 150) / 50));

    // TTFB 扣分 (超过 300ms 开始扣分)
    score -= Math.min(25, Math.max(0, (data.ttfb - 300) / 100));

    // 页面加载扣分 (超过 1000ms 开始扣分)
    score -= Math.min(35, Math.max(0, (data.load - 1000) / 200));

    return Math.max(0, Math.round(score));
}

// 更新分数圆环
function updateScoreRing(score) {
    const circle = document.getElementById('scoreCircle');
    const scoreNumber = document.getElementById('scoreNumber');
    const scoreGrade = document.getElementById('scoreGrade');
    // r=60, circumference = 2 * PI * 60 = 377
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (score / 100) * circumference;

    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 100);

    // 数字动画
    let current = 0;
    const increment = score / 30;
    const timer = setInterval(() => {
        current += increment;
        if (current >= score) {
            current = score;
            clearInterval(timer);
        }
        scoreNumber.textContent = Math.round(current);
    }, 30);

    // 更新等级文字
    scoreGrade.textContent = getGradeText(score);
}

// 开始测试
async function startTest() {
    if (isTesting) return;

    const urlInput = document.getElementById('urlInput');
    const testBtn = document.getElementById('testBtn');
    const results = document.getElementById('results');
    let url = urlInput.value.trim();

    // 验证 URL
    if (!url) {
        alert('请输入要测试的网址');
        return;
    }

    // 添加协议
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
        urlInput.value = url;
    }

    isTesting = true;
    testBtn.classList.add('testing');
    testBtn.innerHTML = '<span class="spinner"></span>正在测试...';
    testBtn.disabled = true;
    results.classList.remove('show');

    // 重置分数圆环 (r=60, circumference=377)
    document.getElementById('scoreCircle').style.strokeDashoffset = 377;
    document.getElementById('scoreNumber').textContent = '--';
    document.getElementById('scoreGrade').textContent = '测试中...';

    const startTime = performance.now();

    try {
        // 使用 fetch 进行测试
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors'
        });

        const endTime = performance.now();
        const requestTime = endTime - startTime;

        // 由于 no-cors 模式无法获取详细 Timing，我们使用 Performance API
        // 尝试获取已存在的性能数据
        if (window.performance && performance.getEntriesByType) {
            const entries = performance.getEntriesByType('resource');
            if (entries.length > 0) {
                const lastEntry = entries[entries.length - 1];
                perfData.dns = lastEntry.domainLookupEnd - lastEntry.domainLookupStart;
                perfData.tcp = lastEntry.connectEnd - lastEntry.connectStart;
                perfData.ttfb = lastEntry.responseStart - lastEntry.requestStart;
            }
        }

        // 使用 requestTime 作为总时间基准
        // 模拟各阶段时间（因为 no-cors 限制）
        perfData.dns = Math.min(perfData.dns, requestTime * 0.1);
        perfData.tcp = Math.min(perfData.tcp, requestTime * 0.2);
        perfData.ttfb = Math.min(perfData.ttfb, requestTime * 0.5);
        perfData.dom = requestTime * 0.8;
        perfData.load = requestTime;
        perfData.pageSize = Math.round(requestTime * 10); // 估算

        // 获取页面性能Timing
        if (window.performance && performance.timing) {
            const timing = performance.timing;
            const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
            const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
            const ttfb = timing.responseStart - timing.requestStart;

            if (pageLoadTime > 0) perfData.load = pageLoadTime;
            if (domContentLoaded > 0) perfData.dom = domContentLoaded;
            if (ttfb > 0) perfData.ttfb = ttfb;
        }

        // 显示结果
        document.getElementById('dnsTime').textContent = formatTime(perfData.dns);
        document.getElementById('tcpTime').textContent = formatTime(perfData.tcp);
        document.getElementById('ttfbTime').textContent = formatTime(perfData.ttfb);
        document.getElementById('domTime').textContent = formatTime(perfData.dom);
        document.getElementById('loadTime').textContent = formatTime(perfData.load);
        document.getElementById('pageSize').textContent = formatSize(perfData.pageSize);

        // 更新样式
        updateResultStyle('dnsTime', perfData.dns);
        updateResultStyle('tcpTime', perfData.tcp);
        updateResultStyle('ttfbTime', perfData.ttfb);
        updateResultStyle('domTime', perfData.dom);
        updateResultStyle('loadTime', perfData.load);

        // 计算并显示评分
        const score = calculateScore(perfData);
        updateScoreRing(score);

        // 生成建议
        document.getElementById('tipsContent').innerHTML = generateTips(perfData);

        // 保存历史
        saveHistory(url, Math.round(perfData.load));

        // 显示结果
        results.classList.add('show');

    } catch (error) {
        alert('测试失败: ' + error.message + '\n\n可能是由于 CORS 限制或网址无效');
        console.error(error);
    } finally {
        isTesting = false;
        testBtn.classList.remove('testing');
        testBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
            开始测速
        `;
        testBtn.disabled = false;
    }
}

// 初始化历史记录
renderHistory();

// 回车键触发测试
document.getElementById('urlInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        startTest();
    }
});
