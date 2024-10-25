// 创建DOM结构表格
function createDOMTable(element, showChildren = false) {
  let rows = [];
  const elements = showChildren ? Array.from(element.children) : [element];

  elements.forEach((el) => {
    // 跳过不需要显示的标签
    const skipTags = ["script", "link", "style"];
    if (skipTags.includes(el.tagName.toLowerCase())) {
      return;
    }

    // 跳过插件注入的DOM元素
    if (
      el.id === "chrome-extension-sidebar" ||
      el.hasAttribute("data-domTableId") ||
      el.hasAttribute("data-breadcrumbId") ||
      el.classList.contains("extension-highlight-element")
    ) {
      return;
    }

    // 获取元素的标签名和类名
    const tagName = el.tagName.toLowerCase();

    // 处理类名，确保它是字符串类型
    let className = "";
    if (el.className) {
      if (typeof el.className === "string") {
        className = `.${el.className.split(" ").join(".")}`;
      } else if (el.className.baseVal) {
        className = `.${el.className.baseVal.split(" ").join(".")}`;
      } else if (el.classList && el.classList.length) {
        className = `.${Array.from(el.classList).join(".")}`;
      }
    }

    const id = el.id ? `#${el.id}` : "";

    // 计算实际的子元素数量（排除插件注入的DOM和不需要显示的标签）
    const childrenCount = Array.from(el.children).filter(
      (child) =>
        child.id !== "chrome-extension-sidebar" &&
        !child.hasAttribute("data-domTableId") &&
        !child.hasAttribute("data-breadcrumbId") &&
        !child.classList.contains("extension-highlight-element") &&
        !skipTags.includes(child.tagName.toLowerCase())
    ).length;

    // 为每个元素生成唯一ID
    const uniqueId = "dom-element-" + Math.random().toString(36).substr(2, 9);
    el.dataset.domTableId = uniqueId;

    // 检查元素是否有可展示的 CSS 属性
    const styles = getComputedStylesForElement(el);
    const hasStyles = Object.keys(styles).length > 0;

    // 修改行的HTML结构，添加禁用状态的 CSS 按钮
    rows.push(`
      <tr data-element-id="${uniqueId}" class="dom-row ${
      childrenCount > 0 ? "has-children" : ""
    }">
        <td>
          ${tagName}${id}${className}
          ${
            childrenCount > 0
              ? `<span class="children-count">(${childrenCount}个子元素)</span>`
              : ""
          }
        </td>
        <td class="css-column">
          <button class="view-css-btn ${!hasStyles ? "disabled" : ""}" 
                  ${!hasStyles ? "disabled" : ""}
                  title="${hasStyles ? "CSS属性" : "无CSS属性"}">
            CSS
          </button>
        </td>
      </tr>
    `);
  });

  return rows;
}

// 高亮显示元素
function highlightElement(element) {
  // 移除之前的高亮
  const previousHighlight = document.querySelector(
    ".extension-highlight-element"
  );
  if (previousHighlight) {
    previousHighlight.classList.remove("extension-highlight-element");
  }

  // 添加新的高亮
  element.classList.add("extension-highlight-element");
}

// 更新包屑导航
function updateBreadcrumb(element, sidebar) {
  const breadcrumb = [];
  let currentElement = element;

  while (
    currentElement &&
    currentElement.tagName &&
    currentElement.tagName.toLowerCase() !== "body"
  ) {
    const tagName = currentElement.tagName.toLowerCase();
    const id = currentElement.id ? `#${currentElement.id}` : "";
    breadcrumb.unshift({
      element: currentElement,
      text: `${tagName}${id}`,
    });
    currentElement = currentElement.parentElement;
  }

  breadcrumb.unshift({
    element: document.body,
    text: "body",
  });

  const breadcrumbHtml = breadcrumb
    .map((item, index) => {
      const uniqueId = "breadcrumb-" + Math.random().toString(36).substr(2, 9);
      item.element.dataset.breadcrumbId = uniqueId;
      return `
      <span 
        class="breadcrumb-item" 
        data-breadcrumb-id="${uniqueId}"
        ${index === breadcrumb.length - 1 ? 'class="active"' : ""}
      >
        ${item.text}
      </span>
      ${
        index < breadcrumb.length - 1
          ? '<span class="breadcrumb-separator">></span>'
          : ""
      }
    `;
    })
    .join("");

  return breadcrumbHtml;
}

// 更新表格内容
function updateTable(element, sidebar) {
  const tableBody = sidebar.querySelector(".dom-table tbody");
  const breadcrumbContainer = sidebar.querySelector(".breadcrumb-container");

  // 更新面包
  breadcrumbContainer.innerHTML = updateBreadcrumb(element, sidebar);

  // 更表格内容
  const rows = createDOMTable(element, true);
  tableBody.innerHTML = rows.join("");

  // 重新绑定事件
  attachTableEvents(sidebar);
  attachBreadcrumbEvents(sidebar);
}

// 为表格行添加事件
function attachTableEvents(sidebar) {
  sidebar.querySelectorAll(".dom-row").forEach((row) => {
    // 添加鼠标悬停事件
    row.addEventListener("mouseenter", () => {
      const elementId = row.dataset.elementId;
      const targetElement = document.querySelector(
        `[data-dom-table-id="${elementId}"]`
      );

      if (targetElement) {
        highlightElement(targetElement);
      }
    });

    // 添加鼠标离开事件
    row.addEventListener("mouseleave", () => {
      // 移除高亮
      const highlightedElement = document.querySelector(
        ".extension-highlight-element"
      );
      if (highlightedElement) {
        highlightedElement.classList.remove("extension-highlight-element");
      }
    });

    // 点击事件只处理子元素导航
    row.addEventListener("click", () => {
      const elementId = row.dataset.elementId;
      const targetElement = document.querySelector(
        `[data-dom-table-id="${elementId}"]`
      );

      if (targetElement && targetElement.children.length > 0) {
        updateTable(targetElement, sidebar);

        // 高亮对应的表格行
        const previousSelectedRow = sidebar.querySelector(".selected-row");
        if (previousSelectedRow) {
          previousSelectedRow.classList.remove("selected-row");
        }
        row.classList.add("selected-row");
      }
    });
  });

  // 添加 CSS 按钮点击事件
  sidebar.querySelectorAll(".view-css-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      const row = btn.closest(".dom-row");
      const elementId = row.dataset.elementId;
      const targetElement = document.querySelector(
        `[data-dom-table-id="${elementId}"]`
      );

      if (targetElement) {
        createCssPopup(targetElement, btn);
      }
    });
  });
}

// 为面包屑添加事件
function attachBreadcrumbEvents(sidebar) {
  sidebar.querySelectorAll(".breadcrumb-item").forEach((item) => {
    // 添加点击事件
    item.addEventListener("click", () => {
      const breadcrumbId = item.dataset.breadcrumbId;
      const targetElement = document.querySelector(
        `[data-breadcrumb-id="${breadcrumbId}"]`
      );
      if (targetElement) {
        updateTable(targetElement, sidebar);
        highlightElement(targetElement);
      }
    });

    // 加鼠标悬停事件
    item.addEventListener("mouseenter", () => {
      const breadcrumbId = item.dataset.breadcrumbId;
      const targetElement = document.querySelector(
        `[data-breadcrumb-id="${breadcrumbId}"]`
      );
      if (targetElement) {
        highlightElement(targetElement);
      }
    });

    // 添加鼠标离开事件
    item.addEventListener("mouseleave", () => {
      const highlightedElement = document.querySelector(
        ".extension-highlight-element"
      );
      if (highlightedElement) {
        highlightedElement.classList.remove("extension-highlight-element");
      }
    });
  });
}

// 创建侧边栏
function createSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = "chrome-extension-sidebar";
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 5px rgba(0,0,0,0.1);
    z-index: 9999;
    transition: transform 0.3s ease;
    overflow-y: auto;
  `;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <button id="sidebar-close-btn">&times;</button>
      <h2>页面DOM结构</h2>
    </div>
    <div class="breadcrumb-container"></div>
    <div class="sidebar-content">
      <table class="dom-table">
        <thead>
          <tr>
            <th>元素</th>
            <th>CSS</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  document.body.appendChild(sidebar);

  // 初始化显示 body 的直接子元素
  updateTable(document.body, sidebar);

  // 为关闭按钮添加点击事件
  document
    .getElementById("sidebar-close-btn")
    .addEventListener("click", removeSidebar);

  // 调整页面主体内容
  document.body.style.marginRight = "400px";
}

// 移除侧边栏
function removeSidebar() {
  const sidebar = document.getElementById("chrome-extension-sidebar");
  if (sidebar) {
    sidebar.remove();
    document.body.style.marginRight = "0";

    // 移除所有高亮
    const highlightedElement = document.querySelector(
      ".extension-highlight-element"
    );
    if (highlightedElement) {
      highlightedElement.classList.remove("extension-highlight-element");
    }
  }
}

// 监听来自 background script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleSidebar") {
    const sidebar = document.getElementById("chrome-extension-sidebar");
    if (sidebar) {
      removeSidebar();
    } else {
      createSidebar();
    }
  }
});

// 修改获取元素的CSS属性函数
function getComputedStylesForElement(element) {
  const styles = {};

  // 1. 获取内联样式
  if (element.style && element.style.length) {
    for (let i = 0; i < element.style.length; i++) {
      const prop = element.style[i];
      const value = element.style.getPropertyValue(prop);
      if (value) {
        styles[prop] = value;
      }
    }
  }

  // 2. 获取类定义的样式
  if (element.className && typeof element.className === "string") {
    const classes = element.className.split(" ").filter(Boolean);

    if (classes.length) {
      // 遍历所有样式表
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          rules.forEach((rule) => {
            // 只处理样式规则
            if (rule instanceof CSSStyleRule) {
              // 检查规则是否匹配当前元素的名
              const matchesClass = classes.some((className) =>
                rule.selectorText.includes(`.${className}`)
              );

              if (matchesClass) {
                // 获取规则定义的所有样式
                const styleDeclaration = rule.style;
                for (let i = 0; i < styleDeclaration.length; i++) {
                  const prop = styleDeclaration[i];
                  const value = styleDeclaration.getPropertyValue(prop);
                  if (value) {
                    // 如果属性已存在（来自内联样式），保留内联样式的值
                    if (!styles.hasOwnProperty(prop)) {
                      styles[prop] = value;
                    }
                  }
                }
              }
            }
          });
        } catch (e) {
          // 忽略跨域样式表错误
          console.warn("Cannot read rules from stylesheet:", e);
        }
      });
    }
  }

  return styles;
}

// 添加更完整的 CSS 属性中文映射
const cssPropertyTranslations = {
  // 布局相关
  display: "显示方式",
  position: "定位方式",
  float: "浮动",
  clear: "清除浮动",
  visibility: "可见性",
  overflow: "溢出处理",
  "z-index": "层叠顺序",

  // 盒模型
  width: "宽度",
  height: "高度",
  "max-width": "最大宽度",
  "max-height": "最大高度",
  "min-width": "最小宽度",
  "min-height": "最小高度",
  margin: "外边距",
  "margin-top": "上外边距",
  "margin-right": "右外边距",
  "margin-bottom": "下外边距",
  "margin-left": "左外边距",
  padding: "内边距",
  "padding-top": "上内边距",
  "padding-right": "右内边距",
  "padding-bottom": "下内边距",
  "padding-left": "左内边距",

  // 边框相关
  border: "边框",
  "border-width": "边框宽度",
  "border-style": "边框样式",
  "border-color": "边框颜色",
  "border-radius": "圆角",
  "border-top": "上边框",
  "border-right": "右边框",
  "border-bottom": "下边框",
  "border-left": "左边框",

  // 背景相关
  background: "背景",
  "background-color": "背景颜色",
  "background-image": "背景图片",
  "background-repeat": "背景重复",
  "background-position": "背景位置",
  "background-size": "背景大小",

  // 文字相关
  color: "文字颜色",
  "font-family": "字体",
  "font-size": "字体大小",
  "font-weight": "字体粗细",
  "font-style": "字体样式",
  "text-align": "文本对齐",
  "text-decoration": "文本装饰",
  "text-transform": "文本转换",
  "line-height": "行高",
  "letter-spacing": "字间距",
  "word-spacing": "词间距",
  "white-space": "空白处理",

  // Flex布局
  flex: "Flex",
  "flex-direction": "Flex方向",
  "flex-wrap": "Flex换行",
  "flex-flow": "Flex流向",
  "justify-content": "主轴对齐",
  "align-items": "交叉轴对齐",
  "align-content": "多行对齐",
  order: "排序",
  "flex-grow": "放大比例",
  "flex-shrink": "缩小比例",
  "flex-basis": "基准大小",

  // Grid布局
  grid: "网格",
  "grid-template-columns": "列模板",
  "grid-template-rows": "行模板",
  "grid-gap": "网格间距",
  "grid-column": "列",
  "grid-row": "行",

  // 定位相关
  top: "上偏移",
  right: "右偏移",
  bottom: "下偏移",
  left: "左偏移",

  // 变换和过渡
  transform: "变换",
  "transform-origin": "变换原点",
  transition: "过渡",
  "transition-property": "过渡属性",
  "transition-duration": "过渡时长",
  "transition-timing-function": "过渡函数",

  // 动画
  animation: "动画",
  "animation-name": "动画名称",
  "animation-duration": "动画时长",
  "animation-timing-function": "动画函数",
  "animation-delay": "动画延迟",
  "animation-iteration-count": "动画次数",
  "animation-direction": "动画方向",

  // 其他
  opacity: "不透明度",
  cursor: "鼠标样式",
  "pointer-events": "指针事件",
  "user-select": "文本选择",
  "box-shadow": "盒阴影",
  "text-shadow": "文字阴影",
  outline: "轮廓",
  content: "内容",
  "box-sizing": "盒模型",
  "vertical-align": "垂直对齐",
  "word-break": "单词换行",
  "word-wrap": "文本换行",
  "text-overflow": "文本溢出",
};

// 添加复制功能的辅助函数
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // 可以添加复制成功的提示
      const toast = document.createElement("div");
      toast.className = "copy-toast";
      toast.textContent = "复制成功";
      document.body.appendChild(toast);

      // 1秒后移除提示
      setTimeout(() => toast.remove(), 1000);
    })
    .catch((err) => {
      console.error("复制失败:", err);
    });
}

// 添加常用 CSS 属性列表
const commonCssProperties = [
  "align-items",
  "background",
  "background-color",
  "border",
  "border-radius",
  "bottom",
  "color",
  "cursor",
  "display",
  "flex",
  "flex-direction",
  "font-family",
  "font-size",
  "font-weight",
  "height",
  "justify-content",
  "left",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "opacity",
  "overflow",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "right",
  "text-align",
  "text-decoration",
  "top",
  "transform",
  "transition",
  "visibility",
  "width",
  "z-index",
];

// 修改创建 CSS 弹窗的函数
function createCssPopup(element, button) {
  // 移除已存在的 CSS 面板和遮罩层
  const existingPanel = document.querySelector(".css-panel-container");
  const existingMask = document.querySelector(".css-panel-mask");
  if (existingPanel) {
    existingPanel.remove();
  }
  if (existingMask) {
    existingMask.remove();
  }

  const styles = getComputedStylesForElement(element);

  // 创建遮罩层
  const mask = document.createElement("div");
  mask.className = "css-panel-mask";

  // 创建面板容器
  const panelContainer = document.createElement("div");
  panelContainer.className = "css-panel-container";

  // 高亮目标元素
  highlightElement(element);

  panelContainer.innerHTML = `
    <div class="css-panel">
      <div class="css-panel-header">
        <div class="header-buttons">
          <button class="add-css-btn" title="添加CSS属性">+ 添加属性</button>
          <button class="copy-all-btn" title="复制所有CSS属性">复制全部</button>
          <button class="css-panel-close">&times;</button>
        </div>
      </div>
      <div class="css-panel-content">
        <div class="css-properties">
          ${Object.entries(styles)
            .map(
              ([prop, value]) => `
            <div class="css-property" data-property="${prop}">
              <span class="property-name" title="${
                cssPropertyTranslations[prop] || prop
              }">
                ${prop}:
                ${
                  cssPropertyTranslations[prop]
                    ? `<span class="property-translation">(${cssPropertyTranslations[prop]})</span>`
                    : ""
                }
              </span>
              <div class="property-value-container">
                <input type="text" 
                       class="property-value-input" 
                       value="${value}" 
                       data-property="${prop}"
                       title="原始值: ${value}">
                <button class="copy-property-btn" title="复制此CSS属性">
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M16 1H4C3 1 2 2 2 3v14h2V3h12V1zm3 4H8C7 5 6 6 6 7v14c0 1 1 2 2 2h11c1 0 2-1 2-2V7c0-1-1-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                </button>
                <button class="delete-property-btn" title="删除此CSS属性">
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                  </svg>
                </button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  // 添加到侧边栏
  const sidebar = document.getElementById("chrome-extension-sidebar");
  sidebar.appendChild(mask);
  sidebar.appendChild(panelContainer);

  // 点击遮罩层关闭面板并移除高亮
  mask.addEventListener("click", () => {
    // 移除高亮
    const highlightedElement = document.querySelector(
      ".extension-highlight-element"
    );
    if (highlightedElement) {
      highlightedElement.classList.remove("extension-highlight-element");
    }
    mask.remove();
    panelContainer.remove();
  });

  // 修改关闭按钮事件，同时移除高亮
  const closeBtn = panelContainer.querySelector(".css-panel-close");
  closeBtn.addEventListener("click", () => {
    // 移除高亮
    const highlightedElement = document.querySelector(
      ".extension-highlight-element"
    );
    if (highlightedElement) {
      highlightedElement.classList.remove("extension-highlight-element");
    }
    mask.remove();
    panelContainer.remove();
  });

  // 添加复制所有属性的事件
  const copyAllBtn = panelContainer.querySelector(".copy-all-btn");
  copyAllBtn.addEventListener("click", () => {
    const allProperties = Object.entries(styles)
      .map(([prop, value]) => `${prop}: ${value};`)
      .join("\n");
    copyToClipboard(allProperties);
  });

  // 添加复制单个属性的事件
  panelContainer.querySelectorAll(".copy-property-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const propertyContainer = btn.closest(".css-property");
      const prop = propertyContainer.dataset.property;
      const value = propertyContainer.querySelector(
        ".property-value-input"
      ).value;
      const cssText = `${prop}: ${value};`;
      copyToClipboard(cssText);
    });
  });

  // 修改删除属性的事件处理
  panelContainer.querySelectorAll(".delete-property-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const propertyContainer = btn.closest(".css-property");
      const prop = propertyContainer.dataset.property;

      // 移除元素的样式
      element.style.removeProperty(prop);

      // 强制触发重绘
      element.offsetHeight;
      void element.offsetWidth;

      // 移除属性行
      propertyContainer.remove();

      // 检查是否还有剩余的CSS属性
      const remainingProperties =
        panelContainer.querySelectorAll(".css-property");
      if (remainingProperties.length === 0) {
        // 如果没有剩余属性，更新CSS按钮状态
        const cssButton = document.querySelector(
          `[data-element-id="${element.dataset.domTableId}"] .view-css-btn`
        );
        if (cssButton) {
          cssButton.classList.add("disabled");
          cssButton.setAttribute("disabled", "");
          cssButton.title = "无CSS属性";
        }
      }
    });
  });

  // 修改属性值修改事件处理
  panelContainer.querySelectorAll(".property-value-input").forEach((input) => {
    input.addEventListener("input", () => {
      const prop = input.dataset.property;
      const value = input.value;
      // 直接修改元素的样式
      element.style.setProperty(prop, value);
      // 强制触发重绘
      element.offsetHeight;
    });
  });

  // 修改添加新属性的事件处理
  const addCssBtn = panelContainer.querySelector(".add-css-btn");
  addCssBtn.addEventListener("click", () => {
    // 获取当前未使用的属性
    const usedProperties = Array.from(
      panelContainer.querySelectorAll(".css-property")
    ).map((prop) => prop.dataset.property);
    const availableProperties = commonCssProperties.filter(
      (prop) => !usedProperties.includes(prop)
    );

    if (availableProperties.length === 0) {
      alert("所有常用属性已添加");
      return;
    }

    // 创建属性选择弹窗
    const selectPopup = document.createElement("div");
    selectPopup.className = "property-select-popup";
    selectPopup.innerHTML = `
      <div class="property-select-content">
        <h4>选择CSS属性</h4>
        <input type="text" class="property-search" placeholder="搜索属性...">
        <div class="property-list">
          ${availableProperties
            .map(
              (prop) => `
            <div class="property-option" data-property="${prop}">
              ${prop}
              ${
                cssPropertyTranslations[prop]
                  ? `<span class="property-translation">(${cssPropertyTranslations[prop]})</span>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    panelContainer.appendChild(selectPopup);

    // 添加搜索功能
    const searchInput = selectPopup.querySelector(".property-search");
    searchInput.addEventListener("input", (e) => {
      const searchText = e.target.value.toLowerCase();
      selectPopup.querySelectorAll(".property-option").forEach((option) => {
        const propertyName = option.dataset.property.toLowerCase();
        const translation =
          cssPropertyTranslations[option.dataset.property]?.toLowerCase() || "";
        option.style.display =
          propertyName.includes(searchText) || translation.includes(searchText)
            ? "block"
            : "none";
      });
    });

    // 添加属性选择事件
    selectPopup.querySelectorAll(".property-option").forEach((option) => {
      option.addEventListener("click", () => {
        const property = option.dataset.property;
        const propertyContainer = document.createElement("div");
        propertyContainer.className = "css-property";
        propertyContainer.dataset.property = property;

        propertyContainer.innerHTML = `
          <span class="property-name" title="${
            cssPropertyTranslations[property] || property
          }">
            ${property}:
            ${
              cssPropertyTranslations[property]
                ? `<span class="property-translation">(${cssPropertyTranslations[property]})</span>`
                : ""
            }
          </span>
          <div class="property-value-container">
            <input type="text" 
                   class="property-value-input" 
                   value="" 
                   data-property="${property}"
                   placeholder="输入值..."
                   title="输入CSS值">
            <button class="copy-property-btn" title="复制此CSS属性">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M16 1H4C3 1 2 2 2 3v14h2V3h12V1zm3 4H8C7 5 6 6 6 7v14c0 1 1 2 2 2h11c1 0 2-1 2-2V7c0-1-1-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
            <button class="delete-property-btn" title="删除此CSS属性">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
            </button>
          </div>
        `;

        // 添加到属性列表
        const propertiesList = panelContainer.querySelector(".css-properties");
        propertiesList.appendChild(propertyContainer);

        // 添加输入事件
        const input = propertyContainer.querySelector(".property-value-input");
        input.addEventListener("input", () => {
          // 直接修改元素的样式
          element.style.setProperty(property, input.value);
          // 强制触发重绘
          element.offsetHeight;
        });

        // 添加复制事件
        const copyBtn = propertyContainer.querySelector(".copy-property-btn");
        copyBtn.addEventListener("click", () => {
          const value = input.value;
          const cssText = `${property}: ${value};`;
          copyToClipboard(cssText);
        });

        // 添加删除事件
        const deleteBtn = propertyContainer.querySelector(
          ".delete-property-btn"
        );
        deleteBtn.addEventListener("click", () => {
          // 移除元素的样式
          element.style.removeProperty(property);
          // 强制触发重绘
          element.offsetHeight;
          propertyContainer.remove();
        });

        // 关闭选择弹窗
        selectPopup.remove();

        // 聚焦到新添加的输入框
        input.focus();
      });
    });

    // 点击弹窗外部关闭
    document.addEventListener("click", function closeSelect(e) {
      if (!selectPopup.contains(e.target) && e.target !== addCssBtn) {
        selectPopup.remove();
        document.removeEventListener("click", closeSelect);
      }
    });
  });
}
