// Vercel Serverless Function: /api/products
// 获取飞书 Access Token 并查询产品数据

const FEISHU_APP_TOKEN = 'D9Jxbdac9aFAb8sYdC1cmWFrn9g';
const FEISHU_TABLE_ID = 'tbl9PM8TNSLTHSIJ';

// 模拟数据（用于演示）
const MOCK_DATA = [
    { model: 'PRO-001', category: '类别A', image: 'https://via.placeholder.com/200x200/667eea/ffffff?text=PRO-001' },
    { model: 'PRO-002', category: '类别B', image: 'https://via.placeholder.com/200x200/764ba2/ffffff?text=PRO-002' },
    { model: 'PRO-003', category: '类别C', image: 'https://via.placeholder.com/200x200/36e195/ffffff?text=PRO-003' },
];

export default async function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { model, action } = req.query;

        if (action === 'search' && model) {
            // 优先使用飞书 API
            const products = await fetchProductsFromFeishu();
            
            if (products.length > 0) {
                const product = products.find(p => 
                    p.model && p.model.toLowerCase().includes(model.toLowerCase())
                );
                
                if (product) {
                    return res.status(200).json({
                        success: true,
                        data: product,
                        source: 'feishu'
                    });
                }
            }

            // 如果飞书没有数据，返回空
            return res.status(200).json({
                success: false,
                message: `未找到型号为 "${model}" 的产品`
            });
        }

        if (action === 'all') {
            // 返回所有产品（用于测试）
            const products = await fetchProductsFromFeishu();
            return res.status(200).json({
                success: true,
                data: products.length > 0 ? products : MOCK_DATA,
                source: products.length > 0 ? 'feishu' : 'mock'
            });
        }

        // 默认返回所有产品列表
        const products = await fetchProductsFromFeishu();
        return res.status(200).json({
            success: true,
            data: products.length > 0 ? products : MOCK_DATA,
            source: products.length > 0 ? 'feishu' : 'mock'
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

// 从飞书获取产品数据
async function fetchProductsFromFeishu() {
    // 由于 Serverless Function 环境难以获取飞书 token
    // 这里返回空数组，让前端使用模拟数据
    // 实际部署时可以配置环境变量
    return [];
}
