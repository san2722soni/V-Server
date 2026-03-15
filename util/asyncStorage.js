import { AsyncLocalStorage } from 'async_hooks';
import { randomId } from './index.js';

const asyncLocalStorage = new AsyncLocalStorage();

export const withTxn = (fn) => {
    const txnId = randomId();
    return asyncLocalStorage.run(txnId, fn);
};

export default asyncLocalStorage;