// 飞书 API 配置
const FEISHU_CONFIG = {
    APP_TOKEN: 'D9Jxbdac9aFAb8sYdC1cmWFrn9g',
    TABLE_ID: 'tbl9PM8TNSLTHSIJ',
    APP_ID: 'cli_aa9506f90338dbc0',
    APP_SECRET: '4BBFnIDiVmlpPQxnNAKoDc1lXokuhvG7'
};

// 缓存
let cachedToken = null;
let tokenExpire = 0;
let cachedProducts = null;
let productsExpire = 0;

// 获取 App Access Token
async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpire) {
        return cachedToken;
    }
    
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        })
    });
    
    const data = await response.json();
    
    if (data.code !== 0 || !data.app_access_token) {
        throw new Error(data.msg || '获取 Token 失败');
    }
    
    cachedToken = data.app_access_token;
    tokenExpire = Date.now() + (data.expire - 300) * 1000;
    
    return cachedToken;
}

// 获取所有产品
async function getProducts() {
    if (cachedProducts && Date.now() < productsExpire) {
        return cachedProducts;
    }
    
    const token = await getAccessToken();
    
    const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records?page_size=500`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );
    
    const data = await response.json();
    
    if (data.code !== 0 || !data.data) {
        throw new Error(data.msg || '获取产品数据失败');
    }
    
    cachedProducts = data.data.items
        .filter(item => item.fields['产品型号'])
        .map(item => {
            const imageData = item.fields['产品图片'];
            let imageUrl = '';
            
            if (imageData && Array.isArray(imageData) && imageData.length > 0) {
                imageUrl = imageData[0].url || '';
            }
            
            return {
                model: item.fields['产品型号'] || '',
                category: (item.fields['产品类别'] && item.fields['产品类别'].name) 
                    ? item.fields['产品类别'].name 
                    : (Array.isArray(item.fields['产品类别']) ? item.fields['产品类别'][0] : ''),
                image: imageUrl,
                recordId: item.record_id
            };
        });
    
    productsExpire = Date.now() + 5 * 60 * 1000; // 缓存 5 分钟
    
    return cachedProducts;
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
        const products = await getProducts();
        const product = products.find(p => 
            p.model && p.model.toLowerCase() === model.toLowerCase()
        );
        
        if (product) {
            if (product.image) {
                resultDiv.innerHTML = `
                    <div class="result-item">
                        <img src="${product.image}" alt="${product.model}" class="result-image" onerror="this.src='https://via.placeholder.com/200x200/e0e0e0/666666?text=No+Image'">
                        <div class="result-info">
                            <h3>📦 ${product.model}</h3>
                            <p><strong>产品型号：</strong>${product.model}</p>
                            <p><strong>产品类别：</strong><span class="category">${product.category}</span></p>
                            <p style="margin-top: 10px; color: #4CAF50; font-size: 12px;">✅ 真实数据</p>
                        </div>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="result-item">
                        <div class="result-info">
                            <h3>📦 ${product.model}</h3>
                            <p><strong>产品型号：</strong>${product.model}</p>
                            <p><strong>产品类别：</strong><span class="category">${product.category}</span></p>
                            <p style="margin-top: 10px; color: #999;">⚠️ 该产品暂无图片</p>
                            <p style="margin-top: 5px; color: #4CAF50; font-size: 12px;">✅ 真实数据</p>
                        </div>
                    </div>
                `;
            }
        } else {
            resultDiv.innerHTML = `
                <div class="no-result">
                    <p>❌ 未找到型号为 "${model}" 的产品</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('查询失败:', error);
        resultDiv.innerHTML = `
            <div class="no-result">
                <p>❌ 查询失败</p>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">${error.message}</p>
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
