function observeProperty(obj, key, val) {
    observe(val);
    Object.defineProperty(obj, key, {
        enumerable: true, // 可以枚举的 可以for in
        configurable: true, // 可以重新定义的 可以使用delete删除出
        get: function () {
            return val;
        },
        set: function (newVal) {
            if (newVal === val || (newVal !== newVal && val !== val)) {
                return;
            }
            console.log('data changed', val, '=>', newVal)
        }
    })
}

function observe(data) {
    if (!data || typeof data !== 'object') {
        return;
    }
    Object.keys(data).forEach(key => observeProperty(data, key, data[key]));
}
