# JavaScript 异步编程：Promise、async/await 深度解析

JavaScript 是单线程语言，异步编程是它的核心特性。从回调函数到 Promise 再到 async/await，异步方案在不断进化。

## 回调函数的问题

```javascript
// 回调地狱
getData(function(a) {
    getMoreData(a, function(b) {
        getEvenMoreData(b, function(c) {
            console.log(c);
        });
    });
});
```

问题：嵌套深、错误处理困难、代码难以维护。

## Promise

Promise 是一个代表异步操作最终结果的对象，有三种状态：

- **pending**：进行中
- **fulfilled**：已成功
- **rejected**：已失败

### 基本用法

```javascript
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        const success = true;
        if (success) {
            resolve('数据获取成功');
        } else {
            reject(new Error('获取失败'));
        }
    }, 1000);
});

promise
    .then(data => console.log(data))
    .catch(err => console.error(err));
```

### 链式调用

```javascript
fetch('/api/user')
    .then(res => res.json())
    .then(user => fetch(`/api/posts?userId=${user.id}`))
    .then(res => res.json())
    .then(posts => console.log(posts))
    .catch(err => console.error('请求失败:', err));
```

### 并发控制

```javascript
// 全部完成
const [users, posts] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json())
]);

// 任一完成
const fastest = await Promise.race([
    fetch('/api/server1'),
    fetch('/api/server2')
]);

// 全部结束（不管成功失败）
const results = await Promise.allSettled([
    fetch('/api/a'),
    fetch('/api/b')
]);
```

## async/await

async/await 是 Promise 的语法糖，让异步代码看起来像同步代码：

```javascript
async function getUserPosts(userId) {
    try {
        const userRes = await fetch(`/api/user/${userId}`);
        const user = await userRes.json();

        const postsRes = await fetch(`/api/posts?userId=${user.id}`);
        const posts = await postsRes.json();

        return posts;
    } catch (err) {
        console.error('获取失败:', err);
        throw err;
    }
}
```

### 常见陷阱

**不必要的串行等待：**

```javascript
// 错误：两个请求串行执行
const users = await getUsers();
const posts = await getPosts();

// 正确：两个请求并行执行
const [users, posts] = await Promise.all([
    getUsers(),
    getPosts()
]);
```

**循环中的 await：**

```javascript
// 串行（慢）
for (const id of ids) {
    const data = await fetchData(id);
}

// 并行（快）
const results = await Promise.all(
    ids.map(id => fetchData(id))
);
```

## 错误处理最佳实践

```javascript
// 方式 1: try/catch
async function doSomething() {
    try {
        const result = await riskyOperation();
        return result;
    } catch (err) {
        // 处理错误
        return defaultValue;
    }
}

// 方式 2: catch 链
const result = await riskyOperation().catch(err => defaultValue);
```

## 事件循环简述

理解异步的关键是事件循环（Event Loop）：

1. 同步代码在调用栈执行
2. 异步回调放入任务队列
3. 微任务（Promise.then）优先于宏任务（setTimeout）
4. 调用栈清空后，从队列取任务执行

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 输出: 1 4 3 2
```

## 小结

现代 JavaScript 异步编程推荐使用 async/await + Promise.all，代码清晰且性能好。理解事件循环机制有助于避免各种异步陷阱。
