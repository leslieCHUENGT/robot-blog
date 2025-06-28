---
title: 源码学习-axios拦截器
slug: axios-01
category: 'frontend'
publishDate: '2023-5-28'
tags: ['前端', 'axios']
coverImage: /icons/axios.svg
featured: true
---

# 题目

```js
// 发送请求的函数
function dispatchRequest(config){
  console.log('发送请求');
  return new Promise((resolve, reject) => {
    resolve({
      status: 200,
      statusText: 'OK'
    });
  });
}
......
// 设置两个请求拦截器
axios.interceptors.request.use(function one(config) {
  console.log('请求拦截器 成功 - 1号');
  return config;
}, function one(error) {
  console.log('请求拦截器 失败 - 1号');
  return Promise.reject(error);
});

axios.interceptors.request.use(function two(config) {
  console.log('请求拦截器 成功 - 2号');
  return config;
}, function two(error) {
  console.log('请求拦截器 失败 - 2号');
  return Promise.reject(error);
});

// 设置两个响应拦截器
axios.interceptors.response.use(function (response) {
  console.log('响应拦截器 成功 1号');
  return response;
}, function (error) {
  console.log('响应拦截器 失败 1号')
  return Promise.reject(error);
});

axios.interceptors.response.use(function (response) {
  console.log('响应拦截器 成功 2号')
  return response;
}, function (error) {
  console.log('响应拦截器 失败 2号')
  return Promise.reject(error);
});


// 发送请求
axios({
  method: 'GET',
  url: 'http://localhost:3000/posts'
}).then(response => {
  console.log(response);
});

// 输出结果
请求拦截器 成功 - 2号
请求拦截器 成功 - 1号
发送请求
响应拦截器 成功 1号
响应拦截器 成功 2号
```

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f802b93fccc94f26af69d40429b11023~tplv-k3u1fbpfcp-zoom-1.image#?w=692\&h=213\&s=20926\&e=webp\&b=fcf6f4)

上图就是整个流程的示意图

啊？到底咋回事啊?还是翻翻源码看看axios拦截器的机制吧\~

如果只对题目感兴趣的同学可以直接去第四部分。开始吧\~

# 1.源码项目结构

    ├── /dist/ 			# 输出目录
    ├── /lib/ 			# 源码目录
    │ ├── /adapters/ 		# 定义请求的适配器
    │ │ ├── http.js 	        # 实现 http 适配器(包装 http 包)
    │ │ └── xhr.js 	                # 实现 xhr 适配器(包装 xhr 对象)
    │ ├── /cancel/ 		        # 定义取消功能
    │ ├── /core/ 			# 核心功能
    │ │ ├── Axios.js 		        # axios 的核心功能
    │ │ ├── dispatchRequest.js 	        # 根据环境发送相应请求的函数
    │ │ ├── InterceptorManager.js 	        # 拦截器管理
    │ │ └── settle.js 		        # 根据 http 响应状态，改变 Promise 的状态
    │ ├── /helpers/ 		# 辅助工具函数
    │ ├── axios.js 			# 对外暴露接口
    │ ├── defaults.js 		# axios 的默认配置
    │ └── utils.js 			# 公用工具
    ├── package.json 		# 项目信息
    ├── index.d.ts 			# 配置 Typescript 的声明文件
    └── index.js 			# 入口文件

# 2.axios 创建实例过程

```js
// \node_modules\axios\lib\axios.js

......
// 导入默认配置
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 * 创建一个 Axios 的实例对象
 */
function createInstance(defaultConfig) {
  // 创建一个实例对象 context，此时它身上有 get、post、put等方法可供我们调用
  var context = new Axios(defaultConfig);	// 此时，context 不能当函数使用  
  // 将 request 方法的 this 指向 context 并返回新函数，此时，instance 可以用作函数使用, 
  // 且其与 Axios.prototype.request 功能一致，且返回的是一个 promise 对象
  var instance = bind(Axios.prototype.request, context);
  // 将 Axios.prototype 和实例对象 context 的方法都添加到 instance 函数身上
  // 也就是说，我们此后可以通过 instance.get instance.post ... 的方式发送请求
  utils.extend(instance, Axios.prototype, context);
  utils.extend(instance, context);

  return instance;
}

// 通过配置创建 axios 函数，
// 下面的defaults就是上方顶部通过require('./defaults') 引入的默认配置，
// 就是此前我们提到的，可以通过 axios.defaults.xxx 的方式设置的默认配置
var axios = createInstance(defaults);

// 工厂函数  用来返回创建实例对象的函数
axios.create = function create(instanceConfig) {
    return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose all/spread
axios.all = function all(promises) {
    return Promise.all(promises);
};
```

得到的信息：

1.  `axios`实例对象是由`createInstance`函数创建的
2.  `createInstance `函数内部主要功能是把` Axios` 构造函数的属性、原型上的`request`方法和原型都添加到`axios`实例对象上
3.  作用是将` Axios` 实例封装成一个函数，使得调用时更加简单直观，不再需要实例化`Axios`对象。

## 2.1 content 变量(Axios 实例对象)

```js
    // \node_modules\axios\lib\core\Axios.js

    // Axios 构造函数文件

    // 引入工具
    var InterceptorManager = require('./InterceptorManager');
    // 引入发送请求的函数
    var dispatchRequest = require('./dispatchRequest');
    ......

    /**
     * 创建 Axios 构造函数
     */
    function Axios(instanceConfig) {
      // 实例对象上的 defaults 属性为配置对象
      this.defaults = instanceConfig;
      // 实例对象上有 interceptors 属性，用来设置请求和响应拦截器
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
      };
    }

    /**
     * 发送请求的方法.  原型上配置, 则实例对象就可以调用 request 方法发送请求
     */
    Axios.prototype.request = function request(config) {
      ......
      var promise = Promise.resolve(config);
      ......
      return promise;
    }

    // 在通过 Axios() 构造函数创建出来的实例对象上添加 get、post、put等方法
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
        /*eslint func-names:0*/
        Axios.prototype[method] = function (url, config) {
            return this.request(utils.merge(config || {}, {
                method: method,
                url: url
            }));
        };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
        /*eslint func-names:0*/
        Axios.prototype[method] = function (url, data, config) {
            return this.request(utils.merge(config || {}, {
                method: method,
                url: url,
                data: data
            }));
        };
    });
```

先回忆一下 axios.request()、axios.post()方法的使用：

```js
axios.request({
     method:'GET',
     url: 'http://localhost:3000/comments'
}).then(response => {
    console.log(response);
})
axios.post(
    'http://localhost:3000/comments', 
{
     "body": "喜大普奔",
     "postId": 2
}).then(response => {
    console.log(response);
})
```

得到的信息：

1.  `context` 变量身上有 `defaults` 配置对象和 `interceptors` 拦截器这两个属性。
2.  通过 utils.forEach() 函数使得 content 变量上绑定了各种发送请求的方法(在 2 中有体现),而各种请求方法实质上都是调用了 Axios.prototype.request 方法。
3.  创建一个`Axios`实例对象`content`的作用就是方便将 `defaults` 配置对象和 `interceptors` 拦截器这两个属性添加到`instance`变量上，最终目的是为了大标题 2 中的第三个信息。我们继续往下看\~

## 2.2 instance 变量

```js
// 将 request 方法的 this 指向 context 并返回新函数，此时，instance 可以用作函数使用, 
// 且其与 Axios.prototype.request 功能一致，且返回的是一个 promise 对象
var instance = bind(Axios.prototype.request, context);
// 将 Axios.prototype 和实例对象 context 的方法都添加到 instance 函数身上
// 也就是说，我们此后可以通过 instance.get instance.post ... 的方式发送请求
utils.extend(instance, Axios.prototype, context);
utils.extend(instance, context);
```

![9174b84037ae4932a2205bd13fd09bb0\~tplv-k3u1fbpfcp-watermark.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/896d876625964047b3b9b3241846c329~tplv-k3u1fbpfcp-watermark.image#?w=1337\&h=482\&s=52735\&e=png\&b=ffffff)

这样我们就把`Axios`实例对象函数化了。

## 2.3 axios.create() 工厂函数

```js
// 工厂函数  用来返回创建实例对象的函数
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};
```

在实际开发中，使用`axios.create()`函数创建Axios实例是很常见的,并非单例模式。

## axios 和 Axios 的关系

其实就是区别 `axios` 和上文提到的 `context` 。

*   从语法上来说: `axios` 不是 `Axios` 的实例（上文提到的 `context` 才是）
*   从功能上来说: `axios` 是 `Axios` 的实例（主要是上方提到的 `bind()` 和 `extend()` 函数的功劳）
*    `axios` 作为对象，有 `Axios` 原型对象上的所有方法，有 `Axios` 对象上所有属性
*    `axios` 是 `Axios.prototype.request` 函数 `bind()` 返回的函数

## instance 与 axios 的区别

1.  相同: (1) 都是一个能发任意请求的函数: `request(config)` (2) 都有发特定请求的各种方法: `get()/post()/put()/delete()` (3) 都有默认配置和拦截器的属性: `defaults/interceptors`

2.  不同: (1) 默认配置很可能不一样 (2) `instance` 没有 `axios` 后面添加的一些方法: `create()/CancelToken()/all()`

我觉得可以这样认为：`axios` 可以看做是 `instance` 的超集。主要是因为 `axios` 被创建出来之后，源码中还在其身上添加了诸如 `create()`、`all()` 、`CancelToken()`、`spread()`这些方法和 `Axios` 属性。

# 3. axios 发送请求过程

先回忆一下 axios 最基本的用法：

```js
axios({
    //请求类型
    method: 'PUT',
    //URL
    url: 'http://localhost:3000/posts/3',
    //设置请求体
    data: {
        title: "今天天气不错, 还挺风和日丽的",
        author: "李四"
    }
}).then(response => {
    console.log(response);
});
```

源码部分：

```js
// \node_modules\axios\lib\core\Axios.js

// 这个函数是用于发送请求的中间函数，真正发送AJAX请求的操作是被封装在
// \node_modules\axios\lib\adapters\xhr.js 这个文件中的
Axios.prototype.request = function request(config) {
  // 下面这个 if 判断主要是允许我们通过 axios('http://www.baidu.com', {header:{}})
  // 的方式来发送请求，若传入的config是字符串格式，则将第一个参数当做url，第二个参数当做配置对象
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }
  //将默认配置与用户调用时传入的配置进行合并
  config = mergeConfig(this.defaults, config);

  // 设定请求方法
  // 如果我们传入的配置对象中指定了请求方法，则按这个指定的方法发送相应请求
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    // 如果我们没有指定请求方法，且默认配置中指定了请求方法，则按默认配置中的请求方法发送相应请求
    config.method = this.defaults.method.toLowerCase();
  } else {
    // 如果传入的自定义配置和默认配置中都没有指定，那么就默认发送 get 请求
    config.method = 'get';
  }
  
 // 创建拦截器中间件，第一个元素是一个函数，用来发送请求；第二个为 undefined（用来补位）
  var chain = [dispatchRequest, undefined];
  // 创建一个 promise 对象，且其状态一定是成功的，同时其成功的值为合并后的请求配置对象
  var promise = Promise.resolve(config);
  
  // 下面是是有关拦截器的相关设置，暂且不做讨论
  ......
  
  // 如果链条长度不为 0
  while (chain.length) {
    // 依次取出 chain 的回调函数, 并执行
    promise = promise.then(chain.shift(), chain.shift());
  }
  
  // 最后返回一个Promise类型的对象
  return promise;
};
```

得到的信息：

1.  根据使用`axios`发送请求的参数进行配置具体的发送方法
2.  最终是通过`dispatchRequest`函数进行发送

# 3.1 dispatchRequest 函数

```js
// \node_modules\axios\lib\core\dispatchRequest.js

// 使用配置好的适配器发送一个请求
module.exports = function dispatchRequest(config) {
  //如果被取消的请求被发送出去, 抛出错误
  throwIfCancellationRequested(config);

  //确保头信息存在
  config.headers = config.headers || {};

  // 对请求数据进行初始化转化
  config.data = transformData(
    ......
  );

    // 合并一切其他头信息的配置项
  config.headers = utils.merge(
    ......
  );

  // 将配置项中关于方法的配置项全部移除，因为上面已经合并了配置
  utils.forEach(
    ......
  );

  // 获取适配器对象 http  xhr
  var adapter = config.adapter || defaults.adapter;

  // 发送请求， 返回请求后 promise 对象  ajax HTTP
  return adapter(config).then(function onAdapterResolution(response) {
    // 如果 adapter 中成功发送AJAX请求，则对响应结果中的数据做一些处理并返回成功的Promise
    ......
    // 设置 promise 成功的值为 响应结果
    return response;
  }, function onAdapterRejection(reason) {
    // 如果 adapter 中发送AJAX请求失败，则对失败原因做些处理并返回失败的Promise
    ......
    // 设置 promise 为失败, 失败的值为错误信息
    return Promise.reject(reason);
  });
};
```

得到的信息：

1.  根据适配器`adapter`根据环境发送`ajax`或者`http`请求。
2.  请求发送返回的结果是`Promise`实例对象

# 3.3 xhrAdapter 函数

由于源代码代码过长，展示部分截图：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6b3c45346c504da9876ca010f298ec7f~tplv-k3u1fbpfcp-watermark.image#?w=1552\&h=531\&s=107343\&e=png\&b=1e1e1e)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e84bb1183c0f47d3a217976793d365ec~tplv-k3u1fbpfcp-watermark.image#?w=1127\&h=690\&s=111887\&e=png\&b=1e1e1e)

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c1686678ac3247cbb37f0c050b9529a7~tplv-k3u1fbpfcp-watermark.image#?w=1558\&h=756\&s=140163\&e=png\&b=1e1e1e)

功能：发送`XMLHttpRequest`请求，并处理请求的各种事件和状态，包括超时、网络错误、请求取消等，最终返回一个`Promise`对象。

# 3.4 发送请求的流程

![6b8f64561a2349478f70f16ef9c02032\~tplv-k3u1fbpfcp-zoom-1.webp](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cc477ff3488f4edeb46db2fa6bd4a13d~tplv-k3u1fbpfcp-watermark.image#?w=1262\&h=539\&s=31404\&e=webp\&b=fffefe)

# 4.axios拦截器工作原理

先回忆一下拦截器的基本使用：

```js
// 请求拦截器1
axios.interceptors.request.use(function (config) {
  return config;
}, function (error) {
  return Promise.reject(error);
});

// 响应拦截器1
axios.interceptors.response.use(function (response) {
  return response;
}, function (error) {
  return Promise.reject(error);
});
```

## 4.1 interceptors.request 和 interceptors.response 两个属性

前面讨论 `axios` 创建实例的过程时，在 `Axios.js` 这个文件的构造函数 `Axios(){...}` 中，源码往实例对象身上添加了 `interceptors` 这个对象属性。而这个对象属性又有 `request` 和 `response` 这两个属性。

```js
    // \node_modules\axios\lib\core\Axios.js
    ......
    
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      //实例对象上有 interceptors 属性用来设置请求和响应拦截器
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
      };
    }
    ......
```

## 4.2 InterceptorManager 构造函数

而这两个属性都是由 `InterceptorManager()` 构造函数创建出来的实例对象。`use()` 函数则是 `InterceptorManager` 原型对象身上的一个函数属性，所以 `request` 和 `response` 这两个属性才可以调用该函数。

```js

    // \node_modules\axios\lib\core\InterceptorManager.js
    ......
    function InterceptorManager() {
      // 创建一个handlers属性，用于保存 use() 函数传进来的两个回调函数参数
      this.handlers = [];
    }

    // 添加拦截器到栈中, 以待后续执行, 返回拦截器的编号(编号为当前拦截器综合数减一)
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };
    ......
```

## 4.3 use() 函数

而 `use()` 函数的作用就是将传入 `use()` 的两个回调函数 `fulfilled` 和 `rejected` 包装在一个对象中（*这个对象就算是一个拦截器*），再保存在 `InterceptorManager` 实例对象（也就是上面提到的 `request` 或 `response` 对象属性）身上的 `handlers` 数组上。

*每调用一次 `use()` 函数都会在相应的 `request` 或 `response` 对象属性身上压入一个包含一对回调函数的对象*。

## 4.4 在 Axios.prototype.request 函数中遍历实例对象的拦截器并压入 chain

我们知道，给某个请求添加拦截器（无论是响应拦截器还是请求拦截器）都是在发送请求之前进行的操作。所以此时就又要回到 `\node_modules\axios\lib\core\Axios.js` 中的 `Axios.prototype.request` 函数。

```js
// \node_modules\axios\lib\core\Axios.js

// 这个函数是用于发送请求的中间函数，真正发送AJAX请求的操作是被封装在
// \node_modules\axios\lib\adapters\xhr.js 这个文件中的
Axios.prototype.request = function request(config) {
  if (typeof config === 'string') {
    ......
  }
  config = mergeConfig(this.defaults, config);
  if (config.method) {
    ......
  }
	
  // 创建拦截器中间件，第一个元素是一个函数，用来发送请求；第二个为 undefined（用来补位）
  var chain = [dispatchRequest, undefined];
  // 创建一个成功的 promise 且其结果值为合并后的请求配置
  var promise = Promise.resolve(config);
  // 遍历实例对象的请求拦截器
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    // 将请求拦截器压入数组的最前面
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  // 遍历实例对象的响应拦截器
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    // 将响应拦截器压入数组的最尾部
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // 如果链条长度不为 0
  while (chain.length) {
    // 依次取出 chain 的回调函数, 并执行
    promise = promise.then(chain.shift(), chain.shift());
  }
  
  // 最后返回一个Promise类型的对象
  return promise;
};
```

得到的信息：

1.  我们设置拦截器的时候会传递两个回调函数`fulfilled` 和 `rejected`，`Axios`实例对象上有 `interceptor`属性，可以进行设置相应的拦截器，无论是请求还是响应拦截，都是同一个`InterceptorManager`类进行操作的。
2.  `InterceptorManager`类的`use`方法里的`handlers`属性保存两个回调函数`fulfilled` 和 `rejected`的对象。
3.  我们还记得`config`吗？它的传递实际上是通过会通过`Promise`的链式调用传递`config`参数，所以我们可以看到`Promise.resolve(config)`,那`chain`变量是怎么回事呢？它负责发送请求，返回一个`Promise`对象,等会它会**被拦截器"夹在"中间**。
4.  然后遍历拦截器，`unshift()`方法使得*请求拦截器*添加到`chain`头部,`push()`方法会使得响应拦截器添加到`chain`尾部，如此一来，一条链子就穿好了嘿嘿。
5.  最后通过`Promise` 的链式调用，将拦截器的一对回调函数`fulfilled` 和 `rejected`、`[dispatchRequest, undefined]`弹出,那么就完美的实现了拦截器的功能！

## 4.5、大致流程图&拦截器工作先后顺序

大概流程如下图所示：

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f802b93fccc94f26af69d40429b11023~tplv-k3u1fbpfcp-zoom-1.image#?w=692\&h=213\&s=20926\&e=webp\&b=fcf6f4)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2c3c2445bb264b6f847800b0bbc6cb2e~tplv-k3u1fbpfcp-watermark.image#?w=614\&h=356\&s=127081\&e=png\&b=fefdfd)

以上图示来自尚硅谷相关课程

> 注意，对于请求拦截器：上面的【请求拦截器1】是在【请求拦截器2】之前被压入 `chain` 数组*头部*的，但是【请求拦截器2】的下标位置比较靠前，这也是为什么\*【请求拦截器2】中的回调会先被执行\*。
>
> 而对于响应拦截器：上面的【响应拦截器1】是在【响应拦截器2】之前被压入 `chain` 数组*尾部*的，但是【响应拦截器1】的下标位置比较靠前，这也是为什么\*【响应拦截器1】中的回调会先被执行\*。

观察下面代码的输出结果：

```js
......
// 发送请求的函数
function dispatchRequest(config){
  console.log('发送请求');
  return new Promise((resolve, reject) => {
    resolve({
      status: 200,
      statusText: 'OK'
    });
  });
}
......
// 设置两个请求拦截器
axios.interceptors.request.use(function one(config) {
  console.log('请求拦截器 成功 - 1号');
  return config;
}, function one(error) {
  console.log('请求拦截器 失败 - 1号');
  return Promise.reject(error);
});

axios.interceptors.request.use(function two(config) {
  console.log('请求拦截器 成功 - 2号');
  return config;
}, function two(error) {
  console.log('请求拦截器 失败 - 2号');
  return Promise.reject(error);
});

// 设置两个响应拦截器
axios.interceptors.response.use(function (response) {
  console.log('响应拦截器 成功 1号');
  return response;
}, function (error) {
  console.log('响应拦截器 失败 1号')
  return Promise.reject(error);
});

axios.interceptors.response.use(function (response) {
  console.log('响应拦截器 成功 2号')
  return response;
}, function (error) {
  console.log('响应拦截器 失败 2号')
  return Promise.reject(error);
});


// 发送请求
axios({
  method: 'GET',
  url: 'http://localhost:3000/posts'
}).then(response => {
  console.log(response);
});

// 输出结果
请求拦截器 成功 - 2号
请求拦截器 成功 - 1号
发送请求
响应拦截器 成功 1号
响应拦截器 成功 2号
```

# 5. axios的取消过程

先回忆一下基本用法：

```js
// 方式一
const cancelToken = new axios.CancelToken(cancel => {// 创建一个 CancelToken 类实例
  // 在这里执行取消操作
  setTimeout(() => {
    console.log('取消请求');
    cancel('用户手动取消');
  }, 1000);
});

// 发起 GET 请求
axios.get('https://jsonplaceholder.typicode.com/posts', {
  cancelToken: cancelToken
})
  .then(response => console.log(response.data))
  .catch(error => {
    if (axios.isCancel(error)) {
      console.log('请求已被取消：', error.message);
    } else {
      console.error(error);
    }
});

// 方式二
const source = axios.CancelToken.source();// 创建一个 CancelToken

// 发起 GET 请求
axios.get('https://jsonplaceholder.typicode.com/posts', {
  cancelToken: source.token
})
  .then(response => console.log(response.data))
  .catch(error => {
    if (axios.isCancel(error)) {
      console.log('请求已被取消：', error.message);
    } else {
      console.error(error);
    }
  });

// 取消请求
source.cancel('用户取消了请求');

```

# 5.1 取消 axios 请求的底层代码

```js
// \node_modules\axios\lib\adapters\xhr.js
......
//如果我们发送请求时传入的配置对象中配置了 cancelToken，则调用 then 方法设置成功的回调
if (config.cancelToken) {
  config.cancelToken.promise.then(function onCanceled(cancel) {
    if (!request) {
      return;
    }
    //取消请求
    request.abort();
    reject(cancel);
    request = null;
  });
}
......
```

得到的信息：

1.  实际上就是调用了 `XMLHttpRequest` 对象身上的 `abort()` 方法
2.  只有当`config.cancelToken.promise`这个`Promise`对象的状态转为`fulfilled`了才能执行 `abort()` 方法
3.  我们可以推测一定是在外面调用了该函数，状态才改变了

# 5.2 cancelToken 构造函数

```js
function CancelToken(executor) {
    //执行器函数必须是一个函数
    if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
    }

    //声明一个变量
    var resolvePromise; //  resolvePromise()
    //实例对象身上添加 promise 属性
    this.promise = new Promise(function promiseExecutor(resolve) {
        //将修改 promise 对象成功状态的函数暴露出去
        resolvePromise = resolve;
    });
    // token 指向当前的实例对象
    var token = this;
    //将修改 promise 状态的函数暴露出去, 通过 cancel = c 可以将函数赋值给 cancel
    executor(function cancel(message) {
        if (token.reason) {
            // 已经申请取消
            return;
        }

        token.reason = new Cancel(message);
        resolvePromise(token.reason);
    });
}

CancelToken.source = function source() {
    var cancel;
    var token = new CancelToken(function executor(c) {
        cancel = c;
    });
    return {
        token: token,
        cancel: cancel
    };
};

```

分析取消 axios 的流程：

1.  方法一：创建一个`CancelToken`类实例，参数`cancel`就是`cancelToken`函数里参数`executor`的回调函数，当执行`cancel('用户手动取消')`函数时，也就是执行了回调函数，那么`this.promise`的状态就改变了。
2.  方法二：调用`axios.CancelToken.source()`，返回值是一个对象，对象的属性是新创建的`CancelToken` 实例和其参数`executor`的回调函数，后续的流程和方式一一样。
3.  需要特别注意的是：取消`axios`必须在`config`里配置`cancelToken`，因为传入的配置对象中配置了 `cancelToken`才会执行下一步的可能；其次就是大家有没有注意到`cancelToken`函数里定义的token.reason,可以防止多次取消。

![c1afc0fc153e43d2a8e1c57d31596341\~tplv-k3u1fbpfcp-watermark.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/12de67fc4e944b0284bcbe4927659ad5~tplv-k3u1fbpfcp-watermark.image#?w=1299\&h=231\&s=35640\&e=png\&b=ffffff)
