/**
 * 准备 standalone 构建产物用于 pkg 打包
 * 
 * 这个脚本会：
 * 1. 复制静态资源到 standalone 目录
 * 2. 创建必要的目录结构
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');

// 递归复制目录
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`源目录不存在: ${src}`);
    return;
  }
  
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

// 主函数
function main() {
  console.log('准备 standalone 构建产物...');
  
  // 检查 standalone 目录
  if (!fs.existsSync(standaloneDir)) {
    console.error('错误: standalone 目录不存在，请先运行 npm run build');
    process.exit(1);
  }
  
  // 复制 static 目录
  const destStatic = path.join(standaloneDir, '.next', 'static');
  if (fs.existsSync(staticDir)) {
    console.log('复制静态资源...');
    copyDirSync(staticDir, destStatic);
    console.log(`  ${staticDir} -> ${destStatic}`);
  }
  
  // 复制 public 目录
  const destPublic = path.join(standaloneDir, 'public');
  if (fs.existsSync(publicDir)) {
    console.log('复制 public 资源...');
    copyDirSync(publicDir, destPublic);
    console.log(`  ${publicDir} -> ${destPublic}`);
  }
  
  console.log('');
  console.log('准备完成！');
}

main();
