const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3300;

// 静态资源目录
app.use(express.static(path.join(__dirname, 'public')));

// 根路由返回首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务
app.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});