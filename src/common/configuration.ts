export namespace ServerConfiguration {
    export interface Client {
        root_folder: string;
    };

    export interface Engine {
        root_folder: string;
        build_folder: string;
    };

    export interface AppTest {
        modules?: string[];
    };

    export interface Config {
        client: Client;
        engine: Engine;
        app_test: AppTest;
    };
}