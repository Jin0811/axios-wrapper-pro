import axios, { AxiosError } from "axios";

/**
 * @description 判断一个变量是否为函数
 * @param {unknown} variable 要判断的变量
 * @returns {boolean} 如果变量是函数则返回true，否则返回false
 */
export function isFunction(variable: unknown): variable is Function {
  return typeof variable === "function";
}

/**
 * @description 睡眠函数
 * @param {number} ms 毫秒数
 * @returns {Promise<void>} 睡眠的Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @description 判断是否为axios取消请求的错误
 * @param {AxiosError} error 错误对象
 * @returns {boolean} 如果是axios取消请求的错误则返回true，否则返回false
 */
export function isCancel(error: AxiosError<any>) {
  return axios.isCancel(error);
}
