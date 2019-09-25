function observe(value, asRootData) {
    if (!value || typeof value !== 'object') {
        return;
    }
    return new Observer(value);
}

function Observer(value) {
    this.value = value;
    this.walk(value);
}

Object.prototype = {
    walk: function (obj) {
        let self = this;
        Object.keys(obj).forEach(key => {
            self.observeProperty(obj, key, obj[key]);
        })
    },
    observeProperty: function (obj, key, val) {
        var dep = new Dep();
        var childObj = observe(val);
        Object.defineProperty(obj, key, {
            enumerable: true, // 可以枚举的 可以for in
            configurable: true, // 可以重新定义的 可以使用delete删除出
            get: function () {
                if (Dep.target) {
                    dep.depend();
                }
                if (childObj) {
                    childObj.dep.depend();
                }
                return val;
            },
            set: function (newVal) {
                if (newVal === val || (newVal !== newVal && val !== val)) {
                    return;
                }
                val = newVal;
                childObj = observe(newVal);
                dep.notify();
                console.log('data changed', val, '=>', newVal)
            }
        })

    }
}

var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.target = null;

Dep.prototype = {
    addSub: function (sub) {
        this.subs.push(sub);
    },
    removeSub: function (sub) {
        this.subs = this.subs.filter($sub => $sub !== sub);
    },
    notify: function () {
        this.subs.forEach(sub => {
            sub.update();
        })
    },
    depend: function () {
        Dep.target.addDep(this);
    }
}

function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);
    if (this.$el) {
        this.$fragment = this.nodeFragment(this.$el);
        this.compileElement(this.$fragment);
        // 将文档碎片放回真是dom
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    compileElement: function (el) {
        var self = this;
        var childNodes = el.childNodes;
        [].splice.call(childNodes).forEach(node => {
            let text = node.textContent;
            let reg = /\{\{((?:.|\n)+?)\}\}/;
            // is element
            if (self.isElementNode(node)) {
                self.compile(node);
            }
            // is text node
            if (self.isTextNode(node) && reg.test(text)) {
                self.compileText(node, RegExp.$1);
            }
            // 解析子节点
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
        })
    },
    nodeFragment: function (el) {
        let fragment = document.createDocumentFragment();
        let child;

        while (child = el.firstChild) {
            fragment.appendChild(child)
        }
        return fragment;
    },
    compile: function (node) {
        let nodeAttrs = node.attributes;
        let self = this;
        [].splice.call(nodeAttrs).forEach(attr => {
            var attrName = attr.name;
            if (self.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                if (self.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, self.$vm, exp, dir);
                } else {
                    compileUtil[dir] && compileUtil[dir](node, self.$vm, exp);
                }
                node.removeAttribute(attrName);
            }
        })
    },
    compileText: function (node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },
    isElementNode: function (node) {
        return node.nodeType === 1;
    },
    isTextNode: function (node) {
        return node.nodeType === 3;
    },
    isDirective: function (attr) {
        return attr.indexOf('x-') === 0;
    },
    isEventDirective: function (dir) {
        return dir.indexOf('on') === 0;
    }
}
let $elm;
let timer = null;
const compileUtil = {
    html: function (node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    text: function (node, vme, exp) {
        this.bind(node, vm, exp, 'text');
    },
    class: function (node, vme, exp) {
        this.bind(node, vm, exp, 'class')
    },
    model: function (node, vm, exp) {
        this.bind(node, vm, exp, 'model');
        let self = this;
        let val = this._getVmVal(vm, exp);
        node.addEventListener('input', function (e) {
            let newVal = e.target.value;
            $elm = e.target;
            if (val === newVal) {
                return;
            }
            clearTimeout(timer);
            timer = setTimeout(function () {
                self._setVmVal(vm, exp, newVal);
                val = newVal;
            })
        })
    },
    bind: function (node, vm, exp, dir) {
        let updateFn = updater[dir + 'Updater'];
        updateFn && updateFn(node, this._getVmVal(vm, exp));

        new Watcher(vm, exp, function (val, oldVal) {
            updateFn && updateFn(node, val, oldVal);
        })
    },
    eventHandler: function (node, vm, exp, dir) {
        let eventType = dir.splice(':')[1];
        let fn = vm.$options.methods && vm.$options.methods[exp];
        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    }
}
