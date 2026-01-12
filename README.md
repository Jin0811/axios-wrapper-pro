# Axios Wrapper Pro

一个功能丰富的 Axios 封装库，提供请求去重、取消、重试、拦截器管理等功能。

## 特性

- ✅ **请求去重**：基于请求方法、URL、参数和数据生成唯一标识，避免重复请求
- ✅ **请求取消**：支持使用 `requestKey` 取消指定请求或取消所有请求
- ✅ **请求重试**：支持配置重试次数、延迟和条件
- ✅ **拦截器管理**：支持动态设置请求和响应拦截器
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **请求头管理**：支持设置、批量设置和移除请求头
- ✅ **Symbol 支持**：请求键支持字符串和 Symbol 类型

## 安装

```bash
npm install axios-wrapper-pro
```

## 使用方法

### 基本使用

```typescript
import { AxiosWrapperPro } from 'axios-wrapper-pro';

const axiosWrapperPro = new AxiosWrapperPro({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// GET 请求
const response = await axiosWrapperPro.get('/users');

// POST 请求
const response = await axiosWrapperPro.post('/users', { name: 'John' });
```

### 配置重试

```typescript
// 全局重试配置
const axiosWrapperPro = new AxiosWrapperPro({
  retry: {
    count: 3,
    delay: 1000,
    condition: (error) => {
      // 网络错误或 5xx 错误时重试
      if (!error?.response) return true;
      return error?.response?.status >= 500;
    }
  }
});

// 单次请求重试配置
await axiosWrapperPro.get('/users', {
  retry: {
    count: 2,
    delay: 500
  }
});
```

### 请求去重和取消

```typescript
// 使用 requestKey 进行请求去重
const response1 = await axiosWrapperPro.get('/users', {
  requestKey: 'get-users'
});
// 相同的 requestKey 会取消之前的请求
const response2 = await axiosWrapperPro.get('/users', {
  requestKey: 'get-users'
});

// 使用 Symbol 作为 requestKey
const myKey = Symbol('my-request');
await axiosWrapperPro.get('/data', { requestKey: myKey });

// 取消指定请求
axiosWrapperPro.cancelRequest('get-users');
// 取消所有请求
axiosWrapperPro.cancelAllRequests();
```

### 拦截器管理

```typescript
// 设置请求拦截器
axiosWrapperPro.setRequestInterceptor(
  (config) => {
    // 请求拦截逻辑
    return config;
  },
  (error) => {
    // 请求错误拦截逻辑
    return Promise.reject(error);
  }
);

// 设置响应拦截器
axiosWrapperPro.setResponseInterceptor(
  (response) => {
    // 响应拦截逻辑
    return response;
  },
  (error) => {
    // 响应错误拦截逻辑
    return Promise.reject(error);
  }
);
```

### 请求头管理

```typescript
// 设置单个请求头
axiosWrapperPro.setHeader('Authorization', 'Bearer token');

// 批量设置请求头
axiosWrapperPro.setHeaders({
  'X-Custom-Header': 'value',
  'X-Another-Header': 'value'
});

// 移除请求头
axiosWrapperPro.removeHeader('X-Custom-Header');
```

## API

### AxiosWrapperPro

#### 构造函数

```typescript
new AxiosWrapperPro(options?: AxiosWrapperProOptions)
```

**参数:**

- `options` {AxiosWrapperProOptions} 配置选项
  - `baseURL` {string} 基础 URL
  - `timeout` {number} 超时时间（毫秒）
  - `headers` {Record<string, string>} 默认请求头
  - `paramsSerializer` {(params: any) => string} 参数序列化函数
  - `interceptors` {Partial<InterceptorConfig>} 拦截器配置
  - `retry` {Partial<RetryConfig>} 重试配置

#### 方法

##### `get(url, options?)`

发起 GET 请求。

##### `post(url, data?, options?)`

发起 POST 请求。

##### `put(url, data?, options?)`

发起 PUT 请求。

##### `delete(url, options?)`

发起 DELETE 请求。

##### `patch(url, data?, options?)`

发起 PATCH 请求。

##### `request(method, url, config?)`

通用请求方法。

##### `cancelRequest(key, reason?)`

取消指定请求。

##### `cancelAllRequests(reason?)`

取消所有请求。

##### `setRequestInterceptor(interceptor, errorInterceptor)`

设置请求拦截器。

##### `setResponseInterceptor(interceptor, errorInterceptor)`

设置响应拦截器。

##### `setHeader(key, value)`

设置单个请求头。

##### `setHeaders(headers)`

批量设置请求头。

##### `removeHeader(key)`

移除请求头。

##### `getBaseURL()`

获取基础 URL。

##### `setBaseURL(url)`

设置基础 URL。

##### `getInstance()`

获取 Axios 实例。

## 类型定义

### RequestKey

```typescript
type RequestKey = string | symbol;
```

请求键类型，支持字符串和 Symbol。

### RetryConfig

重试配置接口：

- `count` {number} 重试次数
- `delay` {number} 重试延迟（毫秒）
- `condition` {(error: AxiosError) => boolean} 重试条件判断函数

### InterceptorConfig

拦截器配置接口：

- `request` {(config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig} 请求拦截器
- `requestError` {(error: AxiosError) => Promise<any>} 请求错误拦截器
- `response` {(response: AxiosResponse) => AxiosResponse} 响应拦截器
- `responseError` {(error: AxiosError) => Promise<any>} 响应错误拦截器

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT