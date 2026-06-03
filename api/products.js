// Vercel Serverless Function: /api/products
// 方案A：使用飞书多维表格公开访问

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
        
        // 使用飞书公开 API 获取数据
        const products = await fetchProducts();
        
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
        
        // 如果 API 失败，返回演示数据
        const mockData = [
            { model: 'SD0001', category: '5cm steel door', image: '' },
            { model: 'SD0002', category: '5cm steel door', image: '' },
            { model: 'SD0003', category: '5cm steel door', image: '' },
        ];
        
        return res.status(200).json({
            success: true,
            data: mockData,
            source: 'demo',
            warning: '飞书表格未开启公开访问，请先在飞书表格设置中开启'
        });
    }
}

// 从飞书获取产品数据（公开访问方式）
async function fetchProducts() {
    // 飞书公开 API（无需 Token）
    const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`,
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.items) {
        return data.data.items
            .filter(item => item.fields['产品型号']) // 只返回有型号的记录
            .map(item => {
                const imageData = item.fields['产品图片'];
                let imageUrl = '';
                
                // 解析图片字段
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
    
    // 如果 API 返回错误，尝试使用 user_access_token
    throw new Error(data.msg || 'Public API failed');
}
