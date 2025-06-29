---
title: Vue源码学习-diff算法
slug: vue-03-diff
category: 'frontend'
publishDate: '2023-6-04'
tags: ['前端', 'Vue']
coverImage: /icons/vuejs.svg
featured: true
---
# 前言

最近学Vue源码，了解了相关的diff算法，下面是我的整理复盘\~

# 为什么需要diff算法?

在Vue里，组件的产出就是虚拟DOM，我们要将新旧节点的VDOM进行比对，这个时候，为了提升性能，尽量去复用节点，减少DOM操作，那么就需要diff算法咯

# react的diff算法

```js
let lastIndex = 0
for (let i = 0; i < nextChildren.length; i++) {
  const nextVNode = nextChildren[i]
  let j = 0,
    find = false;
  for (j; j < prevChildren.length; j++) {
    const prevVNode = prevChildren[j]
    if (nextVNode.key === prevVNode.key) {
      find = true
      patch(prevVNode, nextVNode, container)
      if (j < lastIndex) {
        // 需要移动
        const refNode = nextChildren[i - 1].el.nextSibling
        container.insertBefore(prevVNode.el, refNode)
        break
      } else {
        // 更新 lastIndex
        lastIndex = j
      }
    }
  }
  if (!find) {
    // 挂载新节点
    const refNode =
      i - 1 < 0
        ? prevChildren[0].el
        : nextChildren[i - 1].el.nextSibling
    mount(nextVNode, container, false, refNode)
  }
}
// 移除已经不存在的节点
for (let i = 0; i < prevChildren.length; i++) {
  const prevVNode = prevChildren[i]
  const has = nextChildren.find(
    nextVNode => nextVNode.key === prevVNode.key
  )
  if (!has) {
    // 移除
    container.removeChild(prevVNode.el)
  }
}
```

上面的代码只是核心内容，下面解释一下一些变量：

*   `nextChildren`：新`VNode`
*   `prevChildren`：旧`VNode`
*   `key`：节点的唯一标识，下面简单的例子理解一下 key 的值

```js
// 旧的 VNode
const prevVNode = h('div', null, [
  h('p', { key: 'a' }, '节点1'),
  h('p', { key: 'b' }, '节点2'),
  h('p', { key: 'c' }, '节点3')
])

// 新的 VNode
const nextVNode = h('div', null, [
  h('p', { key: 'd' }, '节点4'),
  h('p', { key: 'a' }, '节点1'),
  h('p', { key: 'b' }, '节点2')
])

// h 函数的返回值
return {
    _isVNode: true,
    flags,
    tag,
    data,
    key: data && data.key ? data.key : null,
    children,
    childFlags,
    el: null || container // 要挂载的节点
 }
```

*   `el.nextSibling`：是一个 DOM 属性，表示节点 `el` 的下一个兄弟节点（即同一级别的节点中，紧挨着节点 `el` 后面的节点）。
*   `insertBefore` ：是一个 DOM API 中的方法，它可以在指定节点的父节点的子节点列表中，在指定位置前面插入一个新的子节点。

分析流程：

1.  比较同层的新旧节点，两层for循环，时间复杂度是O(n²)。
2.  新节点的子节点与旧节点的子节点进行比对，因为`key`值是唯一的，如果相同，那么就调用`patch`方法，进行比较新旧节点的属性和绑定事件有没有更改过。
3.  可以看到`lastIndex`的妙用，当进行节点比较时，当旧节点的最后的子节点会使得`lastIndex`的值不发生改变，于是进入第一个分支，进行节点的插入和替换。
4.  `find`变量用来标记新增的节点，挂载时需要判断是否是第一个节点。
5.  需要通过再一次的遍历，移除不存在的节点。

# Vue的双端diff算法

react的diff算法有个很明显的缺点，对于旧节点的最后子节点挂载到最前面时，整个子节点都需要进行移动。比如：旧VNode：A、B、C、D；新VNode：D、A、B、C；

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2fb0ff0ebdb74ad8a801c0d0846fa454~tplv-k3u1fbpfcp-watermark.image#?w=1512\&h=851\&s=137593\&e=png\&b=fffefe)

```js
// 当新的 children 中有多个子节点时，会执行该 case 语句块
let oldStartIdx = 0 // 定义旧节点开始索引
let oldEndIdx = prevChildren.length - 1 // 定义旧节点结束索引
let newStartIdx = 0 // 定义新节点开始索引
let newEndIdx = nextChildren.length - 1 // 定义新节点结束索引
let oldStartVNode = prevChildren[oldStartIdx] // 定义旧节点开始位置对应的虚拟节点
let oldEndVNode = prevChildren[oldEndIdx] // 定义旧节点结束位置对应的虚拟节点
let newStartVNode = nextChildren[newStartIdx] // 定义新节点开始位置对应的虚拟节点
let newEndVNode = nextChildren[newEndIdx] // 定义新节点结束位置对应的虚拟节点

while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) { // 循环比较旧节点和新节点
  if (!oldStartVNode) { 
  // 如果旧节点开始位置的虚拟节点不存在，则将旧节点开始索引增加，并重新定义旧节点开始位置对应的虚拟节点
    oldStartVNode = prevChildren[++oldStartIdx]
  } else if (!oldEndVNode) { 
  // 如果旧节点结束位置的虚拟节点不存在，则将旧节点结束索引减少，并重新定义旧节点结束位置对应的虚拟节点
    oldEndVNode = prevChildren[--oldEndIdx]
  } else if (oldStartVNode.key === newStartVNode.key) { 
  // 如果旧节点开始位置虚拟节点的 key 和新节点开始位置虚拟节点的 key 相同，则进行 patch 操作
    patch(oldStartVNode, newStartVNode, container)
    oldStartVNode = prevChildren[++oldStartIdx]// 对旧节点开始索引和新节点开始索引都加 1，表示这两个节点已经匹配完成
    newStartVNode = nextChildren[++newStartIdx]
  } else if (oldEndVNode.key === newEndVNode.key) { 
  // 如果旧节点结束位置虚拟节点的 key 和新节点结束位置虚拟节点的 key 相同，则进行 patch 操作
    patch(oldEndVNode, newEndVNode, container)
    oldEndVNode = prevChildren[--oldEndIdx] // 对旧节点结束索引和新节点结束索引都减 1，表示两个节点已经匹配完成
    newEndVNode = nextChildren[--newEndIdx]
  } else if (oldStartVNode.key === newEndVNode.key) { 
  // 如果旧节点开始位置虚拟节点的 key 和新节点结束位置虚拟节点的 key 相同，则进行 patch 操作
    patch(oldStartVNode, newEndVNode, container) // 这个操作是将旧节点开始位置虚拟节点移动到旧节点结束位置之后，并更新其对应的真实节点的位置
    container.insertBefore(
      oldStartVNode.el,
      oldEndVNode.el.nextSibling
    )
    oldStartVNode = prevChildren[++oldStartIdx] // 对旧节点开始索引和新节点结束索引都加 1，表示这两个节点已经匹配完成
    newEndVNode = nextChildren[--newEndIdx]
  } else if (oldEndVNode.key === newStartVNode.key) { 
  // 如果旧节点结束位置虚拟节点的 key 和新节点开始位置虚拟节点的 key 相同，则进行 patch 操作
    patch(oldEndVNode, newStartVNode, container) // 这个操作是将旧节点结束位置虚拟节点移动到旧节点开始位置之前，并更新其对应的真实节点的位置
    container.insertBefore(oldEndVNode.el, oldStartVNode.el)
    oldEndVNode = prevChildren[--oldEndIdx] // 对旧节点结束索引和新节点开始索引都减 1，表示两个节点已经匹配完成
    newStartVNode = nextChildren[++newStartIdx]
  } else {
    const idxInOld = prevChildren.findIndex( // 查找新节点开始位置虚拟节点在旧节点中的位置，并返回对应的索引
      node => node.key === newStartVNode.key
    )
    if (idxInOld >= 0) { // 如果返回的索引不小于 0，则说明新节点开始位置虚拟节点在旧节点中存在
      const vnodeToMove = prevChildren[idxInOld] // 根据返回的索引，找到旧节点中对应的虚拟节点，并将其移动到旧节点开始位置之前，并更新其对应的真实节点的位置
      patch(vnodeToMove, newStartVNode, container)
      prevChildren[idxInOld] = undefined // 将该虚拟节点在旧节点中的位置设为 undefined，表示其已经被移动过了
      container.insertBefore(vnodeToMove.el, oldStartVNode.el)
    } else { // 如果返回的索引小于 0，则说明新节点开始位置虚拟节点在旧节点中不存在
      // 新节点
      mount(newStartVNode, container, false, oldStartVNode.el) // 在旧节点开始位置之前插入新节点，并创建其对应的真实节点
    }
    newStartVNode = nextChildren[++newStartIdx] // 对新节点开始索引加 1，表示该节点已经处理完成
  }
}
if (oldEndIdx < oldStartIdx) { // 如果旧节点结束索引小于旧节点开始索引，则说明旧节点已经全部处理完成，此时需要将剩余的新节点添加到真实 DOM 中
  // 添加新节点
  for (let i = newStartIdx; i <= newEndIdx; i++) {
    mount(nextChildren[i], container, false, oldStartVNode.el)
  }
}
```

分析流程：

下面几种情况：

*   旧节点的头指针和尾指针是否为空，重新指向位置。在后续的处理节点过程中，会使某些旧节点赋值为`undefined`。
*   头头和尾尾比较，进行`patch`函数调用，再使新旧头节点向下移动。
*   头尾和尾头比较，进行`patch`函数调用，再将新节点进行调用。`insertBefore`方法，和拿到`el.nextSibling`属性，进行DOM的插入操作，再使指针分别移动。
*   上面情况都不符合时，通过遍历去比对`key`值，能找到则进行`patch`操作，使该旧节点值为`undefined`，不能找到则进行`mount`方法的调用，进行挂载新节点，此时仅需要新节点头指针进行移动。

图解举例具体分析：

`diff`整体策略为：深度优先，同层比较

1.  比较只会在同层级进行, 不会跨层级比较

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/873d4c7ffbce436089140726173757d3~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=470\&s=55214\&e=png\&b=ffffff)

2.  比较的过程中，循环从两边向中间收拢

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b6492cb1462443008a0b1f6965673d04~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=484\&s=47674\&e=png\&b=ffffff)

下面举个`vue`通过`diff`算法更新的例子：

新旧`VNode`节点如下图所示：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/029f14285a2944ce9748af13495c6e96~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=432\&s=47732\&e=png\&b=ffffff)

第一次循环后，发现旧节点D与新节点D相同，直接复用旧节点D作为`diff`后的第一个真实节点，同时旧节点`endIndex`移动到C，新节点的 `startIndex` 移动到了 C，我们可以看到进行了`container.insertBefore(oldEndVNode.el, oldStartVNode.el)`函数的调用，进行了一次DOM的插入操作。
![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1a56839743146b092f61c409bed9225~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=568\&s=174348\&e=png\&b=fffefe)

第二次循环后，同样是旧节点的末尾和新节点的开头(都是 C)相同，同理，`diff` 后创建了 C 的真实节点插入到第一次创建的 D 节点后面。同时旧节点的 `endIndex` 移动到了 B，新节点的 `startIndex` 移动到了 E

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ed05b982804b4b09a105d9cd05661fc1~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=563\&s=181593\&e=png\&b=fffefe)

第三次循环中，发现E没有找到，这时候只能直接创建新的真实节点 E，插入到第二次创建的 C 节点之后。同时新节点的 `startIndex` 移动到了 A。旧节点的 `startIndex` 和 `endIndex` 都保持不动

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4b2b777648294c158802aaee6ec0aca3~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=556\&s=187992\&e=png\&b=fffefe)

第四次循环中，发现了新旧节点的开头(都是 A)相同，于是 `diff` 后创建了 A 的真实节点，插入到前一次创建的 E 节点后面。同时旧节点的 `startIndex` 移动到了 B，新节点的`startIndex` 移动到了 B

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0f68f22395814469aa8ec24a92667c52~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=561\&s=67431\&e=png\&b=ffffff)

第五次循环中，情形同第四次循环一样，因此 `diff` 后创建了 B 真实节点 插入到前一次创建的 A 节点后面。同时旧节点的 `startIndex`移动到了 C，新节点的 startIndex 移动到了 F

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fe81260f7ad043d48f59085351394894~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=561\&s=185462\&e=png\&b=fffefe)

新节点的 `startIndex` 已经大于 `endIndex` 了，需要创建 `newStartIdx` 和 `newEndIdx` 之间的所有节点，也就是节点F，直接创建 F 节点对应的真实节点放到 B 节点后面

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/99f70604c9234ee7b06e0fea7fc36db4~tplv-k3u1fbpfcp-zoom-1.image#?w=1080\&h=463\&s=42814\&e=png\&b=ffffff)

# 什么时候需要diff？

当数据发生改变时，`set`方法会调用`Dep.notify`通知所有订阅者`Watcher`，订阅者就会调用`patch`给真实的`DOM`打补丁，更新相应的视图。这个设计模式是订阅发布者模式，有兴趣了解更详细的流程可以去看我的另一篇文章。[你不会只知道MVVM的概念吧？ - 掘金 (juejin.cn)](https://juejin.cn/post/7238917620836941884)

# Vue3又对diff做了什么优化？

`vue3`在`diff`算法中相比`vue2`增加了静态标记

关于这个**静态标记**，其作用是为了会发生变化的地方添加一个`flag`标记，下次发生变化的时候直接找该地方进行比较

下图这里，已经标记静态节点的`p`标签在`diff`过程中则不会比较，把性能进一步提高

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7552d236042743d2bf25c8747ee932c4~tplv-k3u1fbpfcp-zoom-1.image#?w=930\&h=306\&s=138559\&e=png\&b=f9f9f9)

关于静态类型枚举如下

    export const enum PatchFlags {
      TEXT = 1,// 动态的文本节点
      CLASS = 1 << 1,  // 2 动态的 class
      STYLE = 1 << 2,  // 4 动态的 style
      PROPS = 1 << 3,  // 8 动态属性，不包括类名和样式
      FULL_PROPS = 1 << 4,  // 16 动态 key，当 key 变化时需要完整的 diff 算法做比较
      HYDRATE_EVENTS = 1 << 5,  // 32 表示带有事件监听器的节点
      STABLE_FRAGMENT = 1 << 6,   // 64 一个不会改变子节点顺序的 Fragment
      KEYED_FRAGMENT = 1 << 7, // 128 带有 key 属性的 Fragment
      UNKEYED_FRAGMENT = 1 << 8, // 256 子节点没有 key 的 Fragment
      NEED_PATCH = 1 << 9,   // 512
      DYNAMIC_SLOTS = 1 << 10,  // 动态 solt
      HOISTED = -1,  // 特殊标志是负整数表示永远不会用作 diff
      BAIL = -2 // 一个特殊的标志，指代差异算法
    }

`Vue3`中对不参与更新的元素，会做静态提升，只会被创建一次，在渲染时直接复用

这样就免去了重复的创建节点，大型应用会受益于这个改动，免去了重复的创建操作，优化了运行时候的内存占用

```js
<span>你好</span>

<div>{{ message }}</div>
```

没有做静态提升之前

```js
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createBlock(_Fragment, null, [
    _createVNode("span", null, "你好"),
    _createVNode("div", null, _toDisplayString(_ctx.message), 1 /* TEXT */)
  ], 64 /* STABLE_FRAGMENT */))
}
```

做了静态提升之后

```js
const _hoisted_1 = /*#__PURE__*/_createVNode("span", null, "你好", -1 /* HOISTED */)

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createBlock(_Fragment, null, [
    _hoisted_1,
    _createVNode("div", null, _toDisplayString(_ctx.message), 1 /* TEXT */)
  ], 64 /* STABLE_FRAGMENT */))
}

// Check the console for the AST
```

*   静态内容`_hoisted_1`被放置在`render` 函数外
*   每次渲染的时候只要取 `_hoisted_1` 即可
*   同时 `_hoisted_1` 被打上了 `PatchFlag` ，静态标记值为 -1
*   特殊标志是负整数表示永远不会用于 Diff

# 虚拟Dom为什么好？

1.  虚拟DOM的生成流程

*   使用模板语法或渲染函数生成虚拟DOM对象
*   模板语法使用类似 HTML 的标记和指令，Vue 编译器会将这些模板转化为AST抽象语法树，再进行一些优化手段，比如静态提升，以减少虚拟 DOM 对象的创建和更新开销，基于优化后的抽象语法树，Vue 编译器会生成对应的虚拟 DOM 对象
*   渲染函数是一个接收 `h` 函数作为参数的函数，该函数用于创建虚拟 DOM 元素

2.  虚拟Dom的优势

*   渲染性能方面：我们通过对象的方式来管理虚拟Dom结构，通过事务处理机制，将多次修改Dom的结果一次性的更新到页面上，减少了页面渲染的次数，减少了页面的重绘重排的次数，当然这是基于非首次渲染的情况
    *   看一下它们重排重绘的性能消耗∶
    *   真实DOM∶ 生成HTML字符串＋重建所有的DOM元素
    *   虚拟DOM∶ 生成vNode+ DOMDiff＋必要的dom更新

*   设计初衷跨平台的实现：通过**平台抽象层**将 VNode 和渲染器连接起来，使得 Vue 组件可以在不同平台上运行。
