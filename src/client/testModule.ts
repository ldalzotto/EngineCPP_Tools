import {util, el, bind, ElArray2} from "./framework.js";
import {ipc_apptest} from "../common/tcp_endpoints.js";
import {ServerConfiguration} from "../common/configuration.js";
import AppTest = ServerConfiguration.AppTest;
import Binding = bind.Binding;

const {ipcRenderer} = require('electron');

enum TestEntryState {
    PENDING = 0,
    SUCCESS = 1,
    FAILURE = 2
};

class TestEntry {
    public el: HTMLDivElement;
    public name: string;
    public state: bind.Binding<TestEntryState>;
    public is_selected: bind.Binding<boolean>;

    public static initialize(p_parent: HTMLElement, p_module_name: string): TestEntry {
        let l_test_entry = new TestEntry();

        l_test_entry.el = el.div(p_parent, {
            a: {class: "row module-entry"},
            c: _ => {
                el.span(_, {
                    text_content: p_module_name
                })
            },
            e: {
                click: () => {
                    l_test_entry.is_selected.bSet(!l_test_entry.is_selected.bGet());
                }
            }
        });

        l_test_entry.name = p_module_name;

        l_test_entry.state = bind.variable(undefined, (_, p_state: TestEntryState) => {
            switch (p_state) {
                case TestEntryState.PENDING:
                    l_test_entry.el.style.backgroundColor = "grey";
                    break;
                case TestEntryState.SUCCESS:
                    l_test_entry.el.style.backgroundColor = "green";
                    break;
                case TestEntryState.FAILURE:
                    l_test_entry.el.style.backgroundColor = "red";
                    break;
            }
        });
        l_test_entry.state.bSet(TestEntryState.PENDING);

        l_test_entry.is_selected = bind.variable(undefined, (_, p_value: boolean) => {
            if (p_value) {
                l_test_entry.el.style.color = "burlywood";
            } else {
                l_test_entry.el.style.color = "";
            }
        });

        return l_test_entry;
    };

    public reset() {
        this.is_selected.bSet(false);
        this.state.bSet(TestEntryState.PENDING);
    };
};

export class TestModule {

    public static instances_count: number = 0;
    public static sytle_element: HTMLStyleElement = undefined;

    public el: HTMLElement;
    public result_container: ElArray2<TestEntry>;
    public error_message_container: ElArray2<string>;
    public build_type: Binding<ipc_apptest.BuildType>;

    private is_processing: boolean;

    private e_on_tes_initiated_cb: (event: any, ...args: any[]) => void;
    private e_on_tes_error_cb: (event: any, ...args: any[]) => void;
    private e_on_tes_success_cb: (event: any, ...args: any[]) => void;
    private e_on_error_message_cb: (event: any, ...args: any[]) => void;

    public static initialize(p_parent: HTMLElement): TestModule {

        if (TestModule.instances_count == 0) {
            TestModule.sytle_element = el.style(document.head, {
                text_content: `
                    .test-app-header {
                        padding: 0.5rem;
                    }
                    .module-container {
                        padding: 0.5rem;
                    }
                    .module-entry {
                        cursor: pointer;
                        padding: 0.1em;
                        border: solid;
                        border-width: 1px;
                    }
                    .message-entry {
                        padding: 0.25rem;
                        border-bottom: solid;
                        border-width: 1px;
                    }
                `
            });
        }

        TestModule.instances_count += 1;

        let l_compilation = new TestModule();

        l_compilation.is_processing = false;
        l_compilation.e_on_tes_initiated_cb = l_compilation.e_on_test_initiated.bind(l_compilation);
        l_compilation.e_on_tes_error_cb = l_compilation.e_on_test_error.bind(l_compilation);
        l_compilation.e_on_tes_success_cb = l_compilation.e_on_test_success.bind(l_compilation);
        l_compilation.e_on_error_message_cb = l_compilation.e_on_error_message.bind(l_compilation);

        let l_select_element: HTMLSelectElement;

        l_compilation.el = el.div(p_parent, {
            c: _ => {
                el.div(_, {
                    a: {class: "col", style: "width: 100%"},
                    c: _ => {
                        el.div(_, {
                            a: {class: "row test-app-header"},
                            c: _ => {
                                el.span(_, {
                                    a: {class: "col", style: "width:70%"},
                                    text_content: "Test Application"
                                });

                                el.div(_, {
                                    a: {class: "col", style: "width:30%"},
                                    c: _ => {
                                        el.label(_, {
                                            a: {class: "col", for: "build"}, text_content: "build type:"
                                        });
                                        l_select_element = el.select(_, {
                                            a: {name: "build", id: "build"},
                                            c: _ => {
                                                el.option(_, {
                                                    a: {value: `${ipc_apptest.BuildType.DEBUG}`},
                                                    text_content: "Debug"
                                                });
                                                el.option(_, {
                                                    a: {value: `${ipc_apptest.BuildType.RELEASE}`},
                                                    text_content: "Release"
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                el.div(_, {
                    a: {class: "col test-app-header", style: "width: 100%"},
                    c: _ => {
                        el.button(_, {
                            a: {class: "col", style: "width: 100%"},
                            text_content: "GO!",
                            e: {
                                click: l_compilation.on_test_clicked.bind(l_compilation)
                            }
                        });
                    }
                });

                l_compilation.result_container = new ElArray2<TestEntry>(el.div(_, {
                    a: {class: "col module-container", style: "width: 100%"}
                }), [], []);

                el.div(_, {
                    a: {class: "col module-container", style: "width: 100%"},
                    c: _ => {
                        el.button(_, {
                            a: {class: "col", style: "width: 50%"},
                            text_content: "Run selected",
                            e: {
                                click: l_compilation.on_run_selected_clicked.bind(l_compilation)
                            }
                        });
                        el.button(_, {
                            a: {class: "col", style: "width: 50%"},
                            text_content: "Run failed",
                            e: {
                                click: l_compilation.on_run_failed_clicked.bind(l_compilation)
                            }
                        });
                    }
                })

                l_compilation.error_message_container = new ElArray2<string>(el.div(_, {
                    a: {class: "col module-container", style: "width: 100%"}
                }), [], []);
            }
        });

        l_compilation.build_type = bind.select_value_element(l_select_element, ipc_apptest.BuildType.DEBUG, undefined);

        ipcRenderer.on(ipc_apptest.TestApplication_startup, l_compilation.e_on_tes_initiated_cb);
        ipcRenderer.on(ipc_apptest.TestApplication_moduleerror, l_compilation.e_on_tes_error_cb);
        ipcRenderer.on(ipc_apptest.TestApplication_modulesuccess, l_compilation.e_on_tes_success_cb);
        ipcRenderer.on(ipc_apptest.TestApplication_errormessage, l_compilation.e_on_error_message_cb);

        return l_compilation;
    };

    public free() {
        this.el.remove();

        TestModule.instances_count -= 1;
        if (TestModule.instances_count == 0) {
            TestModule.sytle_element.remove();
            TestModule.sytle_element = undefined;
        }

        ipcRenderer.removeListener(ipc_apptest.TestApplication_startup, this.e_on_tes_initiated_cb);
        ipcRenderer.removeListener(ipc_apptest.TestApplication_moduleerror, this.e_on_tes_error_cb);
        ipcRenderer.removeListener(ipc_apptest.TestApplication_modulesuccess, this.e_on_tes_success_cb);
        ipcRenderer.removeListener(ipc_apptest.TestApplication_errormessage, this.e_on_error_message_cb);
    };

    private on_test_clicked() {
        if (!this.is_processing) {
            this.is_processing = true;
            this.result_container.clear();
            this.error_message_container.clear();
            ipcRenderer.send(ipc_apptest.TestApplication, this.build_type.bGet());
        }
    };

    private on_run_selected_clicked() {
        if (!this.is_processing) {
            let l_selected_module_names: Array<string> = new Array<string>();
            for (let i = 0; i < this.result_container.get_size(); i++) {
                if (this.result_container.array_data[i].is_selected.bGet()) {
                    l_selected_module_names.push(this.result_container.array_data[i].name);
                }
            }

            if (l_selected_module_names.length > 0) {
                this.error_message_container.clear();
                this.is_processing = true;
                ipcRenderer.send(ipc_apptest.TestApplication_specificmodules, this.build_type.bGet(), l_selected_module_names);
            }
        }

    };

    private on_run_failed_clicked() {
        if (!this.is_processing) {
            let l_failed_module_names: Array<string> = new Array<string>();
            for (let i = 0; i < this.result_container.get_size(); i++) {
                if (this.result_container.array_data[i].state.bGet() === TestEntryState.FAILURE) {
                    l_failed_module_names.push(this.result_container.array_data[i].name);
                }
            }

            if (l_failed_module_names.length > 0) {
                this.error_message_container.clear();
                this.is_processing = true;
                ipcRenderer.send(ipc_apptest.TestApplication_specificmodules, this.build_type.bGet(), l_failed_module_names);
            }
        }

    };

    private e_on_test_initiated(event: any, ...args: any[]) {
        let l_modules = args[0] as string[];
        for (let i = 0; i < l_modules.length; i++) {
            let l_push_element = true;
            for (let j = 0; j < this.result_container.get_size(); j++) {
                if (this.result_container.array_data[j].name === l_modules[i]) {
                    l_push_element = false;
                    this.result_container.array_data[j].reset();
                }
            }
            if (l_push_element) {
                let l_entry = TestEntry.initialize(document.body, l_modules[i]);
                this.result_container.push_back_element(
                    l_entry.el, l_entry
                );
            }

        }
    };

    private e_on_test_error(event: any, ...args: any[]) {
        let l_module_name = args[0] as string;
        for (let i = 0; i < this.result_container.get_size(); i++) {
            if (this.result_container.array_data[i].name === l_module_name) {
                this.result_container.array_data[i].state.bSet(TestEntryState.FAILURE);
                this.on_test_completed();
            }
        }
    };

    private e_on_test_success(event: any, ...args: any[]) {
        let l_module_name = args[0] as string;
        for (let i = 0; i < this.result_container.get_size(); i++) {
            if (this.result_container.array_data[i].name === l_module_name) {
                this.result_container.array_data[i].state.bSet(TestEntryState.SUCCESS);
                this.on_test_completed();
            }
        }
    };

    private e_on_error_message(event: any, ...args: any[]) {
        let l_error_message = args[0] as string;

        let l_element = el.div(document.body, {
            a: {class: "row message-entry"},
            c: _ => {
                el.span(_, {
                    text_content: l_error_message
                })
            }
        });
        this.error_message_container.push_back_element(l_element, l_error_message);
    };

    private on_test_completed() {
        for (let i = 0; i < this.result_container.get_size(); i++) {
            if (this.result_container.array_data[i].state.bGet() === TestEntryState.PENDING) {
                return;
            }
        }

        this.is_processing = false;
    };
};