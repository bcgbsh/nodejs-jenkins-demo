const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('./app');

// 1. 全局增加 Jest 超时时间（解决钩子函数超时）
jest.setTimeout(15000); // 延长到15秒，覆盖服务器启动/关闭耗时

const TEST_PORT = 3301;
let server;

// 2. 优化前置启动逻辑：确保服务器真正启动后再执行测试
beforeAll((done) => {
  // 先杀死可能占用测试端口的残留进程（关键：避免端口占用导致启动失败）
  const killPortProcess = () => {
    const { exec } = require('child_process');
    exec(`lsof -ti:${TEST_PORT} | xargs kill -9 2>/dev/null`, (err) => {
      if (err) console.log(`测试端口 ${TEST_PORT} 无残留进程`);
      // 启动服务器
      server = http.createServer(app);
      // 监听错误，避免端口占用导致阻塞
      server.on('error', (err) => {
        console.error('服务器启动失败:', err);
        done(err);
      });
      // 确认服务器监听成功后执行done
      server.listen(TEST_PORT, () => {
        console.log(`测试服务器启动在端口 ${TEST_PORT}`);
        done();
      });
    });
  };
  killPortProcess();
});

// 3. 优化后置关闭逻辑：强制关闭+容错处理
afterAll((done) => {
  if (!server) {
    console.log('服务器未启动，直接结束');
    return done();
  }
  // 强制关闭服务器，忽略错误
  server.close((err) => {
    if (err) {
      console.warn('服务器关闭警告:', err);
    }
    // 兜底：再次杀死测试端口进程
    const { exec } = require('child_process');
    exec(`lsof -ti:${TEST_PORT} | xargs kill -9 2>/dev/null`, () => {
      console.log(`测试端口 ${TEST_PORT} 已释放`);
      done();
    });
  });
});

// 封装请求方法（增加超时）
const sendRequest = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: path,
      method: method,
      timeout: 5000 // 请求超时5秒
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    // 请求超时处理
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`请求 ${path} 超时`));
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
};

// 测试用例（保持不变，或增加单例超时）
describe('Express 服务器测试（原生 http 模块）', () => {
  // 单个测试用例超时（可选）
  test('GET / 应返回 200 状态码和 HTML 内容', async () => {
    const response = await sendRequest('/');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    const indexPath = path.join(__dirname, 'public', 'index.html');
    const expectedHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
    expect(response.body).toBe(expectedHtml);
  }, 10000); // 单个用例超时10秒

  test('静态资源 /css/style.css 可访问', async () => {
    const cssPath = path.join(__dirname, 'public/css/style.css');
    if (!fs.existsSync(cssPath)) {
      fs.mkdirSync(path.dirname(cssPath), { recursive: true });
      fs.writeFileSync(cssPath, 'body { margin: 0; }');
    }
    const response = await sendRequest('/css/style.css');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/css/);
    expect(response.body).toBe('body { margin: 0; }');
  }, 10000);

  test('GET /non-existent 应返回 404', async () => {
    const response = await sendRequest('/non-existent');
    expect(response.statusCode).toBe(404);
  }, 10000);
});
