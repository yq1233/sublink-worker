#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KV_NAMESPACE_NAME = 'sublink-worker-SUBLINK_KV';
const WRANGLER_CONFIG_PATH = path.join(__dirname, '..', 'wrangler.toml');

// 执行wrangler命令并返回结果
function runWranglerCommand(command) {
  try {
    return execSync(`npx wrangler ${command}`, { encoding: 'utf8' });
  } catch (error) {
    console.error(`执行命令失败: npx wrangler ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// 检查KV namespace是否存在
function checkKvNamespaceExists() {
  console.log(`正在检查KV namespace "${KV_NAMESPACE_NAME}"是否存在...`);
  const output = runWranglerCommand('kv:namespace list --json');
  
  try {
    const namespaces = JSON.parse(output);
    return namespaces.find(ns => ns.title === KV_NAMESPACE_NAME);
  } catch (error) {
    console.error('解析KV namespace列表失败:', error.message);
    process.exit(1);
  }
}

// 创建KV namespace
function createKvNamespace() {
  console.log(`创建KV namespace "${KV_NAMESPACE_NAME}"...`);
  const output = runWranglerCommand(`kv:namespace create "${KV_NAMESPACE_NAME}" --json`);
  
  try {
    return JSON.parse(output);
  } catch (error) {
    console.error('创建KV namespace失败:', error.message);
    process.exit(1);
  }
}

// 更新wrangler.toml文件
function updateWranglerConfig(kvNamespaceId) {
  console.log(`更新wrangler.toml文件...`);
  
  try {
    let config = fs.readFileSync(WRANGLER_CONFIG_PATH, 'utf8');
    
    // 使用正则表达式查找并替换KV namespace ID
    const kvConfigRegex = /kv_namespaces\s*=\s*\[\s*{\s*binding\s*=\s*"SUBLINK_KV"\s*,\s*id\s*=\s*"([^"]*)"\s*}\s*\]/;
    
    if (kvConfigRegex.test(config)) {
      config = config.replace(kvConfigRegex, `kv_namespaces = [\n  { binding = "SUBLINK_KV", id = "${kvNamespaceId}" }\n]`);
    } else {
      // 如果没有找到现有的KV配置，则添加新的配置
      config += `\nkv_namespaces = [\n  { binding = "SUBLINK_KV", id = "${kvNamespaceId}" }\n]\n`;
    }
    
    fs.writeFileSync(WRANGLER_CONFIG_PATH, config);
    console.log('wrangler.toml文件已更新');
  } catch (error) {
    console.error('更新wrangler.toml文件失败:', error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  console.log('开始设置KV namespace...');
  
  // 检查KV namespace是否存在
  let namespace = checkKvNamespaceExists();
  
  // 如果不存在，则创建
  if (!namespace) {
    console.log(`KV namespace "${KV_NAMESPACE_NAME}"不存在，正在创建...`);
    namespace = createKvNamespace();
    console.log(`KV namespace "${KV_NAMESPACE_NAME}"创建成功，ID: ${namespace.id}`);
  } else {
    console.log(`KV namespace "${KV_NAMESPACE_NAME}"已存在，ID: ${namespace.id}`);
  }
  
  // 更新wrangler.toml文件
  updateWranglerConfig(namespace.id);
  
  console.log('设置完成！');
}

main(); 