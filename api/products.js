// Vercel Serverless Function: /api/products
// 使用 App Access Token 方式连接飞书

const FEISHU_APP_ID = 'cli_aa9506f90338dbc0';
const FEISHU_APP_SECRET = '4BBFnIDiVmlpPQxnNAKoDc1lXokuhvG7';
const FEISHU_APP_TOKEN = 'D9Jxbdac9aFAb8sYdC1cmWFrn9g';
const FEISHU_TABLE_ID = 'tbl9PM8TNSLTHSIJ';

let cachedToken = null;
let tokenExpire = 0;

// 带超时的 fetch
async function fetchWithTimeout(url, options, timeout = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

export default async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { model, action } = req.query;
        
        // 获取 Access Token
        const accessToken = await getAccessToken();
        
        // 使用飞书 API 获取数据
        const products = await fetchProducts(accessToken);
        
        // 返回所有产品列表
        if (action === 'list') {
            return res.status(200).json({
                success: true,
                data: products,
                source: 'feishu'
            });
        }
        
        // 按型号搜索
        if (action === 'search' && model) {
            const product = products.find(p => 
                p.model && p.model.toLowerCase() === model.toLowerCase()
            );
            
            if (product) {
                return res.status(200).json({
                    success: true,
                    data: product,
                    source: 'feishu'
                });
            } else {
                return res.status(200).json({
                    success: false,
                    message: `未找到型号为 "${model}" 的产品`
                });
            }
        }
        
        return res.status(200).json({
            success: true,
            data: products,
            source: 'feishu'
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
}

// 获取 App Access Token
async function getAccessToken() {
    // 如果缓存的 token 还没过期，直接返回
    if (cachedToken && Date.now() < tokenExpire) {
        return cachedToken;
    }
    
    const response = await fetchWithTimeout(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: FEISHU_APP_ID,
                app_secret: FEISHU_APP_SECRET
            })
        },
        5000
    );
    
    const data = await response.json();
    
    if (data.code !== 0 || !data.app_access_token) {
        throw new Error(data.msg || 'Failed to get access token');
    }
    
    // 缓存 token，留 5 分钟缓冲
    cachedToken = data.app_access_token;
    tokenExpire = Date.now() + (data.expire - 300) * 1000;
    
    return cachedToken;
}

// 从飞书获取产品数据
async function fetchProducts(accessToken) {
    const response = await fetchWithTimeout(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        },
        10000
    );
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.items) {
        return data.data.items
            .filter(item => item.fields['产品型号']) // 只返回有型号的记录
            .map(item => {
                const imageData = item.fields['产品图片'];
                let imageUrl = '';
                
                // 解析图片字段 - 飞书返回的图片格式
                if (imageData && Array.isArray(imageData) && imageData.length > 0) {
                    imageUrl = imageData[0].url || '';
                } else if (imageData && imageData.url) {
                    imageUrl = imageData.url;
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
    }
    
    throw new Error(data.msg || 'Failed to fetch from Feishu');
}
