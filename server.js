const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000; // Изменил на 10000

// Разрешаем все CORS запросы
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Главная страница
app.get('/', (req, res) => {
    res.json({
        service: 'Highlight Loader Proxy',
        version: '1.0.0',
        endpoints: {
            proxy: '/proxy',
            health: '/health'
        },
        usage: 'Send POST requests to /proxy with action parameter'
    });
});

// Основной прокси endpoint
app.all('/proxy', async (req, res) => {
    try {
        // Целевой URL вашего API
        const targetUrl = 'https://highlight.xo.je/api/auth/launcher_api.php';
        
        // Берем параметры из запроса
        const action = req.query.action || req.body.action;
        
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action parameter is required'
            });
        }
        
        // Формируем URL для запроса
        let url = `${targetUrl}?action=${action}`;
        
        // Добавляем остальные параметры
        const params = { ...req.query, ...req.body };
        delete params.action;
        
        const paramString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
        
        if (paramString) {
            url += `&${paramString}`;
        }
        
        console.log(`Proxying to: ${url}`);
        
        // Заголовки для обхода DDoS защиты
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://highlight.xo.je/',
            'Origin': 'https://highlight.xo.je',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        // Настройки запроса
        const options = {
            method: req.method,
            headers: headers,
            timeout: 15000 // 15 секунд
        };
        
        // Если POST, добавляем тело
        if (req.method === 'POST' && Object.keys(req.body).length > 0) {
            const formData = new URLSearchParams();
            for (const key in req.body) {
                formData.append(key, req.body[key]);
            }
            options.body = formData;
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        
        // Отправляем запрос
        const response = await fetch(url, options);
        
        // Проверяем статус
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Получаем ответ
        const text = await response.text();
        
        console.log(`Response received: ${text.substring(0, 200)}...`);
        
        // Проверяем, не заблокирован ли InfinityFree
        if (text.includes('aes.js') || text.includes('InfinityFree')) {
            return res.status(403).json({
                success: false,
                message: 'Target server blocked by DDoS protection'
            });
        }
        
        // Пытаемся распарсить JSON
        try {
            const json = JSON.parse(text);
            res.json(json);
        } catch (e) {
            // Если не JSON, возвращаем как есть
            res.send(text);
        }
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            success: false,
            message: `Proxy error: ${error.message}`
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'highlight-proxy',
        timestamp: new Date().toISOString()
    });
});

// Старт сервера (УБРАЛ повторное объявление PORT)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Highlight Proxy Server running on port ${PORT}`);
    console.log(`Proxy endpoint: http://0.0.0.0:${PORT}/proxy`);
    console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});
