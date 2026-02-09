/**
 * Central export for all admin pages
 */

export { Dashboard } from './Dashboard';
export { ContentList } from './ContentList';
export { ContentEditor } from './ContentEditor';
export { MediaLibrary } from './MediaLibrary';

export { CommentModeration } from './CommentModeration';
export { Categories } from './Categories';
export { Tags } from './Tags';

// Users (Phase 25)
export const Users = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">User Management</h2>
    <p className="text-gray-600">User management coming in Phase 25...</p>
  </div>
);

// Analytics (Phase 27)
export const Analytics = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">Analytics</h2>
    <p className="text-gray-600">Analytics coming in Phase 27...</p>
  </div>
);

// Profile (Phase 19)
export const Profile = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">Profile</h2>
    <p className="text-gray-600">Profile page coming in Phase 19...</p>
  </div>
);
