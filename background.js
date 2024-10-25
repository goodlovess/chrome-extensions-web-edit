// 存储开发者工具状态
let devToolsOpen = false;

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      await chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

// 处理元素检查请求
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'inspectElement') {
    const tab = sender.tab;
    
    try {
      // 直接打开开发者工具并检查元素
      await chrome.debugger.attach({ tabId: tab.id }, "1.3");
      
      // 启用必要的域
      await chrome.debugger.sendCommand({ tabId: tab.id }, "DOM.enable");
      await chrome.debugger.sendCommand({ tabId: tab.id }, "Overlay.enable");
      
      // 获取文档
      const { root } = await chrome.debugger.sendCommand(
        { tabId: tab.id },
        "DOM.getDocument"
      );
      
      // 查找目标元素
      const { nodeId } = await chrome.debugger.sendCommand(
        { tabId: tab.id },
        "DOM.querySelector",
        {
          nodeId: root.nodeId,
          selector: request.selector
        }
      );
      
      // 打开开发者工具并检查元素
      await chrome.debugger.sendCommand(
        { tabId: tab.id },
        "Overlay.inspectNodeRequested",
        { nodeId: nodeId }
      );
      
      // 在开发者工具中选中该元素
      await chrome.debugger.sendCommand(
        { tabId: tab.id },
        "DOM.inspectNode",
        { nodeId: nodeId }
      );
      
      // 等待一会儿后分离调试器
      setTimeout(async () => {
        try {
          await chrome.debugger.detach({ tabId: tab.id });
        } catch (e) {
          console.error('Detach error:', e);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error inspecting element:', error);
      // 确保调试器被分离
      try {
        await chrome.debugger.detach({ tabId: tab.id });
      } catch (e) {
        console.error('Detach error:', e);
      }
    }
  }
  return true;
});
