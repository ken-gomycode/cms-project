/**
 * Central export for all public pages
 */

// Authentication Pages (Phase 19)
export { Login } from './Login';
export { Register } from './Register';

// Home (Phase 28)
export const Home = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">Home</h2>
    <p className="text-gray-600">Home page coming in Phase 28...</p>
  </div>
);

// Content Detail (Phase 28)
export const ContentDetail = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">Content Detail</h2>
    <p className="text-gray-600">Content detail page coming in Phase 28...</p>
  </div>
);
