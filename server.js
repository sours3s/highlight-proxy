const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Главная страница
app.get('/', (req, res) => {
    res.json({
        service: 'Highlight Loader Proxy',
        version: '1.0.0',
        endpoints: {
            proxy: '/proxy (POST only)',
            health: '/health'
        },
        usage: 'Send POST to /proxy with action parameter'
    });
});

// Рандомные User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76'
];

// Основной прокси endpoint - ТОЛЬКО POST!
app.post('/proxy', async (req, res) => {
    try {
        const targetUrl = 'https://highlight.xo.je/api/auth/launcher_api.php';
        const action = req.body.action;
        
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action parameter is required'
            });
        }
        
        console.log(`[PROXY] Action: ${action}, From IP: ${req.ip}`);
        
        // Случайный User-Agent
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        // Собираем ВСЕ параметры
        const params = new URLSearchParams();
        params.append('action', action);
        
        // Добавляем все остальные параметры из запроса
        Object.keys(req.body).forEach(key => {
            if (key !== 'action') {
                params.append(key, req.body[key]);
            }
        });
        
        // Добавляем timestamp если его нет
        if (!req.body.timestamp) {
            params.append('timestamp', Date.now().toString());
        }
        
        // Добавляем дополнительные параметры для обхода защиты
        params.append('source', 'launcher');
        params.append('version', '1.0.0');
        params.append('platform', 'windows');
        
        const fullUrl = `${targetUrl}?${params.toString()}`;
        console.log(`[PROXY] Full URL: ${targetUrl}?action=${action}&...`);
        
        // СУПЕР-ЗАГОЛОВКИ как у реального браузера
        const headers = {
            'User-Agent': randomUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"'
        };
        
        // ВАЖНО: Делаем GET запрос с параметрами в URL, а не POST
        const options = {
            method: 'GET',  // МЕНЯЕМ на GET!
            headers: headers,
            timeout: 20000,
            redirect: 'follow'
        };
        
        console.log(`[PROXY] Sending GET request with headers...`);
        
        const response = await fetch(fullUrl, options);
        const responseText = await response.text();
        
        console.log(`[PROXY] Status: ${response.status}, Length: ${responseText.length}`);
        console.log(`[PROXY] Response preview: ${responseText.substring(0, 150)}...`);
        
        // Проверка на блокировку
        if (responseText.includes('aes.js') || 
            responseText.includes('InfinityFree') || 
            responseText.includes('DDoS') ||
            responseText.includes('<html>')) {
            
            console.log(`[PROXY] BLOCKED! Trying alternative method...`);
            
            // Пробуем альтернативный метод - эмуляция формы
            return await tryAlternativeMethod(targetUrl, params, res);
        }
        
        // Пытаемся распарсить JSON
        try {
            const json = JSON.parse(responseText);
            console.log(`[PROXY] JSON parsed successfully`);
            res.json(json);
        } catch (e) {
            console.log(`[PROXY] Not JSON, returning as text`);
            res.send(responseText);
        }
        
    } catch (error) {
        console.error('[PROXY] Error:', error.message);
        res.status(500).json({
            success: false,
            message: `Proxy error: ${error.message}`
        });
    }
});

// Альтернативный метод - эмуляция отправки формы
async function tryAlternativeMethod(targetUrl, params, res) {
    try {
        console.log(`[PROXY] Trying form submission method...`);
        
        const formHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://highlight.xo.je',
            'Referer': 'https://highlight.xo.je/login',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        const formOptions = {
            method: 'POST',
            headers: formHeaders,
            body: params.toString(),
            timeout: 15000
        };
        
        const formResponse = await fetch(targetUrl, formOptions);
        const formText = await formResponse.text();
        
        console.log(`[PROXY] Form method status: ${formResponse.status}`);
        
        if (formText.includes('aes.js')) {
            throw new Error('Still blocked by DDoS protection');
        }
        
        try {
            const json = JSON.parse(formText);
            res.json(json);
        } catch {
            res.send(formText);
        }
        
    } catch (formError) {
        console.error('[PROXY] Form method failed:', formError.message);
        res.status(403).json({
            success: false,
            message: 'Server blocked by DDoS protection. All methods failed.'
        });
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'highlight-proxy',
        timestamp: new Date().toISOString(),
        requests_served: requestCount
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found. Use POST /proxy'
    });
});

let requestCount = 0;

// Старт сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Highlight Proxy Server running on port ${PORT}`);
    console.log(`🔗 Proxy endpoint: POST http://0.0.0.0:${PORT}/proxy`);
    console.log(`❤️  Health check: GET http://0.0.0.0:${PORT}/health`);
});
