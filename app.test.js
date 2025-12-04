const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./app'); // 导入原有 app 实例

// 测试专用端口（避免和生产端口冲突）
const TEST_PORT = 3301;
let server;

// 测试前置：启动测试服务器
beforeAll((done) => {
  server = http.createServer(app);
  server.listen(TEST_PORT, done); // 启动后执行测试
});

// 测试后置：关闭服务器
afterAll((done) => {
  server.close(done); // 测试结束后关闭服务
});

// 封装原生 HTTP 请求方法（复用逻辑）
const sendRequest = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: path,
      method: method
    };

    const req = http.request(options, (res) => {
      let data = '';
      // 收集响应内容
      res.on('data', (chunk) => { data += chunk; });
      // 响应结束后返回完整数据
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    // 处理请求错误
    req.on('error', (err) => reject(err));
    req.end(); // 结束请求
  });
};

// 测试套件
describe('Express 服务器测试（原生 http 模块）', () => {
  // 测试 1：根路由返回 200 且是 HTML
  test('GET / 应返回 200 状态码和 HTML 内容', async () => {
    const response = await sendRequest('/');
    
    // 断言状态码
    expect(response.statusCode).toBe(200);
    // 断言响应类型是 HTML
    expect(response.headers['content-type']).toMatch(/text\/html/);
    // 断言返回的内容和 public/index.html 一致
    const indexPath = path.join(__dirname, 'public', 'index.html');
    const expectedHtml = fs.readFileSync(indexPath, 'utf8');
    expect(response.body).toBe(expectedHtml);
  });

  // 测试 2：静态资源访问（示例：public/css/style.css）
  test('静态资源 /css/style.css 可访问', async () => {
    // 确保测试文件存在
    const cssPath = path.join(__dirname, 'public/css/style.css');
    if (!fs.existsSync(cssPath)) {
      fs.mkdirSync(path.dirname(cssPath), { recursive: true });
      fs.writeFileSync(cssPath, 'body { margin: 0; }');
    }

    const response = await sendRequest('/css/style.css');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/css/);
    expect(response.body).toBe('body { margin: 0; }');
  });

  // 测试 3：不存在的路由返回 404
  test('GET /non-existent 应返回 404', async () => {
    const response = await sendRequest('/non-existent');
    expect(response.statusCode).toBe(404);
  });
});