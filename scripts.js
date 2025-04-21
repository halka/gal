// 気象庁震度階級の色設定
const jmaColors = {
    7: { bg: '#7d007d', text: 'white' },
    6.5: { bg: '#d70035', text: 'white' },
    6: { bg: '#ff0000', text: 'white' },
    5.5: { bg: '#ff6600', text: 'black' },
    5: { bg: '#ffff00', text: 'black' },
    4: { bg: '#fef4c0', text: 'black' },
    3: { bg: '#0068b7', text: 'white' },
    2: { bg: '#00a3e0', text: 'black' },
    1: { bg: '#ffffff', text: 'black' },
    0: { bg: '#f0f0f0', text: 'black' }
};

let ws = null;
let shindoChart, accelChartX, accelChartY, accelChartZ;
const maxAccelPoints = 100;
const maxShindoPoints = 30;

// 年月日＋時刻表示を汎用化
function updateDateTime(dateTimeElement = null) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    const timeString = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    if (dateTimeElement) {
        const dateElement = document.getElementById(dateTimeElement);
        if (dateElement) dateElement.textContent = `${dateString} ${timeString}`;
    }

    // 現在時刻を返す（震度グラフ用）
    return `${dateString} ${timeString}`;
}

// ページ読み込み時に時刻を更新
setInterval(() => updateDateTime('currentDateTime', null), 1000);

// WebSocket接続
function connectWebSocket() {
    if (ws) ws.close();
    ws = new WebSocket(document.getElementById('wsUrl').value);

    ws.onopen = () => {
        console.log('WebSocket connected');
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.textContent = 'Disconnect';
        connectBtn.style.background = '#ff0000';
        connectBtn.onclick = () => ws.close();
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.textContent = 'Connect';
        connectBtn.style.background = '#23c32b';
        connectBtn.onclick = connectWebSocket;
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('WebSocket接続に失敗しました。URLを確認してください。');
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.textContent = 'Connect';
        connectBtn.style.background = '#23c32b';
        connectBtn.onclick = connectWebSocket;
    };

    ws.onmessage = handleMessage;
}

// データ受信処理
function handleMessage(event) {
    const line = event.data.split('*')[0];
    const parts = line.split(',');

    if (parts[0] === '$XSACC' && parts.length >= 4) {
        const [x, y, z] = parts.slice(1, 4).map(Number);
        updateAccelChart(x, y, z);

        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
                                  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

        document.getElementById('accelDateTime').textContent = formattedDateTime;
        document.getElementById('accelX').textContent = x.toFixed(3);
        document.getElementById('accelY').textContent = y.toFixed(3);
        document.getElementById('accelZ').textContent = z.toFixed(3);

        const accelComposite = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
        document.getElementById('accelComposite').textContent = accelComposite.toFixed(3);
        document.getElementById('accelCompositeCalc').textContent = accelComposite.toFixed(3);
    }

    if (parts[0] === '$XSINT' && parts.length >= 3) {
        const shindo = parseFloat(parts[2]);
        updateCurrentShindoHeader(shindo);
        updateShindoChart(shindo);
        updateCurrentShindoJMA(shindo);
    }
}

// 震度階級の色を取得
function getJmaColor(shindo) {
    const colorKey = Object.keys(jmaColors).map(Number).sort((a, b) => b - a).find(k => shindo >= k);
    return jmaColors[colorKey] || jmaColors[0];
}

// ヘッダーに震度を表示
function updateCurrentShindoHeader(shindo) {
    const color = getJmaColor(shindo);
    const el = document.getElementById('current-shindo');
    el.textContent = `${shindo.toFixed(2)}`;
    el.style.backgroundColor = color.bg;
    el.style.color = color.text;
    el.style.borderColor = color.bg;
}

// 震度階級を更新
function updateCurrentShindoJMA(shindo) {
    let jmaShindo;
    if (shindo >= 6.5) jmaShindo = '7';
    else if (shindo >= 6.0) jmaShindo = '6強';
    else if (shindo >= 5.5) jmaShindo = '6弱';
    else if (shindo >= 5.0) jmaShindo = '5強';
    else if (shindo >= 4.5) jmaShindo = '5弱';
    else if (shindo >= 3.5) jmaShindo = '4';
    else if (shindo >= 2.5) jmaShindo = '3';
    else if (shindo >= 1.5) jmaShindo = '2';
    else if (shindo >= 0.5) jmaShindo = '1';
    else jmaShindo = '0';

    const color = getJmaColor(shindo);
    const el = document.getElementById('current-shindo-jma');
    el.textContent = jmaShindo;
    el.style.backgroundColor = color.bg;
    el.style.color = color.text;
    el.style.borderColor = color.bg;
}

// 加速度グラフを更新
function updateAccelChart(x, y, z) {
    if (!accelChartX) accelChartX = createAccelChart('accelChartX', 'X', '#FF0000');
    if (!accelChartY) accelChartY = createAccelChart('accelChartY', 'Y', '#0000FF');
    if (!accelChartZ) accelChartZ = createAccelChart('accelChartZ', 'Z', '#008044');

    updateChartData(accelChartX, x);
    updateChartData(accelChartY, y);
    updateChartData(accelChartZ, z);
}

// 加速度グラフを作成
function createAccelChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ label, borderColor: color, data: [], fill: false, tension: 0.2, pointRadius: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: true } },
            scales: {
                x: { display: false },
                y: { title: { display: true, text: `加速度 ${label}` } }
            }
        }
    });
}

// グラフデータを更新
function updateChartData(chart, value) {
    chart.data.labels.push('');
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > maxAccelPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update('none');
}

// 震度グラフを更新
function updateShindoChart(shindo) {
    if (!shindoChart) {
        const ctx = document.getElementById('shindoChart').getContext('2d');
        shindoChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{ label: '計測震度', data: [], backgroundColor: [] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: {display: false }},
                    y: { title: { display: true, text: '計測震度'} }
                }
            }
        });
    }

    shindoChart.data.labels.push(updateDateTime(null, null));
    shindoChart.data.datasets[0].data.push(shindo);

    const color = getJmaColor(shindo);
    shindoChart.data.datasets[0].backgroundColor.push(color.bg);

    if (shindoChart.data.labels.length > maxShindoPoints) {
        shindoChart.data.labels.shift();
        shindoChart.data.datasets[0].data.shift();
        shindoChart.data.datasets[0].backgroundColor.shift();
    }

    shindoChart.update('none');
}

// ページ読み込み時にWebSocket接続を初期化
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectBtn').textContent = 'Connect';
    document.getElementById('connectBtn').style.background = '#23c32b';
    document.getElementById('connectBtn').onclick = connectWebSocket;
    connectWebSocket();
});