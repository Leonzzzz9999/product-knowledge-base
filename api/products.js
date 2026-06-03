const FEISHU_APP_ID = 'cli_aa9506f90338dbc0';
const FEISHU_APP_SECRET = '4BBFnIDiVmlpPQxnNAKoDc1lXokuhvG7';
const FEISHU_APP_TOKEN = 'D9Jxbdac9aFAb8sYdC1cmWFrn9g';
const FEISHU_TABLE_ID = 'tbl9PM8TNSLTHSIJ';

let cachedToken = null;
let tokenExpire = 0;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { model, action } = req.query;
        const token = await getToken();
        const products = await getProducts(token);
        
        if (action === 'search' && model) {
            const product = products.find(p => 
                p.model && p.model.toLowerCase() === model.toLowerCase()
            );
            return res.json({
                success: !!product,
                data: product || null,
                message: product ? null : `未找到型号 "${model}" 的产品`
            });
        }
        
        return res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

async function getToken() {
    if (cachedToken && Date.now() < tokenExpire) {
        return cachedToken;
    }
    
    const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
    });
    
    const data = await resp.json();
    if (data.code !== 0) throw new Error(data.msg);
    
    cachedToken = data.app_access_token;
    tokenExpire = Date.now() + (data.expire - 300) * 1000;
    return cachedToken;
}

async function getProducts(token) {
    const resp = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const data = await resp.json();
    if (data.code !== 0) throw new Error(data.msg);
    
    const items = data.data.items || [];
    
    // 收集所有图片的file_token
    const fileTokens = [];
    const tokenToIndex = {};
    items.forEach((item, idx) => {
        const img = item.fields['产品图片'];
        if (img && Array.isArray(img) && img[0]?.file_token) {
            const ft = img[0].file_token;
            fileTokens.push(ft);
            tokenToIndex[ft] = idx;
        }
    });
    
    // 批量获取可下载的临时URL
    let tokenUrls = {};
    if (fileTokens.length > 0) {
        try {
            const urlResp = await fetch(
                `https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url?file_tokens=${fileTokens.join(',')}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const urlData = await urlResp.json();
            if (urlData.code === 0 && urlData.data) {
                urlData.data.forEach(item => {
                    if (item.download_url) {
                        tokenUrls[item.file_token] = item.download_url;
                    }
                });
            }
        } catch (e) {
            console.error('获取图片URL失败:', e);
        }
    }
    
    return items
        .filter(item => item.fields['产品型号'])
        .map(item => {
            const img = item.fields['产品图片'];
            let imageUrl = '';
            
            if (img && Array.isArray(img) && img[0]?.file_token) {
                const ft = img[0].file_token;
                imageUrl = tokenUrls[ft] || img[0].url || '';
            } else if (img && img.url) {
                imageUrl = img.url;
            }
            
            // 处理产品类别 - 可能是字符串或对象
            const category = item.fields['产品类别'];
            let categoryText = '';
            if (category) {
                if (typeof category === 'string') {
                    categoryText = category;
                } else if (category.name) {
                    categoryText = category.name;
                } else if (Array.isArray(category) && category[0]) {
                    categoryText = typeof category[0] === 'string' ? category[0] : (category[0].name || '');
                }
            }
            
            return {
                model: item.fields['产品型号'] || '',
                category: categoryText,
                image: imageUrl
            };
        });
}