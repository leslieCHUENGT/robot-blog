---
title: Vue源码学习-nextTick
slug: vue-04-nextTick
category: 'frontend'
publishDate: '2023-7-18'
tags: ['前端', 'Vue']
coverImage: /icons/vue.svg
featured: true
---

# 基本用法
在Vue 3中，`nextTick`函数用于在下一次DOM更新循环结束之后执行回调函数。可以用来确保在更新DOM后执行某些操作，例如访问更新后的DOM元或执行其他依赖于DOM更新的逻辑。

以下是`nextTick`的基本用法示例代码：

```javascript
// 导入模块
import { nextTick } from 'vue'

// 创建Vue实例
const app = createApp({})

// 在Vue实例使用nextTick
app.mount('#app');

// 在Vue实例更新DOM后执行回调函数
nextTick(()=> {
  // 这里是回调函数的辑
  console.log('DOM已更新');
});
```

在上面示例中，我们首先入了`nextTick`函数。然后，我们创建了一个Vue实例并将其挂载到id为"app"的DOM元上。最后，我们使用`nextTick`函数来注册一个回调函数，在DOM更新后执行该调函数。在回调函数中，我们简单地打印出一条消息来表示已经更新。

请注意`nextTick`函数**大概率**是返回一个Promise对象，因此您也可以使用`async/await`语法来等DOM更新完成。例如：

```javascript
async function doSomething() {
  await nextTick();
  // 在这里执行需要DOM更新后进行的操作
}
```

这样，`doSomething`函数将会在更新后执行其中的逻辑。

# 源码解析

## nextTick函数

```js
import { noop } from 'shared/util' // noop 表示一个无操作空函数，用作函数默认值，防止传入 undefined 导致报错
import { handleError } from './error' // handleError 错误处理函数
import { isIE, isIOS, isNative } from './env' // isIE, isIOS, isNative 环境判断函数

export let isUsingMicroTask = false  // 标记 nextTick 最终是否以微任务执行   

const callbacks = []     // 存放调用 nextTick 时传入的回调函数
let pending = false     // 标记是否已经向任务队列中添加了一个任务，如果已经添加了就不能再添加了，也就是说一个任务执行完了才能再添加和执行下一个任务

// 声明 nextTick 函数，接收一个回调函数和一个执行上下文作为参数
// 回调的 this 自动绑定到调用它的实例上
export function nextTick(cb?: Function, ctx?: Object) {
    let _resolve
    
    // 将传入的回调函数存放到数组中，后面会遍历执行其中的回调
    callbacks.push(() => {
        if (cb) {   // 对传入的回调进行 try catch 错误捕获
            try {
                cb.call(ctx)
            } catch (e) {    // 进行统一的错误处理
                handleError(e, ctx, 'nextTick')
            }
        } else if (_resolve) {
            _resolve(ctx)
        }
    })
  
    // 如果当前没有在 pending 的回调，
    // 就执行 timeFunc 函数选择当前环境优先支持的异步方法
    if (!pending) {
        pending = true
        timerFunc()
    }
    // 如果没有传入回调，并且当前环境支持 promise，就返回一个 promise
    // 在返回的这个 promise.then 中 DOM 已经更新好了，
    if (!cb && typeof Promise !== 'undefined') {
        return new Promise(resolve => {
            _resolve = resolve
        })
    }
}
```
## flushCallbacks函数

```js
// 如果多次调用 nextTick，会依次执行上面的方法，将 nextTick 的回调放在 callbacks 数组中
// 最后通过 flushCallbacks 函数遍历 callbacks 数组的拷贝并执行其中的回调
function flushCallbacks() {
    pending = false    
    const copies = callbacks.slice(0)    // 拷贝一份 callbacks
    callbacks = null   // 清空 callbacks
    for (let i = 0; i < copies.length; i++) {    // 遍历执行传入的回调
        copies[i]()
    }
}

```
为什么要进行拷贝？

- 考虑到在 nextTick 回调中可能还会调用 nextTick 的情况

## timerFunc函数

```js
// 判断当前环境优先支持的异步方法，优先选择微任务
// 优先级：Promise---> MutationObserver---> setImmediate---> setTimeout
// setTimeout 可能产生一个 4ms 的延迟，而 setImmediate 会在主线程执行完后立刻执行
// setImmediate 在 IE10 和 node 中支持

// 当在同一轮事件循环中多次调用 nextTick 时 ,timerFunc 只会执行一次

let timerFunc   
// 判断当前环境是否原生支持 promise
if (typeof Promise !== 'undefined' && isNative(Promise)) {  // 支持 promise
    const p = Promise.resolve()
    timerFunc = () => {
       // 用 promise.then 把 flushCallbacks 函数包裹成一个异步微任务
        p.then(flushCallbacks)
        if (isIOS) setTimeout(noop)
        // 这里的 setTimeout 是用来强制刷新微任务队列的
        // 因为在 ios 下 promise.then 后面没有宏任务的话，微任务队列不会刷新
    }
    // 标记当前 nextTick 使用的微任务
    isUsingMicroTask = true
    
    
    // 如果不支持 promise，就判断是否支持 MutationObserver
    // 不是IE环境，并且原生支持 MutationObserver，那也是一个微任务
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
    isNative(MutationObserver) ||
    MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
    let counter = 1
    // new 一个 MutationObserver 类
    const observer = new MutationObserver(flushCallbacks) 
    // 创建一个文本节点
    const textNode = document.createTextNode(String(counter))   
    // 监听这个文本节点，当数据发生变化就执行 flushCallbacks 
    observer.observe(textNode, { characterData: true })
    timerFunc = () => {
        counter = (counter + 1) % 2
        textNode.data = String(counter)  // 数据更新
    }
    isUsingMicroTask = true    // 标记当前 nextTick 使用的微任务
    
    
    // 判断当前环境是否原生支持 setImmediate
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
    timerFunc = () => { setImmediate(flushCallbacks)  }
} else {

    // 以上三种都不支持就选择 setTimeout
    timerFunc = () => { setTimeout(flushCallbacks, 0) }
}

```
# 结

我们可以简单梳理一下：
- `nextTick`可以有两个参数都是可选的，一个是自定义的回调还有是可指定的this值
- 当不传入回调的时候，默认给一个`Promise.resolve(ctx)` push到`callbacks`里,当传入回调的时候，我们就将`cb.call(ctx)` push 到`callbacks`里，至此我们收集回调函数到`callbacks`里了
- 之后我们通过`pending`来控制每一次事件循环的执行机制，调用`timerFunc`来进行任务的包装（从 promise -> MutationObserver -> setImmediate -> setTimeout）
- 在任务包装时，我们会对`callbacks`里的任务进行拷贝，防止影响 `nextTick` 回调中可能还会调用 nextTick 的情况
- 进而遍历任务，执行完毕所有的回调函数




参考：

https://juejin.cn/post/7087866362785169416?searchId=2023071820092347FF03D601B364DFB0D7

https://juejin.cn/post/6891309786290192391?searchId=2023071820092347FF03D601B364DFB0D7
