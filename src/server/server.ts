import * as electron from "electron";
import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";

import {ServerConfiguration} from "../common/configuration";
import {ipc_apptest} from "../common/tcp_endpoints";
import BuildType = ipc_apptest.BuildType;

export namespace server {
    export const start = function (p_on_initialized_callback: (p_window: electron.BrowserWindow) => void) {
        electron.app.whenReady().then(() => {
            let l_window = new electron.BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    nodeIntegration: true
                }
            });

            l_window.on("closed", () => {
                electron.app.quit();
            });

            p_on_initialized_callback(l_window);
        });
    };
}

let server_configuration: ServerConfiguration.Config = undefined;


namespace command {
    export const exec = function (p_command, p_callback: (ret: boolean, pc_stdin: string, pc_stderr: string) => void) {
        console.log(p_command);
        child_process.exec(p_command, (error, p_stdin, p_stderr) => {
            if (error) {
                console.error(error);
                p_callback(false, p_stdin, p_stderr);
                return;
            }

            p_callback(true, p_stdin, p_stderr);
        });
    };

    class ExecEvent {
        public command: string;
        public on_completed: (ret: boolean, stdin: string, stderr: string) => void;
        public assigned_index: number;
        public has_started: boolean;
    };

    export class Queue {
        public queued_events: ExecEvent[];
        public max_simulatenous_command: number;
        public executing_events: Array<ExecEvent>;

        constructor(p_max_simulatenous_command: number) {
            this.queued_events = [];
            this.max_simulatenous_command = p_max_simulatenous_command;
            this.executing_events = new Array<ExecEvent>(p_max_simulatenous_command);
        };

        public push_command(p_command: string, p_on_completed: (ret: boolean, stdin: string, stderr: string) => void) {
            this.queued_events.push({command: p_command, on_completed: p_on_completed, assigned_index: 0, has_started: false} as ExecEvent);
            this.consume_event_if_possible();
        };

        private consume_event_if_possible() {
            for (let j = 0; j < this.max_simulatenous_command; j++) {
                if (!this.executing_events[j]) {
                    for (let i = 0; i < this.queued_events.length; i++) {
                        let l_event = this.queued_events[i];
                        if (!l_event.has_started) {
                            l_event.has_started = true;

                            this.executing_events[j] = this.queued_events[i];

                            exec(l_event.command, (p_ret, stdin, stderr) => {
                                this.executing_events[j] = undefined;
                                this.consume_event_if_possible();
                                this.clear_queue_if_possible();
                                l_event.on_completed(p_ret, stdin, stderr);
                            });

                            return;
                        }
                    }
                }
            }
        };

        private clear_queue_if_possible() {
            for (let j = 0; j < this.max_simulatenous_command; j++) {
                if (this.executing_events[j]) {
                    return;
                }
            }
            this.queued_events = [];
        };
    };
}


fs.readFile(path.join(__dirname, "../../../server-config.json"), (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    server_configuration = JSON.parse(data.toString());

    let command_queue = new command.Queue(1);

    server.start((p_window) => {
        p_window.loadFile(path.join(server_configuration.client.root_folder, "/index.html"));


        let l_menu = electron.Menu.getApplicationMenu();
        l_menu.append(new electron.MenuItem({
            label: "App",
            submenu: [
                {
                    label: "test",
                    click() {
                        p_window.webContents.send(ipc_apptest.TestApplication);
                    }
                }
            ]
        }));
        electron.Menu.setApplicationMenu(l_menu);


        const execute_test_for_modules = function (p_build_type: BuildType, p_modules: string[]) {
            let l_build_type_string: string = "";
            if (p_build_type === ipc_apptest.BuildType.DEBUG) {
                l_build_type_string = "Debug";
            } else if (p_build_type === ipc_apptest.BuildType.RELEASE) {
                l_build_type_string = "Release";
            }

            p_window.webContents.send(ipc_apptest.TestApplication_startup, p_modules);
            command_queue.push_command(`cmake -G "Visual Studio 16 2019" -A x64  -DCMAKE_CONFIGURATION_TYPES:STRING="${l_build_type_string}" -DCMAKE_INSTALL_PREFIX:PATH="${server_configuration.engine.build_folder}/${l_build_type_string}" -B${server_configuration.engine.build_folder}  -S${server_configuration.engine.root_folder}`,
                (ret, p0_stdin, p0_stderr) => {
                    if (!ret) {
                        for (let i = 0; i < p_modules.length; i++) {
                            p_window.webContents.send(ipc_apptest.TestApplication_moduleerror, p_modules[i]);
                        }
                        p_window.webContents.send(ipc_apptest.TestApplication_errormessage, p0_stdin);
                        return;
                    }

                    for (let i = 0; i < p_modules.length; i++) {
                        //E:\Programs\CMake\bin\cmake.EXE --build e:/GameProjects/GameEngineLinux/build --config Debug --target Common2Test -- /maxcpucount:6
                        command_queue.push_command(`cmake --build ${server_configuration.engine.build_folder} --config ${l_build_type_string} --target ${p_modules[i]} -- /maxcpucount:6`, (p_ret, p1_stdin, p1_stderr) => {
                            if (p_ret) {
                                command_queue.push_command(`${server_configuration.engine.build_folder}/${l_build_type_string}/${p_modules[i]}.exe`, (p_ret_2) => {
                                    if (p_ret_2) {
                                        p_window.webContents.send(ipc_apptest.TestApplication_modulesuccess, p_modules[i]);
                                        return;
                                    } else {
                                        p_window.webContents.send(ipc_apptest.TestApplication_moduleerror, p_modules[i]);
                                        p_window.webContents.send(ipc_apptest.TestApplication_errormessage, p1_stdin);
                                    }
                                });
                            } else {
                                p_window.webContents.send(ipc_apptest.TestApplication_moduleerror, p_modules[i]);
                                p_window.webContents.send(ipc_apptest.TestApplication_errormessage, p1_stdin);
                            }
                        });
                    }
                })
        };


        electron.ipcMain.on(ipc_apptest.TestApplication, (p_event, ...p_args) => {
            if (server_configuration.app_test.modules) {
                let l_build_type_enum = p_args[0] as ipc_apptest.BuildType;
                execute_test_for_modules(l_build_type_enum, server_configuration.app_test.modules);
            }
        });

        electron.ipcMain.on(ipc_apptest.TestApplication_specificmodules, (p_event, ...p_args) => {
            let l_build_type_enum = p_args[0] as ipc_apptest.BuildType;
            let l_modules = p_args[1] as string[];
            execute_test_for_modules(l_build_type_enum, l_modules);
        });
    });

})
