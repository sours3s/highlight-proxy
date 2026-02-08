const express = require('express');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Proxy работает');
});

app.post('/proxy', async (req, res) => {
    console.log('Запрос:', req.body.action);
    
    const options = {
        hostname: 'highlight.xo.je',
        path: `/api/auth/launcher_api.php?action=${req.body.action || 'test'}`,
        method: 'GET',
        headers: {
            'Host': 'highlight.xo.je',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'TE': 'trailers'
        },
        timeout: 10000
    };
    
    // Добавляем все параметры из запроса
    const params = new URLSearchParams(req.body);
    options.path += `&${params.toString()}`.replace('action=', '');
    
    const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        
        proxyRes.on('end', () => {
            console.log('Ответ получен');
            res.send(data);
        });
    });
    
    proxyReq.on('error', (err) => {
        console.error('Ошибка:', err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });
    });
    
    proxyReq.end();
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy запущен на порту ${PORT}`);
});
