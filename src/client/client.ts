const {ipcRenderer} = require('electron');
import {util, el, bind, ElArray2} from "./framework.js";
import {ipc_apptest} from "../common/tcp_endpoints.js";
import {TestModule} from "./testModule.js";

util.load_stylesheet("./css/reset.css");
util.load_stylesheet("./css/layout.css");

let l_compilation_module: TestModule = undefined;

ipcRenderer.on(ipc_apptest.TestApplication, () => {
    if (l_compilation_module) {
        l_compilation_module.free();
    }
    l_compilation_module = TestModule.initialize(document.body);
});