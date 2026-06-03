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
    
    return (data.data.items || [])
        .filter(item => item.fields['产品型号'])
        .map(item => ({
            model: item.fields['产品型号'] || '',
            category: item.fields['产品类别']?.name || '',
            image: item.fields['产品图片']?.[0]?.url || ''
        }));
}
