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
export { SeoManagement } from './SeoManagement';
export { UserManagement as Users } from './UserManagement';

// Analytics (Phase 27)
export { AnalyticsDashboard as Analytics } from './AnalyticsDashboard';

// Profile (Phase 19)
export const Profile = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">Profile</h2>
    <p className="text-gray-600">Profile page coming in Phase 19...</p>
  </div>
);
