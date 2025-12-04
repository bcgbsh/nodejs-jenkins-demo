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

// 关键修复：仅当直接运行 app.js 时才启动服务（测试导入时跳过）
if (require.main === module) {
  // 启动服务
  app.listen(PORT, () => {
    console.log(`服务运行在 http://localhost:${PORT}`);
  });
}

// 导出 app 实例（供测试使用）
module.exports = app;
