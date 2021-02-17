
export namespace ipc_apptest {

    export enum BuildType {
        DEBUG,
        RELEASE
    };

    export const TestApplication = "App/test-application";
    export const TestApplication_specificmodules = "App/test-application/specific_modules";
    export const TestApplication_startup = "App/test-application/startup";
    export const TestApplication_moduleerror = "App/test-application/error";
    export const TestApplication_modulesuccess = "App/test-application/success";
    export const TestApplication_errormessage = "App/test-application/error-message";
}
