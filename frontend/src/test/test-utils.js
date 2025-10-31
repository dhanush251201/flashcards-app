import { jsx as _jsx } from "react/jsx-runtime";
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
        },
        mutations: {
            retry: false,
        },
    },
});
function AllTheProviders({ children }) {
    const testQueryClient = createTestQueryClient();
    return (_jsx(QueryClientProvider, { client: testQueryClient, children: _jsx(BrowserRouter, { children: children }) }));
}
const customRender = (ui, options) => render(ui, { wrapper: AllTheProviders, ...options });
export * from '@testing-library/react';
export { customRender as render };
