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
let shindoChart;
const maxAccelPoints = 100;
const maxShindoPoints = 10;

// 年月日＋時刻表示
function updateDateTime() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    document.getElementById('date-string').textContent = `${y}-${m}-${d} `;
    document.getElementById('current-time').textContent =
        now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}
setInterval(updateDateTime, 1);
updateDateTime();

// WebSocket接続
function connectWebSocket() {
    if (ws) ws.close();
    ws = new WebSocket(document.getElementById('wsUrl').value);
    ws.onopen = () => {
        console.log('WebSocket connected');
        document.getElementById('connectBtn').textContent = 'Disconnect';
        document.getElementById('connectBtn').style.background = '#ff0000';
        document.getElementById('connectBtn').onclick = () => { ws.close(); };
    };
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        document.getElementById('connectBtn').textContent = 'Connect';
        document.getElementById('connectBtn').style.background = '#23c32b';
        document.getElementById('connectBtn').onclick = connectWebSocket;
    };
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        document.getElementById('connectBtn').textContent = 'Connect';
        document.getElementById('connectBtn').style.background = '#23c32b';
        document.getElementById('connectBtn').onclick = connectWebSocket;
    };
    ws.onmessage = handleMessage;
}

// その他の関数（updateAccelChart, updateShindoChart, etc.）はここに記述

// データ受信処理
function handleMessage(event) {
    const line = event.data.split('*')[0];
    const parts = line.split(',');

    if (parts[0] === '$XSACC' && parts.length >= 4) {
        const [x, y, z] = parts.slice(1, 4).map(Number);
        updateAccelChart(x, y, z);

        // 現在の日時を取得
        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ` +
                                  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

        // HTML要素に値を反映
        document.getElementById('accelDateTime').textContent = formattedDateTime;
        document.getElementById('accelX').textContent = x.toFixed(3);
        document.getElementById('accelY').textContent = y.toFixed(3);
        document.getElementById('accelZ').textContent = z.toFixed(3);

        const accelComposite = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
        const accelCompositeCalc = (accelComposite * 9.8).toFixed(3);
        document.getElementById('accelComposite').textContent = accelComposite.toFixed(3);
        document.getElementById('accelCompositeCalc').textContent = accelCompositeCalc;
    }

    if (parts[0] === '$XSINT' && parts.length >= 3) {
        const shindo = parseFloat(parts[2]);
        updateCurrentShindoHeader(shindo);
        updateShindoChart(shindo);
        updateCurrentShindoJMA(shindo);
    }
}

// ヘッダーに大きく現在震度を表示（気象庁色分け）
function updateCurrentShindoHeader(shindo) {
    const colorKey = Object.keys(jmaColors).map(Number).sort((a, b) => b - a).find(k => shindo >= k);
    const color = jmaColors[colorKey] || jmaColors[0];
    const el = document.getElementById('current-shindo');
    el.textContent = `${shindo.toFixed(2)}`;
    el.style.backgroundColor = color.bg;
    el.style.color = color.text;
    el.style.borderColor = color.bg;
}

function updateCurrentShindoJMA(shindo) {
    // 気象庁の震度階級に変換
    let jmaShindo;
    if (shindo >= 7) {
        jmaShindo = '7';
    } else if (shindo >= 6.5) {
        jmaShindo = '6強';
    } else if (shindo >= 6) {
        jmaShindo = '6弱';
    } else if (shindo >= 5.5) {
        jmaShindo = '5強';
    } else if (shindo >= 5) {
        jmaShindo = '5弱';
    } else if (shindo >= 4) {
        jmaShindo = '4';
    } else if (shindo >= 3) {
        jmaShindo = '3';
    } else if (shindo >= 2) {
        jmaShindo = '2';
    } else if (shindo >= 1) {
        jmaShindo = '1';
    } else {
        jmaShindo = '0';
    }

    // 色を取得
    const colorKey = Object.keys(jmaColors).map(Number).sort((a, b) => b - a).find(k => shindo >= k);
    const color = jmaColors[colorKey] || jmaColors[0];

    // 表示を更新
    const el = document.getElementById('current-shindo-jma');
    el.textContent = jmaShindo;
    el.style.backgroundColor = color.bg;
    el.style.color = color.text;
    el.style.borderColor = color.bg;
}

let accelChartX, accelChartY, accelChartZ;

function updateAccelChart(x, y, z) {
    if (!accelChartX) {
        const ctxX = document.getElementById('accelChartX').getContext('2d');
        accelChartX = createAccelChart(ctxX, 'X', '#FF0000');
    }
    if (!accelChartY) {
        const ctxY = document.getElementById('accelChartY').getContext('2d');
        accelChartY = createAccelChart(ctxY, 'Y', '#0000FF');
    }
    if (!accelChartZ) {
        const ctxZ = document.getElementById('accelChartZ').getContext('2d');
        accelChartZ = createAccelChart(ctxZ, 'Z', '#008044');
    }

    updateChartData(accelChartX, x);
    updateChartData(accelChartY, y);
    updateChartData(accelChartZ, z);
}

function createAccelChart(ctx, label, color) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: label, borderColor: color, data: [], fill: false, tension: 0.2, pointRadius: 0 }
            ]
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

function updateChartData(chart, value) {
    chart.data.labels.push('');
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > maxAccelPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update('none');
}
// 震度グラフ（リアルタイム、気象庁配色で線と点の色を変化）
function updateShindoChart(shindo) {
    // グラフが未初期化の場合、初期化
    if (!shindoChart) {
        const ctx = document.getElementById('shindoChart').getContext('2d');
        shindoChart = new Chart(ctx, {
            type: 'bar', // バーグラフ
            data: {
                labels: [], // 時間やインデックスをラベルとして使用
                datasets: [{
                    label: '震度',
                    data: [],
                    backgroundColor: [] // バーの色を指定
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false } // 凡例を非表示
                },
                scales: {
                    x: {
                        display: false, // X軸を非表示
                        title: { display: false }
                    },
                    y: {
                        // min: 0,
                        // max: 10, // 震度の範囲を設定
                        title: { display: true, text: '震度' }
                    }
                }
            }
        });
    }

    // データを更新
    shindoChart.data.labels.push(''); // ラベルは空（必要に応じて時間などを追加）
    shindoChart.data.datasets[0].data.push(shindo);

    // 震度に応じた色を取得して設定
    const colorKey = Object.keys(jmaColors).map(Number).sort((a, b) => b - a).find(k => shindo >= k);
    shindoChart.data.datasets[0].backgroundColor.push(jmaColors[colorKey]?.bg);

    // 最大ポイント数を超えた場合、古いデータを削除
    if (shindoChart.data.labels.length > maxShindoPoints) {
        shindoChart.data.labels.shift();
        shindoChart.data.datasets[0].data.shift();
        shindoChart.data.datasets[0].backgroundColor.shift();
    }

    // グラフを更新
    shindoChart.update('none');
}

document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket(); // ページ読み込み時にWebSocketに接続
});