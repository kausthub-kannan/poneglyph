const setupLangsmith = () => {
    /* Langsmith uses multithread-streaming for browser based environment 
    (obsidian is seen as browser based app by langsmith)
    which is not supported by requestUrl. Hence we override this by simulating BUN environment which disables
    multithread-streaming. */
    (globalThis as any).Bun = {};

     
    if (typeof process !== "undefined" && process.env) {
        Object.assign(process.env, {
            LANGSMITH_TRACING: process.env.LANGSMITH_TRACING,
            LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
            LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT,
            LANGSMITH_ENDPOINT: process.env.LANGSMITH_ENDPOINT
        });
    }
}

const setupVariables = () => {
    setupLangsmith();
}

export default setupVariables;