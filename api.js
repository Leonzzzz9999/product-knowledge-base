// 飞书 API 配置
const FEISHU_CONFIG = {
    APP_TOKEN: 'D9Jxbdac9aFAb8sYdC1cmWFrn9g',  // 多维表格 App Token
    TABLE_ID: 'tbl9PM8TNSLTHSIJ',               // 数据表 ID
};

// 获取飞书 Access Token（需要配置）
let ACCESS_TOKEN = '';

// 模拟数据（当没有 API Token 时使用）
const MOCK_DATA = [
    { model: 'PRO-001', category: '类别A', image: 'https://via.placeholder.com/200x200?text=PRO-001' },
    { model: 'PRO-002', category: '类别B', image: 'https://via.placeholder.com/200x200?text=PRO-002' },
    { model: 'PRO-003', category: '类别C', image: 'https://via.placeholder.com/200x200?text=PRO-003' },
];

// 获取飞书 Access Token
async function getFeishuToken() {
    // 这里需要配置你的飞书应用凭证
    // 方式1: 使用环境变量（部署到 Vercel 时配置）
    // 方式2: 使用后端代理（更安全）
    
    // 临时使用模拟数据
    return null;
}

// 从飞书获取产品数据
async function fetchProducts() {
    // 优先使用 ACCESS_TOKEN 调用真实 API
    if (ACCESS_TOKEN) {
        try {
            const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`, {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                }
            });
            const data = await response.json();
            if (data.code === 0) {
                return data.data.items.map(item => ({
                    model: item.fields['产品型号'] || '',
                    category: item.fields['产品类别']?.name || '',
                    image: item.fields['产品图片']?.[0]?.url || '',
                    recordId: item.record_id
                }));
            }
        } catch (error) {
            console.error('飞书 API 调用失败:', error);
        }
    }
    
    // 使用模拟数据
    return MOCK_DATA;
}

// 按型号查询
async function searchByModel() {
    const model = document.getElementById('modelInput').value.trim();
    if (!model) {
        alert('请输入产品型号');
        return;
    }

    const resultDiv = document.getElementById('searchResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>查询中...</div>';
    resultDiv.classList.add('show');

    try {
        const products = await fetchProducts();
        const product = products.find(p => 
            p.model && p.model.toLowerCase().includes(model.toLowerCase())
        );

        if (product && product.image) {
            resultDiv.innerHTML = `
                <div class="result-item">
                    <img src="${product.image}" alt="${product.model}" class="result-image" onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'">
                    <div class="result-info">
                        <h3>📦 ${product.model}</h3>
                        <p><strong>产品型号：</strong>${product.model}</p>
                        <p><strong>产品类别：</strong><span class="category">${product.category}</span></p>
                        <p style="margin-top: 10px; color: #999; font-size: 12px;">⚠️ 使用模拟数据，请配置飞书 API</p>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="no-result">
                    <p>❌ 未找到型号为 "${model}" 的产品</p>
                    <p style="margin-top: 10px;">请检查型号是否正确。</p>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="no-result">查询失败：${error.message}</div>`;
    }
}

// 按图片查询（预留接口）
async function searchByImage() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) {
        alert('请先上传图片');
        return;
    }
    
    const resultDiv = document.getElementById('uploadResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>AI 识别中...</div>';
    resultDiv.classList.add('show');

    // 图片识别功能需要配置 AI API
    setTimeout(() => {
        resultDiv.innerHTML = `
            <div class="no-result">
                <p>🔧 图片识别功能正在配置中</p>
                <p style="margin-top: 10px;">请联系管理员开通 AI 图像识别功能。</p>
            </div>
        `;
    }, 1500);
}

// 切换标签
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    if (tab === 'search') {
        document.querySelectorAll('.tab')[0].classList.add('active');
        document.getElementById('searchTab').classList.add('active');
    } else {
        document.querySelectorAll('.tab')[1].classList.add('active');
        document.getElementById('uploadTab').classList.add('active');
    }
}

// 文件上传预览
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        showPreview(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        showPreview(e.target.files[0]);
    }
});

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadArea.innerHTML = `
            <img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
            <div class="upload-text" style="margin-top: 10px;">${file.name}</div>
        `;
        uploadBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 回车键搜索
document.getElementById('modelInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchByModel();
    }
});
