export namespace el {

    interface IStrObj<Value> {
        [key: string]: Value;
    };

    interface CreateElementInput {
        a?: IStrObj<string>,
        e?: IStrObj<any>,
        c?: ((arg0: HTMLElement) => void),
        text_content?: string
    };

    export const create_element = function (p_parent: HTMLElement, p_tag: string, p_input: CreateElementInput): HTMLElement {

        let l_element = document.createElement(p_tag);
        p_parent.appendChild(l_element);

        if (p_input) {
            if (p_input.a) {
                let l_attribute_keys = Object.keys(p_input.a);
                for (let i = 0; i < l_attribute_keys.length; i++) {
                    let l_key = l_attribute_keys[i];
                    l_element.setAttribute(l_key, p_input.a[l_key]);
                }
            }
            ;

            if (p_input.e) {
                let l_event_keys = Object.keys(p_input.e);
                for (let i = 0; i < l_event_keys.length; i++) {
                    let l_event_key = l_event_keys[i];
                    l_element.addEventListener(l_event_key, p_input.e[l_event_key]);
                }
                ;
            }

            if (p_input.c) {
                p_input.c(l_element);
            }

            if (p_input.text_content) {
                l_element.innerText = p_input.text_content;
            }
        }
        return l_element;
    };

    export const div = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLDivElement {
        return this.create_element(p_parent_element, "div", p_input) as HTMLDivElement;
    };

    export const button = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLElement {
        return this.create_element(p_parent_element, "button", p_input);
    };

    export const link = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLElement {
        return this.create_element(p_parent_element, "link", p_input);
    };

    export const span = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLElement {
        return this.create_element(p_parent_element, "span", p_input);
    };

    export const input = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLInputElement {
        return this.create_element(p_parent_element, "input", p_input) as HTMLInputElement;
    };

    export const label = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLLabelElement {
        return this.create_element(p_parent_element, "label", p_input) as HTMLLabelElement;
    };
    export const select = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLSelectElement {
        return this.create_element(p_parent_element, "select", p_input) as HTMLSelectElement;
    };

    export const option = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLOptionElement {
        return this.create_element(p_parent_element, "option", p_input) as HTMLOptionElement;
    };
    export const style = function (p_parent_element: HTMLElement, p_input: CreateElementInput): HTMLStyleElement {
        return this.create_element(p_parent_element, "style", p_input) as HTMLStyleElement;
    };
}

export namespace bind {
    export class Binding<Type> {
        val: Type;
        on_change_callback?: (arg0: Type, arg1: Type) => void

        constructor(p_val?: Type, p_on_change_callback?: (arg0: Type, arg1: Type) => void) {
            this.val = p_val;
            this.on_change_callback = p_on_change_callback;
        };

        public bSet(p_new_value: Type) {
            let l_old_value = this.val;
            this.val = p_new_value;
            if (this.on_change_callback) {
                if (this.val !== l_old_value) {
                    this.on_change_callback(l_old_value, this.val);
                }
            }
        };

        public bGet(): Type {
            return this.val;
        };
    };

    export const variable = function <Type>(p_inital_value: Type, p_on_change_callback: (p_before: Type, p_after: Type) => void): Binding<Type> {
        return new Binding<Type>(p_inital_value, p_on_change_callback);
    };

    export const input_text_element = function (p_input_text_element: HTMLInputElement, p_initial_value_str, p_on_change_callback) {

        let l_binding = new Binding<string>(
            p_initial_value_str,
            (p_before, p_after) => {
                p_input_text_element.value = p_after;
                if (p_on_change_callback) {
                    p_on_change_callback(p_before, p_after);
                }
            }
        );

        p_input_text_element.addEventListener("keyup", () => {
            l_binding.bSet(p_input_text_element.value);
        });

        l_binding.bSet(p_initial_value_str);

        return l_binding;
    };

    export const select_value_element = function <Type>(p_select_element: HTMLSelectElement, p_inial_value: Type, p_on_change_callback: (p_before: Type, p_after: Type) => void) {
        let l_binding = new Binding<Type>(
            p_inial_value,
            (p_before, p_after) => {
                p_select_element.value = p_after.toString();
                if (p_on_change_callback) {
                    p_on_change_callback(p_before, p_after);
                }
            }
        );

        p_select_element.addEventListener("change", () => {
            l_binding.bSet(JSON.parse(p_select_element.value));
        });

        l_binding.bSet(p_inial_value);

        return l_binding;
    };
}

export namespace util {
    export const load_stylesheet = function (p_url: string) {
        el.link(document.head, {
            a: {rel: "stylesheet", href: p_url},
        });
    };
    export const swap_elements = function (p_left: HTMLElement, p_right: HTMLElement) {
        const parentA = p_left.parentNode;
        const siblingA = p_left.nextSibling === p_right ? p_left : p_left.nextSibling;

        p_right.parentNode.insertBefore(p_left, p_right);
        parentA.insertBefore(p_right, siblingA);
    };
}
;

export class ElArray2<DataType> {
    root: HTMLElement;
    array_html: HTMLElement[];
    array_data: DataType[];

    constructor(p_root?: HTMLElement, p_array_html?: HTMLElement[], p_array_data?: DataType[]) {
        this.root = p_root;
        this.array_html = p_array_html;
        this.array_data = p_array_data;
    }

    push_back_element(p_element: HTMLElement, p_data: DataType) {
        this.root.appendChild(p_element);
        this.array_html.push(p_element);
        this.array_data.push(p_data);
    };

    remove_element_at(p_index: number) {
        this.array_html[p_index].remove();
        this.array_html.splice(p_index, 1);
        this.array_data.splice(p_index, 1);
    };

    get_htmlelement_index(p_element: HTMLElement) {
        for (let i = 0; i < this.array_html.length; i++) {
            if (this.array_html[i] === p_element) {
                return i;
            }
        }
        return -1;
    };

    clear() {
        for (let i = this.get_size() - 1; i >= 0; i--) {
            this.remove_element_at(i);
        }
    };

    swap_elements(p_left_index: number, p_right_index: number) {
        if (p_left_index === p_right_index || p_left_index < 0 || p_right_index < 0 ||
            p_left_index >= this.array_html.length || p_right_index >= this.array_html.length) {
            return;
        }

        if (p_left_index > p_right_index) {
            let l_tmp = p_right_index;
            p_right_index = p_left_index;
            p_left_index = l_tmp;
        }

        let l_left_element = this.array_html[p_left_index];
        let l_right_element = this.array_html[p_right_index];

        util.swap_elements(l_left_element, l_right_element);

        this.array_html[p_right_index] = l_left_element;
        this.array_html[p_left_index] = l_right_element;

        let l_data_tmp = this.array_data[p_right_index];
        this.array_data[p_right_index] = this.array_data[p_left_index];
        this.array_data[p_left_index] = l_data_tmp;
    };

    get_size() {
        return this.array_html.length;
    };
};
