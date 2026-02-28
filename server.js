#!/usr/bin/env node
/**
 * 小红书电视文案参数校核助手 - 独立运行服务器
 * 
 * 这是打包成可执行文件的入口点
 * 运行后会在本地启动 Web 服务，自动打开浏览器访问
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 配置
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// 获取应用目录（支持打包后的路径）
function getAppDir() {
  // pkg 打包后的路径
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return __dirname;
}

// 检测端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, HOST, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// 查找可用端口
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 100) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('无法找到可用端口');
}

// 打开浏览器
function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  switch (platform) {
    case 'win32':
      command = `start "" "${url}"`;
      break;
    case 'darwin':
      command = `open "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }
  
  try {
    execSync(command, { stdio: 'ignore', shell: true });
  } catch (e) {
    console.log(`请手动打开浏览器访问: ${url}`);
  }
}

// 主函数
async function main() {
  console.log('');
  console.log('========================================');
  console.log('  小红书电视文案参数校核助手');
  console.log('  AI 驱动 · 参数校核 · 文案润色');
  console.log('========================================');
  console.log('');
  
  const appDir = getAppDir();
  
  // 检查 standalone 目录
  const standaloneDir = path.join(appDir, '.next', 'standalone');
  const standaloneServer = path.join(standaloneDir, 'server.js');
  
  if (!fs.existsSync(standaloneServer)) {
    console.log('未找到构建文件，正在构建应用...');
    console.log('这可能需要几分钟时间，请耐心等待...');
    console.log('');
    
    try {
      execSync('npm run build', { 
        cwd: appDir, 
        stdio: 'inherit',
        shell: true 
      });
    } catch (e) {
      console.error('构建失败，请确保已安装依赖（npm install）');
      process.exit(1);
    }
  }
  
  // 查找可用端口
  const port = await findAvailablePort(PORT);
  const url = `http://${HOST}:${port}`;
  
  console.log(`正在启动服务器...`);
  console.log(`端口: ${port}`);
  console.log('');
  
  // 复制静态资源到 standalone 目录（Next.js standalone 模式需要）
  const publicDir = path.join(appDir, 'public');
  const staticDir = path.join(appDir, '.next', 'static');
  const standalonePublic = path.join(standaloneDir, 'public');
  const standaloneStatic = path.join(standaloneDir, '.next', 'static');
  
  // 复制 public 目录
  if (fs.existsSync(publicDir) && !fs.existsSync(standalonePublic)) {
    copyDirSync(publicDir, standalonePublic);
  }
  
  // 复制 static 目录
  if (fs.existsSync(staticDir)) {
    if (!fs.existsSync(path.join(standaloneDir, '.next'))) {
      fs.mkdirSync(path.join(standaloneDir, '.next'), { recursive: true });
    }
    copyDirSync(staticDir, standaloneStatic);
  }
  
  // 启动 Next.js 服务器
  const serverProcess = spawn(process.execPath, [standaloneServer], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: port.toString(),
      HOSTNAME: HOST,
      NODE_ENV: 'production'
    },
    stdio: 'pipe'
  });
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.log(output);
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('ExperimentalWarning')) {
      console.error(output);
    }
  });
  
  serverProcess.on('error', (err) => {
    console.error('启动失败:', err.message);
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`服务器异常退出，代码: ${code}`);
    }
    process.exit(code || 0);
  });
  
  // 等待服务器启动
  console.log('等待服务器就绪...');
  
  let retries = 0;
  const maxRetries = 30;
  
  const checkServer = async () => {
    return new Promise((resolve) => {
      const req = http.get(`http://${HOST}:${port}`, (res) => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
  };
  
  while (retries < maxRetries) {
    await new Promise(r => setTimeout(r, 1000));
    if (await checkServer()) {
      break;
    }
    retries++;
  }
  
  if (retries >= maxRetries) {
    console.error('服务器启动超时');
    serverProcess.kill();
    process.exit(1);
  }
  
  console.log('');
  console.log('========================================');
  console.log(`  服务已启动！`);
  console.log(`  访问地址: ${url}`);
  console.log('');
  console.log('  按 Ctrl+C 停止服务');
  console.log('========================================');
  console.log('');
  
  // 自动打开浏览器
  openBrowser(url);
  
  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n正在关闭服务...');
    serverProcess.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    serverProcess.kill();
    process.exit(0);
  });
}

// 递归复制目录
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 运行
main().catch((err) => {
  console.error('启动失败:', err.message);
  process.exit(1);
});
