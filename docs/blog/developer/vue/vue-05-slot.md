---
title: Vue源码学习-插槽
slug: vue-05-slot
category: 'frontend'
publishDate: '2023-7-18'
tags: ['前端', 'Vue']
coverImage: /icons/vuejs.svg
featured: true
---

# 基本使用

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/64f1647442514dca8d6ed2b8e1e4eab8~tplv-k3u1fbpfcp-watermark.image#?w=185\&h=239\&s=4435\&e=png\&b=ffffff)

```js
// App.vue
<template>
  <Comp>
      <p>default slot</p>
      <template v-slot:slot1>
        <p>slot1</p>
      </template>
      <template #slot2="{ msg }" >
        <p>slot2:{{ msg }}</p>
      </template>
      <template v-slot:customSlot>
        <p>slot3</p>
      </template>
  </Comp>
</template>
<script setup>
import Comp from './Comp.vue'

</script>


```

```js
// Comp.vue
<template>
    <div>
        <slot></slot>
        <slot name="slot1"></slot>
        <slot name="slot2" msg="hello world"></slot>
        <slot :name="slotName">
            <!-- 默认插槽内容 -->
            默认插槽内容
        </slot>
    </div>
</template>
<script setup>
import { ref } from 'vue'

const slotName = ref('defaultSlot');

</script>

```

插槽的使用分为三大类，上面的代码均有体现怎么使用：

*   默认插槽
*   具名插槽
*   动态插槽名

# 解析本质

我们把组件以`js`的形式暴露：

```js
// Comp.js
import { createElementVNode } from 'vue'
export default {
    setup(props, { slots }) {
        console.log(slots);
        return () => {
            return createElementVNode('div', null, []);
        };
    },
};
```

这里不了解`createElementVNode`的同学可以认作是创造了虚拟节点，我们看一看`slots`的打印结果：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fbe5404c54be49608a3b575bcfbf712b~tplv-k3u1fbpfcp-watermark.image#?w=842\&h=238\&s=22101\&e=png\&b=ffffff)

我们可以看到：

*   `slot`本质是`Proxy`代理的对象
*   在Target里，里面进行插槽的设置本质都是函数形式的调用

我们再看看调用了该函数会发生什么：

```js
// Comp.js
import { createElementVNode } from 'vue'
export default {
    setup(props, { slots }) {
        const _default = slots.default();
        console.log(_default);
        return () => {
            return createElementVNode('div', null, []);
        };
    },
};
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0833ac759a954a3ab15d9214b5d7b395~tplv-k3u1fbpfcp-watermark.image#?w=383\&h=621\&s=33468\&e=png\&b=ffffff)

很明显，是一个虚拟Dom节点对象。

完整实现的代码：

```js
// Comp.js
import { createElementVNode } from 'vue'
export default {
    setup(props, { slots }) {
        const _default = slots.default();
        const _slot1 = slots.slot1();
        const _slot2 = slots.slot2({ msg: 'hello' });
        const _slotName = slots.customSlot();
        return () => {
            return createElementVNode('div', null, [
                ..._default,
                ..._slot1,
                ..._slot2,
                ..._slotName
            ]);
        };
    },
};
```

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4132e776491e4ec98f113a331a30d95e~tplv-k3u1fbpfcp-watermark.image#?w=260\&h=355\&s=3913\&e=png\&b=ffffff)

# 总结

*   Vue 插槽的本质就是进行函数的调用
*   无论是默认插槽、具名插槽和动态插槽名，其本质就是在用`proxy`进行代理的`slots`对象上添加函数方法，在父组件里进行了函数的调用，创造出对应的虚拟节点
