// Vercel Serverless Function: /api/products
// 后端 API - 安全的飞书数据访问

const FEISHU_APP_TOKEN = 'D9Jxbdac9aFAb8sYdC1cmWFrn9g';
const FEISHU_TABLE_ID = 'tbl9PM8TNSLTHSIJ';

export default async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { model, action } = req.query;
        
        // 从环境变量获取飞书 Token
        const accessToken = process.env.FEISHU_ACCESS_TOKEN;
        
        if (!accessToken) {
            // 如果没有配置 Token，返回演示数据
            const mockData = [
                { model: 'PRO-001', category: '类别A', image: 'https://via.placeholder.com/200x200/667eea/ffffff?text=PRO-001' },
                { model: 'PRO-002', category: '类别B', image: 'https://via.placeholder.com/200x200/764ba2/ffffff?text=PRO-002' },
                { model: 'PRO-003', category: '类别C', image: 'https://via.placeholder.com/200x200/36e195/ffffff?text=PRO-003' },
            ];
            
            if (action === 'search' && model) {
                const product = mockData.find(p => 
                    p.model && p.model.toLowerCase().includes(model.toLowerCase())
                );
                
                if (product) {
                    return res.status(200).json({
                        success: true,
                        data: product,
                        source: 'demo'
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
                data: mockData,
                source: 'demo'
            });
        }

        // 使用真实飞书 API
        const products = await fetchProducts(accessToken);
        
        if (action === 'search' && model) {
            const product = products.find(p => 
                p.model && p.model.toLowerCase().includes(model.toLowerCase())
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

// 从飞书获取产品数据
async function fetchProducts(accessToken) {
    const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.items) {
        return data.data.items.map(item => ({
            model: item.fields['产品型号'] || '',
            category: item.fields['产品类别']?.name || '',
            image: item.fields['产品图片']?.[0]?.url || '',
            recordId: item.record_id
        })).filter(p => p.model); // 只返回有型号的产品
    }
    
    throw new Error(data.msg || 'Failed to fetch from Feishu');
}
