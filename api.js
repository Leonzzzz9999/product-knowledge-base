// 飞书 API 配置
const FEISHU_CONFIG = {
    APP_TOKEN: 'D9Jxbdac9aFAb8sYdC1cmWFrn9g',
    TABLE_ID: 'tbl9PM8TNSLTHSIJ'
};

// API 基础地址
const API_BASE = window.location.origin;

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
        // 调用后端 API
        const response = await fetch(`${API_BASE}/api/products?action=search&model=${encodeURIComponent(model)}`);
        const data = await response.json();

        if (data.success && data.data) {
            const product = data.data;
            
            // 调试信息
            console.log('API返回数据:', product);
            
            resultDiv.innerHTML = `
                <div class="result-item">
                    ${product.image ? `<img src="${product.image}" alt="${product.model}" class="result-image" onerror="this.style.display='none'">` : '<div style="width:200px;height:200px;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;">无图片</div>'}
                    <div class="result-info">
                        <h3>📦 ${product.model || '未知型号'}</h3>
                        <p><strong>产品型号：</strong>${product.model || '-'}</p>
                        <p><strong>产品类别：</strong><span class="category">${product.category || '-'}</span></p>
                        <p style="margin-top: 10px; color: #4CAF50; font-size: 12px;">✅ 真实数据</p>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="no-result">
                    <p>❌ ${data.message || '未找到该型号的产品'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('查询失败:', error);
        resultDiv.innerHTML = `
            <div class="no-result">
                <p>❌ 网络错误</p>
                <p style="margin-top:10px;font-size:12px;color:#666;">${error.message}</p>
            </div>
        `;
    }
}

// 按图片查询（预留）
async function searchByImage() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) {
        alert('请先上传图片');
        return;
    }
    
    const resultDiv = document.getElementById('uploadResult');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>AI 识别中...</div>';
    resultDiv.classList.add('show');

    setTimeout(() => {
        resultDiv.innerHTML = `
            <div class="no-result">
                <p>🔧 图片识别功能正在配置中</p>
            </div>
        `;
    }, 1500);
}

// 切换标签
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.tab');
    
    if (tab === 'search') {
        tabs[0].classList.add('active');
        document.getElementById('searchTab').classList.add('active');
    } else if (tab === 'upload') {
        tabs[1].classList.add('active');
        document.getElementById('uploadTab').classList.add('active');
    } else if (tab === 'data') {
        tabs[2].classList.add('active');
        document.getElementById('dataTab').classList.add('active');
    }
}

// 打开飞书表格
function openFeishuTable() {
    window.open('https://jcn05t3p2dzw.feishu.cn/base/D9Jxbdac9aFAb8sYdC1cmWFrn9g', '_blank');
}

// 文件上传相关
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

if (uploadArea) {
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
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            showPreview(e.target.files[0]);
        }
    });
}

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
