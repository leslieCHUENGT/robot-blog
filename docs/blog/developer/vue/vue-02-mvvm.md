---
title: Vue源码学习-双向绑定
slug: vue-02-mvvm
category: 'frontend'
publishDate: '2023-5-30'
tags: ['前端', 'Vue']
coverImage: /icons/vue.svg
featured: true
---

# 基本概念

对于MVVM的概念我们总是可以不带犹豫的答上来

*   数据层（Model）：应用的数据及业务逻辑
*   视图层（View）：应用的展示效果，各类UI组件
*   业务逻辑层（ViewModel）：框架封装的核心，它负责将数据与视图关联起来

面试官：那你知道vue是怎么实现MVVM的嘛？vue双向绑定的底层实现呢？了解嘛？

我：蛤？这个...

# 理解ViewModel

ViewModel作为视图层(View)与数据层(Model)之间的中介，负责处理业务逻辑、数据获取、数据转换等操作。

它的主要职责就是：数据变化后更新视图、视图变化后更新数据数据。

绑定的方式：**双向绑定和单向绑定。**

# 单向绑定

通过 JavaScript 控制 DOM 的展示，就是数据（Data）到模板（DOM）的绑定，这就是数据单向绑定。

```js
<p></p>
```

```js
const data = { value: 'hello' }
document.querySelector('p').innerText = data.value;
```

vue里的v-on和v-bind指令

```js
<button v-on:click="doThis"></button>
<img v-bind:src="imageSrc" />
```

# 原生js和vue实现双向绑定

而双向绑定就是在这个基础上，又扩展了反向的绑定效果，就是模板到数据的绑定。

上面的例子扩展以下：

```js
<input onkeyup="change(event)" />
<p></p>
```

```js
const data = { value: '' }
const change = e => {
    // 更新输入值
    data.value = e.target.value;
    // 且，同步值的展示
    document.querySelector('p').innerText = data.value
}
```

我们将与单向绑定的却别是，数据与模板是相互影响的，一方发生变化，另一方立即做出更新。在这个简单的例子中，我们认识了双向绑定，Vue便是在此概念下进行模块化抽象封装。

```js
// App.vue
<script>
import CustomInput from './CustomInput.vue'

export default {
  components: { CustomInput },
  data() {
    return {
      message: 'hello'
    }
  }
}
</script>

<template>
  <CustomInput v-model="message" /> {{ message }}
</template>
```

```js
// CustomInput.vue
<script>
export default {
  props: ['modelValue'],
  emits: ['update:modelValue']
}
</script>

<template>
  <input
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
```

# 实现双向绑定

下面会使用vue2来实现MVVM双向绑定的过程，下面整个流程的示意图。

Vue 的双向绑定设计模式基于***观察者模式和发布订阅模式***实现，通过数据响应式模块、模板编译模块和视图渲染模块的协作，实现了数据和视图的双向绑定功能。其中，***数据响应式模块和模板编译模块是观察者模式，视图渲染模块是发布订阅模式。***
![e5369850-3ac9-11eb-85f6-6fac77c0c9b3.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1ac3531a00d842f5a83af3f228ceae73~tplv-k3u1fbpfcp-watermark.image#?w=730\&h=390\&s=40051\&e=png\&b=fefefe)

以Vue为例，我们要先调用Vue()创建一个Vue实例

为了更好理解observe和Compile在流程调用的时机，我们重写Vue(),命名为MVVM()。

```js
// index.js
import MVVM from './mvvm';
// 创建MVVM实例
var vm = new MVVM({
    el: '#mvvm-app',
    data: {
        title: 'hello world'
    },
    methods: {
        clickBtn: function(e) {
            this.title = '你好'
        }
    }
})

setTimeout(() => {
    vm.title =  '达瓦里希'
}, 1000)
```

```js
// MVVM.js
import { observe } from './observer'
import Compile from './compile';


function MVVM(options) {
    // 将 this 赋值给一个名为 self 的变量
    var self = this;

    // 将 options.data 赋值给 this._data
    this._data = options.data;

    // 将 options.methods 赋值给 this.methods
    this._methods = options.methods;

    // 对于 this.data 中的每个 key
    Object.keys(this._data).forEach(function(key) {
        // 代理这个 key
        self.proxyKeys(key);
    });

    // 监听数据变化
    observe(this._data);

    // 使用 options.el 和 this 实例化一个新的 Compile 对象
    new Compile(options.el, this);
};

// 在 MVVM 原型中添加一个 proxyKeys 方法，接受一个 key 参数
MVVM.prototype = {
    proxyKeys: function(key) {
        // 将 this 赋值给一个名为 self 的变量
        var self = this;

        // 使用 Object.defineProperty 在 this 上定义一个新的属性
        Object.defineProperty(this, key, {
            // 将该属性设置为不可枚举
            enumerable: false,
            // 允许对该属性进行配置
            configurable: true,
            // 为该属性定义一个 getter 方法
            get: function getter() {
                return self._data[key];
            },
            // 为该属性定义一个 setter 方法
            set: function setter(newVal) {
                self._data[key] = newVal;
            }
        })
    }
};

export default MVVM
```

在MVVM函数里会做下面几件事：

1.  初始化实例对象的属性，对data的属性进行`defineProperty`代理
2.  observe进行劫持监听数据
3.  compile进行模板编译

当然实际上new Vue()的过程还会进行多种操作，上面仅仅是一小部分。

那下面我们看看observe吧\~

```js
// observe.js
function Observer(data) {
    // 将数据对象保存在this.data属性中
    this.data = data;
    // 调用walk方法来监听数据对象中的所有属性
    this.walk(data);
}

Observer.prototype = {
    // walk方法遍历数据对象中的所有属性并调用defineReactive方法进行监听
    walk: function(data) {
        // 保存当前this指向的值
        var self = this;
        // 遍历数据对象中的所有属性
        Object.keys(data).forEach(function(key) {
            // 调用defineReactive方法对该属性进行监听
            self.defineReactive(data, key, data[key])
        })
    },
    // defineReactive方法对单个属性进行监听
    defineReactive: function(data, key, val) {
        // 创建一个Dep实例
        var dep = new Dep(); 
        // 使用Object.defineProperty方法对该属性进行监听
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            // 获取属性值时，如果有目标依赖，则添加进该属性所属Dep实例的subs数组
            get: function getter() {
                if (Dep.target) {
                    dep.addSub(Dep.target);
                };
                return val;
            },
            // 设置属性值时，如果新旧值不相同，则将新值赋给该属性，并通知该属性所属Dep实例的所有依赖更新
            set: function setter(newVal) {
                if (newVal === val) {
                    return ;
                }
                val = newVal;
                dep.notifiy();
            }
        })
    }
}

// observe函数用于创建Observer实例
export const observe = (value) => {
    // 如果参数不是一个对象，则返回
    if (!value || typeof value !== 'object') {
        return;
    }
    // 创建并返回一个Observer实例
    return new Observer(value);
}

// Dep构造函数用于管理依赖，每个属性都对应一个Dep实例
export const Dep = function() {
    // subs数组保存该属性的所有依赖
    this.subs = []; 
}

Dep.prototype = {
    // addSub方法用于添加一个新的依赖
    addSub: function(sub) {
        this.subs.push(sub);
    },
    // notifiy方法用于通知所有依赖更新
    notifiy: function() {
        this.subs.forEach(function(sub){
            sub.update();
        }) 
    }
}

// 设置一个全局变量Dep.target为null，用于保存当前目标依赖
Dep.target = null;
```

在代码里我们可以看到以下几点：

1.  通过observe劫持的数据，进行遍历把属性和值进行defineProperty代理
2.  而Dep作为订阅者管家来说，此时还没有接受到需要进行管理的数据
3.  添加到Dep里，就要通过在模板编译时进行调用，把Watcher给添加进去

下面是compile部分和index.html，配合打印助于理解：

```html
// index.html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <div id="mvvm-app" style="text-align: center;margin-top: 100px;">
        <input v-model="title">
        <h2>{{title}}</h2>
        <button v-on:click="clickBtn">数据初始化</button>
    </div>
</body>
</html>

```

```js
// compile.js
import Watcher from './watcher';

function Compile(el, vm) {
    // 将Vue实例和根元素挂载到Compile实例上
    this.vm = vm;
    this.el = document.querySelector(el);
    // 创建文档碎片，用于性能优化
    this.fragment = null;
    // 初始化操作
    this.init();
}

Compile.prototype = {
    init: function() {
        if (this.el) {
            // 将根元素转换为文档碎片
            this.fragment = this.nodeToFragment(this.el);
            // 编译文档碎片中的节点
            this.compileElement(this.fragment);
            // 将编译后的文档碎片添加回根元素
            this.el.appendChild(this.fragment);
        } else {
            console.log('DOM元素不存在');
        }
    },
    nodeToFragment: function(el) {
        // 创建文档碎片
        var fragment = document.createDocumentFragment();
        var child = el.firstChild;
        // 遍历根元素下的所有子节点，并将它们添加到文档碎片中
        while(child) {
            fragment.appendChild(child);
            child = el.firstChild;
        }
        return fragment;
    },
    compileElement: function(el) {
        // 获取文档碎片中的所有子节点
        var childNodes = el.childNodes;
        var self = this;
        // 遍历子节点
        [].slice.call(childNodes).forEach(function(node) {
            var reg = /\{\{(.*)\}\}/;// 匹配{{}}
            var text = node.textContent; // 获取节点的文本内容
            if (self.isElementNode(node)) {
                // 如果是元素节点，编译指令事件
                self.compile(node);
            } else if (self.isTextNode(node) && reg.test(text)) {
                // 如果是文本节点，并且包含{{}}，编译文本节点
                self.compileText(node, reg.exec(text)[1]);
            }

            // 递归处理节点的子节点
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
        });
    },
    compile: function (node){
        var nodeAttrs = node.attributes;
        var self = this;
        // 遍历元素节点的所有属性
        Array.prototype.forEach.call(nodeAttrs, function(attr) {
            var attrName = attr.name;
            if (self.isDirective(attrName)) {
                var exp = attr.value; // 获取指令表达式
                var dir = attrName.substring(2); // 获取指令名称（去掉v-前缀）
                if (self.isEventDirective(dir)) {
                    // 如果是事件指令，编译事件
                    self.compileEvent(node, self.vm, exp, dir)
                } else {
                    // 如果是普通指令，编译双向绑定
                    self.compileModel(node, self.vm, exp, dir);
                }
                // 移除指令属性
                node.removeAttribute(attrName);
            }
        })
    },
    isDirective: function(attr) {
        // 判断是否是指令属性
        return attr.indexOf('v-') === 0;
    },
    isEventDirective: function(dir) {
        // 判断是否是事件指令
        return dir.indexOf('on:') === 0;
    },
    compileEvent: function(node, vm, exp, dir) {
        // 编译事件指令
        var eventType = dir.split(':')[1];
        var cb = vm.methods && vm.methods[exp];
        if (eventType && cb) {
            node.addEventListener(eventType, cb.bind(vm), false);
        }
    },
    compileModel: function (node, vm, exp, dir) {
        var self = this;
        var val = this.vm[exp];
        this.modelUpdater(node, val);
        new Watcher(this.vm, exp, function (value) {
            self.modelUpdater(node, value);
        });

        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            self.vm[exp] = newValue;
            val = newValue;
        });
    },
    compileText: function (node, exp) {
        var self = this;
        var initText = this.vm[exp]; // 获取数据的初始值
        this.updateText(node, initText); // 将节点的文本内容更新为数据的初始值
        // 实例化订阅者，并将订阅者加入到订阅器中
        new Watcher(this.vm, exp, function(value) {
            // 当数据改变时，更新节点的文本内容
            self.updateText(node, value);
        })
    },
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    },
    isElementNode:: function(node) {
        // 判断是否是元素节点
        return node.nodeType == 1;
    },
    isTextNode: function(node) {
        // 判断是否是文本节点
        return node.nodeType == 3;
    },
    updateText: function(node, value) {
        // 更新文本节点的内容
        node.textContent = typeof value == 'undefined' ? '' : value;
    }
}

export default Compile;
```

Compile 函数做了以下几件事情：

1.  创建文档碎片，将旧节点挂载到fragment上
2.  通过正则查询模板里的`{{  }}`包裹的文本节点即为普通指令和事件指令
3.  当是`{{ }}`包裹的文本节点时，我们看`compileText`函数此时node为`"hello world"`即为旧节点文本信息，
    exp为`title`，然后实例化订阅者，那我们先看看Watcher里干了什么吧\~

```js
// Watcher.js
import { Dep } from './observer'

function Watcher(vm, exp, cb) {
    // 监听的 Vue 实例
    this.vm = vm;
    // 监听的表达式或属性
    this.exp = exp;
    // 回调函数，当监听的属性发生变化时执行
    this.cb = cb;
    // 初始化时先获取一下当前值
    this.value = this.get()
}

Watcher.prototype = {
    // 获取当前值
    get: function () {
        // 设置 Dep 的静态属性 target 为当前 watcher
        Dep.target = this;
        // 访问数据以便收集依赖
        let value = this.vm.data[this.exp];
        // 收集完成之后将 target 置空
        Dep.target = null;
        return value;
    },
    // 当属性发生变化时更新视图
    update() {
        this.run()
    },
    // 更新视图
    run: function () {
        let value = this.vm.data[this.exp];
        let oldValue = this.value
        // 判断新旧值是否相等，不相等则更新
        if (value !== oldValue) {
            this.value = value;
            // 执行回调函数并将 Vue 实例作为上下文
            this.cb.call(this.vm, value, oldValue)
        }

    }
}


export default Watcher
```

承接上文：

1.  进行实例化订阅者，在`Watcher`里，首先就是给实例缓存下 vm(MVVM实例) 、 exp(普通指令的值此时为title) 和 cb(回调函数) ，也会执行`get`方法，get 方法里把 observe.js 里的 Dep 类即订阅者管家的`target`进行赋值，由于 Dep 实例是响应式的，此时我们回到 observe.js 里查看其 get 方法，把 Watcher 实例添加到 Dep 实例的`sub`数组里，并返回 title 的值 "hello" , target 最后设置为 null 的原因是这个属性本来就是原型上的属性，用来一个触发注册 Watcher 实例到 Dep 实例里的引子。
2.  此时我们完成了普通指令的`Watcher`注册到`Dep`,我们再分析更新的流程是怎么样的。
3.  当`setTimeout`函数执行，`title`的值改变了，因为`title`是响应式的(在`observe.js`里可以看到),就会触发`set`进行发布者告知订阅者更新，也就是调用回调函数在`dom`节点上进行更新。
4.  我们再来看`v-model`指令，一是也注册了`Watcher`实例，二是还绑定监听相应的`input`事件，进行反向绑定。`v-on`指令就是监听了事件，进行反向（单向）绑定。

# 总结

![e5369850-3ac9-11eb-85f6-6fac77c0c9b3.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1ac3531a00d842f5a83af3f228ceae73~tplv-k3u1fbpfcp-watermark.image#?w=730\&h=390\&s=40051\&e=png\&b=fefefe)

看到这里，我们就基本理解了MVVM的核心架构了，下面就分点来进行系统性的概括。

1.  MVVM 中的 VM 也就是业务逻辑层，它的核心就是数据绑定，负责将数据和视图关联起来，数据绑定的核心是双向绑定，对比原生 js 实现双向绑定， vue 对其进行了封装，实现了通用性。
2.  双向绑定的核心思想是基于监听器 `Observer`、订阅器 `Dep`、订阅者 `Watcher`、解析器 `Compile`和`Object.defineProperty()`来实现的。
3.  双向绑定实现流程：
    *   创建`Vue`实例、将`data`进行`Object.defineProperty()`代理，方便后续修改 data 的值会对应触发`set`方法来改变属性值（还可能执行其他函数）。
    *   监听器` Observer `通过`Object.defineProperty()`对`data`的每个属性值创建空的订阅器`Dep`实例进行监听
    *   解析器` Compile `通过递归编译`DOM`元素，会获取`Vue`实例的`data`属性值，再对插值表达式`{{}}`和`v-model`指令进行绑定数据并创建订阅者`Watcher`实例，此时会触发`Observe`的`get`方法，进而订阅器`Dep`实例就会收集订阅者`Watcher`实例。
    *   当`data`的属性值改变，就会触发`set`进行发布者告知订阅者更新，也就是调用回调函数在`dom`节点上进行更新。
